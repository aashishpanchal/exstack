import {HttpStatus} from './enums';
import {HttpError, NotFoundError} from './errors';
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
      if (err.options.cause) logger?.(`HttpError Cause: ${err.options.cause}`);
      return err.toJson(res);
    }
    // Write unknown errors if a write function is provided
    logger?.(`Unknown Error: ${err}`);
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
export const notFound = (path: string = '*'): Router =>
  Router().all(path, (req, res) =>
    new NotFoundError(`Cannot ${req.originalUrl} on ${req.method.toUpperCase()}`).toJson(res),
  );

/** Map Action and subject with filter */
type MapObject<
  A extends readonly string[],
  S extends readonly string[],
  F extends Partial<Record<S[number], A[number][]>>,
> = Pick<
  {
    [K in Uppercase<`${S[number]}_${A[number]}`>]: K extends `${infer Sub}_${infer Act}`
      ? `${Lowercase<Sub>}:${Lowercase<Act>}`
      : never;
  },
  | Uppercase<`${Exclude<S[number], keyof F>}_${A[number]}`> // Subjects without filters get all actions
  | (keyof F extends infer FS
      ? FS extends S[number]
        ? F[FS] extends readonly A[number][]
          ? Uppercase<`${FS}_${F[FS][number]}`> // Subjects with filters get only specified actions
          : never
        : never
      : never)
>;

/**
 * Generates a permission object mapping subjects and actions to permission strings.
 *
 * @template A - List of actions that can be performed.
 * @template S - List of subjects (resources) being acted upon.
 * @template F - Optional object specifying which actions are allowed per subject.
 *
 * @param {Options<A, S, F>} options - The options object containing actions, subjects, and an optional filter.
 * @returns {Readonly<PermissionMapping<A, S, F>>} A frozen object mapping subjects and actions to permission strings.
 *
 * @example
 * const permissions = makePermission({
 *   actions: ['create', 'read', 'update', 'delete'] as const,
 *   subjects: ['user', 'post', 'comment'] as const,
 *   filter: {
 *     user: ['read'],
 *     post: ['create', 'update'],
 *   },
 * });
 * console.log(permissions.USER_CREATE);
 */
export function makePermission<
  A extends readonly string[],
  S extends readonly string[],
  F extends Partial<Record<S[number], A[number][]>>,
>(options: {actions: A; subjects: S; filter?: F}): Readonly<MapObject<A, S, F>> {
  const {actions, subjects, filter} = options;
  // Map action to subject with filter
  const map_data = subjects.flatMap(subject =>
    (filter?.[subject as keyof F] ?? actions).map(action => [
      `${subject}_${action}`.toUpperCase(), // Convert key to uppercase
      `${subject.toLowerCase()}:${action.toLowerCase()}`,
    ]),
  );
  return Object.freeze(Object.fromEntries(map_data));
}
