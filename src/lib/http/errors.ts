export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Authentication required.') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource not found.') {
    super(404, 'NOT_FOUND', message);
  }
}

export class ValidationError extends ApiError {
  constructor(details: unknown, message = 'Validation failed.') {
    super(400, 'VALIDATION_ERROR', message, details);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'This operation conflicts with existing data.') {
    super(409, 'CONFLICT', message);
  }
}

export class RateLimitedError extends ApiError {
  constructor(message = 'Too many requests. Try again later.') {
    super(429, 'RATE_LIMITED', message);
  }
}
