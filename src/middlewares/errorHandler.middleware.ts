import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { isProd } from '../config/env';

/**
 * Normalizes any thrown error (ApiError, Mongoose error, JWT error, or
 * unknown bug) into a consistent JSON response shape.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  // Express identifies error-handling middleware by arity (4 params) — this
  // parameter must stay even though it's unused, or Express treats it as
  // a normal middleware and error handling breaks.
  _next: NextFunction,
): void => {
  let error = err;

  if (!(error instanceof ApiError)) {
    let statusCode = 500;
    let message = 'Internal server error';

    if (error instanceof mongoose.Error.ValidationError) {
      statusCode = 400;
      message = Object.values(error.errors)
        .map((e) => e.message)
        .join(', ');
    } else if (error instanceof mongoose.Error.CastError) {
      statusCode = 400;
      message = `Invalid value for field: ${error.path}`;
    } else if ((error as { code?: number }).code === 11000) {
      statusCode = 409;
      const field = Object.keys((error as { keyValue?: Record<string, unknown> }).keyValue || {})[0];
      message = `Duplicate value for field: ${field}`;
    } else if (error instanceof Error && error.name === 'JsonWebTokenError') {
      statusCode = 401;
      message = 'Invalid token';
    } else if (error instanceof Error && error.name === 'TokenExpiredError') {
      statusCode = 401;
      message = 'Token expired';
    } else if (error instanceof Error) {
      message = error.message || message;
    }

    error = new ApiError(statusCode, message, [], error instanceof Error ? error.stack : undefined);
  }

  const apiError = error as ApiError;

  logger.error(
    `${req.method} ${req.originalUrl} - ${apiError.statusCode} - ${apiError.message}${
      isProd ? '' : `\n${apiError.stack}`
    }`,
  );

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    errors: apiError.errors,
    ...(isProd ? {} : { stack: apiError.stack }),
  });
};
