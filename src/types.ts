import type {ApiRes} from './helps';
import type {HttpStatus} from './status';
import type {NextFunction, Request, Response} from 'express';

/**
 * Extracts the union of all value types of a given object type.
 *
 * @example
 * ```ts
 * type Example = { a: 1; b: 'x'; c: true };
 * type Values = ValueOf<Example>; // 1 | 'x' | true
 * ```
 */
type ValueOf<T> = T[keyof T];

/**
 * Filters a union to only include numeric members.
 *
 * @example
 * ```ts
 * type Mixed = string | number | boolean;
 * type OnlyNumbers = NumberOf<Mixed>; // number
 * ```
 */
type NumberOf<K> = Extract<K, number>;

/**
 * Represents any valid return type from a route handler.
 */
export type RType = void | string | ApiRes | Record<string, any>;

/**
 * Represents a standard Express-style route handler.
 *
 * @remarks
 * The handler may return:
 * - a plain value (string, object, etc.)
 * - an instance of {@link ApiRes}
 * - a `Promise` resolving to one of those values.
 *
 * The framework will automatically detect and send the result.
 */
export type Handler = (req: Request, res: Response, next: NextFunction) => RType | Promise<RType>;

/**
 * Extracts numeric status codes from {@link HttpStatus}.
 *
 * Ensures that only numeric HTTP status codes are allowed.
 */
export type HttpStatusCode = NumberOf<ValueOf<typeof HttpStatus>>;

/**
 * @module
 * HTTP Status Utility Types
 */

/** 1xx & 2xx Success Codes */
export type SuccessStatusCode = 100 | 101 | 102 | 103 | 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;

/** 3xx Redirect Codes */
export type RedirectStatusCode = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;

/** 5xx Server Error Codes */
export type ServerErrorStatusCode = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;

/**
 * 4xx Client Error Codes
 *
 * Calculated by excluding all known success, redirect, and server error codes.
 */
export type ClientErrorStatusCode = Exclude<
  HttpStatusCode,
  SuccessStatusCode | RedirectStatusCode | ServerErrorStatusCode
>;

/**
 * Represents a single route definition.
 *
 * @template T - The type of the route handler (defaults to {@link Handler}).
 *
 * @example
 * ```ts
 * const route: RouterRoute = {
 *   basePath: '/api',
 *   path: '/users/:id',
 *   method: 'get',
 *   handler: getUserHandler,
 * };
 * ```
 */
export interface RouterRoute<T = Handler> {
  /** Base path prefix (e.g., `/api`). */
  basePath: string;
  /** The route pattern (e.g., `/users/:id`). */
  path: string;
  /** The HTTP method for this route (e.g., `'get'`, `'post'`). */
  method: string;
  /** The request handler function. */
  handler: T;
}

/**
 * Defines the structure of a router that can register and match routes.
 *
 * @template T - The type of handler used in routes.
 *
 * @example
 * ```ts
 * const router: Router<Handler> = {
 *   name: 'apiRouter',
 *   add(method, path, handler) {
 *     // store route
 *   },
 *   match(method, path) {
 *     // return matching route
 *   },
 * };
 * ```
 */
export interface Router<T = Handler> {
  /** Router name (useful for debugging). */
  name: string;

  /**
   * Registers a new route.
   *
   * @param method - HTTP method (e.g., `'get'`, `'post'`).
   * @param path - Route pattern (e.g., `'/users/:id'`).
   * @param handler - The route handler.
   */
  add(method: string, path: string, handler: T): void;

  /**
   * Finds the best route match for a given HTTP method and path.
   *
   * @param method - The HTTP method.
   * @param path - The incoming request path.
   * @returns A {@link Result} describing the matched handlers and params.
   */
  match(method: string, path: string): Result<T>;
}

/**
 * Maps route parameter names to their position indices.
 *
 * Used by routers that store positional parameter data.
 *
 * @example
 * ```ts
 * const map: ParamIndexMap = { userId: 0, postId: 1 };
 * ```
 */
export type ParamIndexMap = Record<string, number>;

/**
 * Represents a list of positional parameter values.
 *
 * Example: for `/user/123/post/456`, `stash` could be `['123', '456']`.
 */
export type ParamStash = string[];

/**
 * Represents a key-value object mapping parameter names to string values.
 *
 * Example: `{ id: '123', action: 'edit' }`
 */
export type Params = Record<string, string>;

/**
 * The result of attempting to match a route.
 *
 * Can take one of two shapes:
 *
 * 1. **Indexed Parameters**
 * ```ts
 * [
 *   [
 *     [handlerA, { id: 0 }],
 *     [handlerB, { id: 0, action: 1 }],
 *   ],
 *   ['123', 'edit']
 * ]
 * ```
 *
 * 2. **Resolved Parameters**
 * ```ts
 * [
 *   [
 *     [handlerA, { id: '123' }],
 *     [handlerB, { id: '123', action: 'edit' }],
 *   ]
 * ]
 * ```
 */
export type Result<T> = [[T, ParamIndexMap][], ParamStash] | [[T, Params][]];

/**
 * Constant representing a wildcard or catch-all HTTP method.
 *
 * Used for handlers that apply to all methods.
 *
 * @example
 * ```ts
 * router.add(METHOD_NAME_ALL, '*', globalMiddleware);
 * ```
 */
export const METHOD_NAME_ALL = 'ALL';

/** Lowercase equivalent of {@link METHOD_NAME_ALL}. */
export const METHOD_NAME_ALL_LOWERCASE = 'all' as const;

/**
 * Supported HTTP methods (lowercase).
 *
 * @example
 * ```ts
 * METHODS.forEach(method => router.add(method, '/ping', pingHandler));
 * ```
 */
export const METHODS = ['get', 'post', 'put', 'delete', 'options', 'patch'] as const;
