import {HttpError} from '../helps';
import {HttpStatus} from '../status';
import {Router, type ErrorRequestHandler} from 'express';

/**
 * Express middleware to handle `HttpError` and unknown errors.
 *
 * - Sends JSON response for `HttpError` instances.
 * - Logs unknown errors and sends generic error response.
 * - Includes detailed error info in development (`isDev`).
 *
 * @param {Boolean} [isDev = true] - Flag to indicate if the environment is development.
 * @param {(error: unknown) => void} [logger = console.error] - Function to log errors.
 * @returns {ErrorRequestHandler} - Middleware for handling errors.
 *
 * @example
 * // Basic usage with default options:
 * app.use(errorHandler(process.env.NODE_ENV !== 'production'));
 * // Custom usage with a logging function in production mode:
 * app.use(errorHandler(conf.isDev, logger.error));
 */
export const errorHandler =
  (isDev: boolean = true, logger: (error: unknown) => void = console.error): ErrorRequestHandler =>
  (err, _req, res, _next) => {
    // Handle known HttpError instances
    if (HttpError.isHttpError(err)) {
      // Log the cause if it exists
      if (err.options.cause) logger?.(err.options.cause);
      return err.toJson(res);
    }
    // Write unknown errors if a write function is provided
    logger?.(err);
    // Standardized error response for unknown exceptions
    const unknown = {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: isDev ? err.message || 'Unexpected error' : 'Something went wrong',
      stack: isDev ? err.stack : undefined,
    };
    res.status(unknown.status).json(unknown);
  };

/**
 * Middleware to handle 404 Not Found errors.
 *
 * This function creates an Express router that catches all requests to
 * undefined routes and returns a JSON response with a 404 error.
 *
 * @param {string} [path='*'] - The route pattern to match (default: '*').
 * @returns {Router} Express router instance handling 404 errors.
 *
 * @example
 * app.use(notFound())
 */
export const notFound = (path: string = '*splat'): Router =>
  Router().all(path, (req, res) =>
    new HttpError(HttpStatus.NOT_FOUND, {
      message: `Cannot ${req.originalUrl} on ${req.method.toUpperCase()}`,
    }).toJson(res),
  );
