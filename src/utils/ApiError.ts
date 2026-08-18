/**
 * Standardized application error. Throw this anywhere in controllers/services;
 * the global errorHandler middleware will format the response consistently.
 */
export class ApiError extends Error {
  statusCode: number;
  success: boolean;
  errors: unknown[];
  isOperational: boolean;

  constructor(statusCode: number, message = 'Something went wrong', errors: unknown[] = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.success = false;
    this.errors = errors;
    this.isOperational = true; // distinguishes expected errors from programming bugs

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = 'Bad Request', errors: unknown[] = []) {
    return new ApiError(400, message, errors);
  }
  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }
  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }
  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }
  static conflict(message = 'Conflict') {
    return new ApiError(409, message);
  }
  static tooManyRequests(message = 'Too many requests') {
    return new ApiError(429, message);
  }
  static internal(message = 'Internal server error') {
    return new ApiError(500, message);
  }
}
