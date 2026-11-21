import type { APIContext } from 'astro';
import { ZodError } from 'zod';
import { ApiError } from './errors';

export function jsonOk(data: unknown, status = 200, init?: ResponseInit): Response {
  return new Response(JSON.stringify({ data }), {
    ...init,
    status,
    headers: { 'content-type': 'application/json', ...init?.headers },
  });
}

export function jsonList(
  items: unknown[],
  pagination: { page: number; pageSize: number; total: number },
): Response {
  return new Response(
    JSON.stringify({
      data: items,
      pagination: {
        ...pagination,
        totalPages: Math.max(1, Math.ceil(pagination.total / pagination.pageSize)),
      },
    }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
}

export function jsonError(error: unknown): Response {
  if (error instanceof ApiError) {
    return new Response(
      JSON.stringify({
        error: { code: error.code, message: error.message, details: error.details },
      }),
      { status: error.status, headers: { 'content-type': 'application/json' } },
    );
  }

  if (error instanceof ZodError) {
    return new Response(
      JSON.stringify({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed.',
          details: error.issues,
        },
      }),
      { status: 400, headers: { 'content-type': 'application/json' } },
    );
  }

  console.error('Unhandled API error:', error);
  return new Response(
    JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' } }),
    { status: 500, headers: { 'content-type': 'application/json' } },
  );
}

type RouteHandler = (ctx: APIContext) => Promise<Response>;

export function withErrorHandling(handler: RouteHandler): RouteHandler {
  return async (ctx) => {
    try {
      return await handler(ctx);
    } catch (error) {
      return jsonError(error);
    }
  };
}
