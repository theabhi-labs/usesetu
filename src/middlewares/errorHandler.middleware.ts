import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { ApiError } from '../utils/ApiError';
import { logger } from '../config/logger';
import { isProd } from '../config/env';
import { ErrorTrackerService } from '../services/observability/errorTracker.service';

function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'UNPROCESSABLE_ENTITY';
    case 429:
      return 'TOO_MANY_REQUESTS';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'INTERNAL_SERVER_ERROR';
  }
}

/**
 * Normalizes any thrown error (ApiError, Mongoose error, JWT error, or
 * unknown bug) into a consistent, secure JSON response shape.
 */
export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
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
  const requestId = req.requestId || (req.headers['x-request-id'] as string) || undefined;
  const errorCode = getErrorCode(apiError.statusCode);

  logger.error(
    `${req.method} ${req.originalUrl} - ${apiError.statusCode} - ${apiError.message}${
      isProd ? '' : `\n${apiError.stack}`
    }`,
  );

  // Asynchronously track 5xx server errors for operations dashboard
  if (apiError.statusCode >= 500) {
    ErrorTrackerService.trackError({
      errorCode,
      message: apiError.message,
      stack: apiError.stack,
      route: req.originalUrl || req.path,
      method: req.method,
      requestId,
      severity: apiError.statusCode >= 500 ? 'P1' : 'ERROR',
    }).catch(() => {
      // Avoid recursive failure
    });
  }

  res.status(apiError.statusCode).json({
    success: false,
    message: apiError.message,
    errors: apiError.errors,
    error: {
      code: errorCode,
      message: apiError.message,
      requestId,
    },
    ...(isProd ? {} : { stack: apiError.stack }),
  });
};
