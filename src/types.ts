import type {HttpStatus} from './status';
import type {NextFunction, Request, Response} from 'express';

type ValueOf<T> = T[keyof T];
type NumberOf<K> = Extract<K, number>;

// Define a type for HttpStatus that only includes number values
export type HttpStatusCode = NumberOf<ValueOf<typeof HttpStatus>>;

// prettier-ignore
/** Informational & Success (1xx–2xx) */
export type SuccessStatusCode = 100 | 101 | 102 | 103 | 200 | 201 | 202 | 203 | 204 | 205 | 206 | 207 | 208 | 226;

// prettier-ignore
/** Redirect (3xx) */
export type RedirectStatusCode = 300 | 301 | 302 | 303 | 304 | 305 | 306 | 307 | 308;

// prettier-ignore
/** Server Error (5xx) */
export type ServerErrorStatusCode =  500 | 501 | 502 | 503 | 504 | 505 | 506 | 507 | 508 | 509 | 510 | 511;

/**
 * Client Error (4xx)
 *
 * Automatically derived by excluding all known 1xx, 2xx, 3xx, and 5xx codes.
 */
export type ClientErrorStatusCode = Exclude<
	HttpStatusCode,
	SuccessStatusCode | RedirectStatusCode | ServerErrorStatusCode
>;

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
export type Handler = (
	req: Request,
	res: Response,
	next: NextFunction,
) => unknown | Promise<unknown>;
