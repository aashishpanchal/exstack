import type {ErrorRequestHandler} from 'express';
import {HttpError, InternalServerError} from './errors';

// Define the ErrorOption type
type Options = {
  isDev?: boolean;
  write?: (error: unknown) => void;
};

/**
 * Express middleware to handle `HttpError` and unknown errors.
 *
 * - Sends JSON response for `HttpError` instances.
 * - Logs unknown errors and sends generic error response.
 * - Includes detailed error info in development (`isDev`).
 *
 * @param {Options} [options] - Options for error handling.
 * @param {boolean} [options.isDev=true] - Include detailed error information in responses if true. Default is `true`.
 * @param {(err: unknown) => void} [options.write] - Function to handle logging of unknown errors. If not provided, errors will not be logged.
 *
 * @returns {ErrorRequestHandler} - Middleware for handling errors.
 *
 * @example
 * // Basic usage with default options:
 * app.use(globalErrorHandler({ isDev: process.env.NODE_ENV !== 'production' }));
 *
 * // Custom usage with a logging function in production mode:
 * app.use(globalErrorHandler({
 *  isDev: process.env.NODE_ENV !== 'production',
 *  write: error => console.error(error)
 * }));
 */
export const globalErrorHandler =
  (
    options: Options = {
      isDev: true,
      write: undefined,
    },
  ): ErrorRequestHandler =>
  (err, _req, res, _next) => {
    const {isDev, write} = options;
    // Handle known HttpError instances
    if (HttpError.isHttpError(err)) return err.toJson(res);
    // Write unknown errors if a write function is provided
    write?.(err);
    // Create an InternalServerError for unknown errors
    return new InternalServerError(isDev ? err.message : 'Something went wrong', isDev ? err.stack : null).toJson(res);
  };

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
