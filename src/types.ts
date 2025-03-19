import type {HttpStatus} from './enums';
import type {Request, Response, NextFunction, RequestHandler} from 'express';

/** Extracts the value type of an object */
export type ValueOf<T> = T[keyof T];

/** Filters out only number types from a union */
export type NumberOf<K> = Extract<K, number>;

// Define a type for HttpStatus that only includes number values
export type HttpStatusCode = NumberOf<ValueOf<typeof HttpStatus>>;

/**
 * @module
 * HTTP Status utility.
 */
export type SuccessStatusCode = 100 | 101 | 102 | 103 | 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;
export type RedirectStatusCode = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;
export type ServerErrorStatusCode = 500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 510 | 511;
export type ClientErrorStatusCode = Exclude<
  HttpStatusCode,
  ServerErrorStatusCode | RedirectStatusCode | SuccessStatusCode
>;

/**
 * A generic type for request handler functions in an Express application.
 *
 * @example
 * // Example usage for a login handler
 * type LoginHandler = Handler<{ username: string; password: string }>;
 */
export type Handler<TBody = any, TParam = any, TQuery = any, TResBody = any> = (
  req: Request<TParam, TResBody, TBody, TQuery>,
  res: Response<TResBody>,
  next: NextFunction,
) => any | Promise<any>;

/**
 * A generic type for input validation schemas.
 *
 * @example
 * // Example usage for a login input schema
 * type LoginInput = InputType<{ username: string; password: string }>;
 */
export type InputType<TBody = any, TParam = any, TQuery = any> = {body: TBody; query: TParam; param: TQuery};

// Define a constructor type for classes
export type Constructor<T> = new (...args: any[]) => T;

// Define a type that wraps methods of a class with request handlers
export type WrappedMethods<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any
    ? RequestHandler // If the method is a function, wrap it with ReqHandler
    : T[K]; // Otherwise, keep the original type
};
