import type { APIContext } from 'astro';
import { and, asc, desc, eq, like, or, sql, type SQL } from 'drizzle-orm';
import type { AnySQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import type { z } from 'zod';
import { env } from 'cloudflare:workers';
import { getDb } from '../db/client';
import { jsonList, jsonOk, withErrorHandling } from './response';
import { parseListQuery, offsetFor } from './pagination';
import { NotFoundError, ConflictError } from './errors';
import { requirePermission } from '../auth/rbac';
import { logActivity } from '../audit';
import { getClientIp } from '../rate-limit';

/**
 * A Drizzle table's own properties are its columns, so the table object
 * itself is a valid `Record<string, AnySQLiteColumn>` for dynamic
 * sort/filter column lookups — this just gives that cast a name.
 */
export function tableColumns<TTable extends SQLiteTable>(
  table: TTable,
): Record<string, AnySQLiteColumn> {
  return table as unknown as Record<string, AnySQLiteColumn>;
}

export interface CrudResourceOptions<
  TTable extends SQLiteTable,
  TCreate extends z.ZodType,
  TUpdate extends z.ZodType,
> {
  /** Name used in audit logs and error messages, e.g. "service". */
  resourceName: string;
  table: TTable;
  idColumn: AnySQLiteColumn;
  columns: Record<string, AnySQLiteColumn>;
  searchableColumns?: AnySQLiteColumn[];
  sortableColumns: readonly string[];
  defaultSortColumn: string;
  createSchema: TCreate;
  updateSchema: TUpdate;
  permissions: { read: string; write: string; delete: string };
  /** Extra static WHERE filters derived from query params, e.g. ?isPublished=true. */
  filterParams?: Record<string, AnySQLiteColumn>;
  generateId?: () => string;
}

export function createCrudResource<
  TTable extends SQLiteTable,
  TCreate extends z.ZodType,
  TUpdate extends z.ZodType,
>(options: CrudResourceOptions<TTable, TCreate, TUpdate>) {
  const generateId = options.generateId ?? (() => crypto.randomUUID());

  function buildFilters(url: URL): SQL | undefined {
    const clauses: SQL[] = [];

    if (options.filterParams) {
      for (const [param, column] of Object.entries(options.filterParams)) {
        const value = url.searchParams.get(param);
        if (value === null) continue;
        if (value === 'true' || value === 'false') {
          clauses.push(eq(column, value === 'true'));
        } else {
          clauses.push(eq(column, value));
        }
      }
    }

    const search = url.searchParams.get('search');
    if (search && options.searchableColumns?.length) {
      const likeClauses = options.searchableColumns.map((col) => like(col, `%${search}%`));
      const combined = or(...likeClauses);
      if (combined) clauses.push(combined);
    }

    return clauses.length > 0 ? and(...clauses) : undefined;
  }

  const list = withErrorHandling(async (ctx: APIContext) => {
    requirePermission(ctx.locals.session, options.permissions.read);
    const query = parseListQuery(ctx.url, options.sortableColumns);
    const db = getDb(env.DB);
    const where = buildFilters(ctx.url);

    const sortColumn = options.columns[query.sortBy ?? options.defaultSortColumn];
    const orderBy = query.sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

    const [rows, totalRow] = await Promise.all([
      db
        .select()
        .from(options.table as SQLiteTable)
        .where(where)
        .orderBy(orderBy)
        .limit(query.pageSize)
        .offset(offsetFor(query)),
      db
        .select({ count: sql<number>`count(*)` })
        .from(options.table as SQLiteTable)
        .where(where),
    ]);

    return jsonList(rows, {
      page: query.page,
      pageSize: query.pageSize,
      total: Number(totalRow[0]?.count ?? 0),
    });
  });

  const create = withErrorHandling(async (ctx: APIContext) => {
    const session = requirePermission(ctx.locals.session, options.permissions.write);
    const body = options.createSchema.parse(await ctx.request.json()) as Record<string, unknown>;
    const db = getDb(env.DB);
    const id = generateId();

    try {
      const [row] = await db
        .insert(options.table)
        .values({ id, ...body } as never)
        .returning();

      await logActivity(db, {
        userId: session.sub,
        action: `${options.resourceName}.created`,
        entityType: options.resourceName,
        entityId: id,
        ipAddress: getClientIp(ctx.request),
      });

      return jsonOk(row, 201);
    } catch (error) {
      throw mapUniqueConstraintError(error, options.resourceName);
    }
  });

  const getOne = withErrorHandling(async (ctx: APIContext) => {
    requirePermission(ctx.locals.session, options.permissions.read);
    const id = ctx.params.id as string;
    const db = getDb(env.DB);
    const [row] = await db
      .select()
      .from(options.table as SQLiteTable)
      .where(eq(options.idColumn, id))
      .limit(1);

    if (!row) throw new NotFoundError(`${options.resourceName} not found.`);
    return jsonOk(row);
  });

  const update = withErrorHandling(async (ctx: APIContext) => {
    const session = requirePermission(ctx.locals.session, options.permissions.write);
    const id = ctx.params.id as string;
    const body = options.updateSchema.parse(await ctx.request.json());
    const db = getDb(env.DB);

    try {
      const [row] = await db
        .update(options.table)
        .set(body as never)
        .where(eq(options.idColumn, id))
        .returning();

      if (!row) throw new NotFoundError(`${options.resourceName} not found.`);

      await logActivity(db, {
        userId: session.sub,
        action: `${options.resourceName}.updated`,
        entityType: options.resourceName,
        entityId: id,
        ipAddress: getClientIp(ctx.request),
      });

      return jsonOk(row);
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw mapUniqueConstraintError(error, options.resourceName);
    }
  });

  const remove = withErrorHandling(async (ctx: APIContext) => {
    const session = requirePermission(ctx.locals.session, options.permissions.delete);
    const id = ctx.params.id as string;
    const db = getDb(env.DB);

    const [row] = await db.delete(options.table).where(eq(options.idColumn, id)).returning();

    if (!row) throw new NotFoundError(`${options.resourceName} not found.`);

    await logActivity(db, {
      userId: session.sub,
      action: `${options.resourceName}.deleted`,
      entityType: options.resourceName,
      entityId: id,
      ipAddress: getClientIp(ctx.request),
    });

    return new Response(null, { status: 204 });
  });

  return { list, create, getOne, update, remove };
}

function mapUniqueConstraintError(error: unknown, resourceName: string): unknown {
  if (error instanceof Error && /UNIQUE constraint failed/i.test(error.message)) {
    return new ConflictError(`A ${resourceName} with this value already exists.`);
  }
  return error;
}
