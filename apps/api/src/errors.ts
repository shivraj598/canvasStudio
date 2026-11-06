import type { ApiErrorBody } from '@canvas/shared';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, type ZodType } from 'zod';

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }
  static unauthorized(message = 'Please sign in to continue') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  static notFound(message = 'Not found') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  static conflict(message: string, details?: unknown) {
    return new AppError(409, 'CONFLICT', message, details);
  }
}

/** Parses `input` with `schema`, turning Zod failures into a 400 with field details. */
export function parseOrThrow<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw validationError(result.error);
  return result.data;
}

function validationError(error: ZodError): AppError {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    fields[issue.path.join('.') || '_'] ??= issue.message;
  }
  return new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', { fields });
}

export function errorBody(code: string, message: string, details?: unknown): ApiErrorBody {
  return { error: details === undefined ? { code, message } : { code, message, details } };
}

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send(errorBody(error.code, error.message, error.details));
  }
  if (error instanceof ZodError) {
    const appError = validationError(error);
    return reply
      .status(appError.statusCode)
      .send(errorBody(appError.code, appError.message, appError.details));
  }
  const statusCode =
    'statusCode' in error && typeof error.statusCode === 'number' ? error.statusCode : 500;
  if (statusCode >= 500) {
    request.log.error(error);
    return reply.status(500).send(errorBody('INTERNAL_ERROR', 'Something went wrong'));
  }
  // Fastify's own 4xx errors, e.g. malformed JSON bodies.
  const code = 'code' in error && typeof error.code === 'string' ? error.code : 'BAD_REQUEST';
  return reply.status(statusCode).send(errorBody(code, error.message));
}
