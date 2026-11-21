import type { APIRoute } from 'astro';
import { and, asc, desc, eq, like, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { env } from 'cloudflare:workers';
import * as schema from '../../../lib/db/schema';
import { adminUsers, roles } from '../../../lib/db/schema';
import { createAdminUserSchema } from '../../../lib/validation/auth';
import { hashPassword } from '../../../lib/auth/password';
import { requirePermission } from '../../../lib/auth/rbac';
import { PERMISSIONS } from '../../../lib/auth/permissions';
import { jsonList, jsonOk, withErrorHandling } from '../../../lib/http/response';
import { parseListQuery, offsetFor } from '../../../lib/http/pagination';
import { ConflictError } from '../../../lib/http/errors';
import { logActivity } from '../../../lib/audit';
import { getClientIp } from '../../../lib/rate-limit';

export const prerender = false;

const SORTABLE = ['name', 'email', 'createdAt', 'lastLoginAt'] as const;

export const GET: APIRoute = withErrorHandling(async (ctx) => {
  requirePermission(ctx.locals.session, PERMISSIONS.USERS_MANAGE);
  const query = parseListQuery(ctx.url, SORTABLE);
  const db = drizzle(env.DB, { schema });

  const search = ctx.url.searchParams.get('search');
  const where = search ? and(like(adminUsers.name, `%${search}%`)) : undefined;

  const sortColumnMap = {
    name: adminUsers.name,
    email: adminUsers.email,
    createdAt: adminUsers.createdAt,
    lastLoginAt: adminUsers.lastLoginAt,
  } as const;
  const sortColumn = sortColumnMap[(query.sortBy ?? 'createdAt') as keyof typeof sortColumnMap];
  const orderBy = query.sortDir === 'asc' ? asc(sortColumn) : desc(sortColumn);

  const [rows, totalRow] = await Promise.all([
    db
      .select({
        id: adminUsers.id,
        email: adminUsers.email,
        name: adminUsers.name,
        roleId: adminUsers.roleId,
        roleKey: roles.key,
        isActive: adminUsers.isActive,
        lastLoginAt: adminUsers.lastLoginAt,
        createdAt: adminUsers.createdAt,
      })
      .from(adminUsers)
      .innerJoin(roles, eq(roles.id, adminUsers.roleId))
      .where(where)
      .orderBy(orderBy)
      .limit(query.pageSize)
      .offset(offsetFor(query)),
    db
      .select({ count: sql<number>`count(*)` })
      .from(adminUsers)
      .where(where),
  ]);

  return jsonList(rows, {
    page: query.page,
    pageSize: query.pageSize,
    total: Number(totalRow[0]?.count ?? 0),
  });
});

export const POST: APIRoute = withErrorHandling(async (ctx) => {
  const session = requirePermission(ctx.locals.session, PERMISSIONS.USERS_MANAGE);
  const body = createAdminUserSchema.parse(await ctx.request.json());
  const db = drizzle(env.DB, { schema });

  const email = body.email.toLowerCase();
  const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  if (existing) throw new ConflictError('A user with this email already exists.');

  const id = crypto.randomUUID();
  const passwordHash = await hashPassword(body.password);

  await db.insert(adminUsers).values({
    id,
    email,
    passwordHash,
    name: body.name,
    roleId: body.roleId,
    isActive: body.isActive ?? true,
  });

  await logActivity(db, {
    userId: session.sub,
    action: 'admin_user.created',
    entityType: 'admin_user',
    entityId: id,
    ipAddress: getClientIp(ctx.request),
  });

  return jsonOk({ id, email, name: body.name, roleId: body.roleId }, 201);
});
