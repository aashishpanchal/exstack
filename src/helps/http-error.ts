import {HttpStatus} from '../status';
import type {Response} from 'express';
import type {ClientErrorStatusCode, ServerErrorStatusCode} from '../types';

/** The type for the body message of HTTP errors. */
type Message = string | string[];

/** The structure of the HTTP error body. */
export type HttpErrorBody = {
  data?: Record<string, unknown> | null;
  code?: string | null;
  error: string;
  status: Status;
  message: Message;
};

// Define the type for the status code of HTTP errors
type Status = ServerErrorStatusCode | ClientErrorStatusCode;

/**
 * Get a human-readable error name from the HTTP status code.
 * @param {number} status - The HTTP status code.
 * @returns {string} - The formatted error name.
 */
const getErrorName = (status: Status): string => {
  if (status < 400 || status > 511) return 'HttpError';
  // Find the key corresponding to the given status code
  const statusKey = HttpStatus[`${status}_NAME`];
  // If the status code is not found, return a generic error name
  if (!statusKey) return 'HttpError';
  const name = statusKey
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .replace(/\s+/g, '');
  return name.endsWith('Error') ? name : name.concat('Error');
};

/**
 * Base class for handling HTTP errors.
 * @extends {Error}
 */
export class HttpError extends Error {
  /**
   * Creates an instance of `HTTPException`.
   * @param status - HTTP status code for the exception. Defaults to 500.
   * @param options - Additional options for the exception.
   */
  constructor(
    readonly status: Status = HttpStatus.INTERNAL_SERVER_ERROR,
    readonly options: Pick<HttpErrorBody, 'message' | 'data' | 'code'> & {
      cause?: unknown;
    },
  ) {
    super(typeof options.message === 'string' ? options.message : getErrorName(status));
    this.name = getErrorName(status); // change name of error according to status code
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Check if the given error is an instance of HttpError.
   * @param {unknown} value - The error to check.
   * @returns {boolean} - True if the error is an instance of HttpError, false otherwise.
   *
   * @example
   * if (HttpError.isHttpError(error)) {
   *   // Handle the HttpError
   * }
   */
  static isHttpError = (value: unknown): value is HttpError => value instanceof HttpError;

  /**
   * Convert the HttpError instance to a Body object.
   * @example
   * const errorBody = new HttpError(404, {message: 'Not Found'}).body;
   */
  get body(): HttpErrorBody {
    const {name: error, status} = this;
    const {message, data = null, code = null} = this.options;
    return {status, error, message, data, code};
  }

  /**
   * Send the json of the error in an HTTP response.
   * @param {Response} res - The Express response object.
   *
   * @example
   * new HttpError(404, {message: 'Not Found'}).toJson(res);
   */
  toJson = (res: Response): void => {
    res.status(this.status).json(this.body);
  };
}
/**
 * Utility function to create custom error classes.
 * @param status - HTTP status code.
 * @returns - A new error class.
 * @example
 * const NotFoundError = createHttpErrorClass(HttpStatus.NOT_FOUND);
 */
export const createHttpErrorClass = (status: Status) =>
  class extends HttpError {
    constructor(
      message: Message,
      options: {
        cause?: unknown;
        code?: string | null;
        data?: Record<string, unknown> | null;
      } = {},
    ) {
      super(status, {message, ...options});
    }
  };

/**
 * Represents a Bad Request HTTP error (400).
 * @extends {HttpError}
 */
export const BadRequestError = createHttpErrorClass(HttpStatus.BAD_REQUEST);

/**
 * Represents a Conflict HTTP error (409).
 * @extends {HttpError}
 */
export const ConflictError = createHttpErrorClass(HttpStatus.CONFLICT);

/**
 * Represents a Forbidden HTTP error (403).
 * @extends {HttpError}
 */
export const ForbiddenError = createHttpErrorClass(HttpStatus.FORBIDDEN);

/**
 * Represents a Not Found HTTP error (404).
 * @extends {HttpError}
 */
export const NotFoundError = createHttpErrorClass(HttpStatus.NOT_FOUND);

/**
 * Represents an UnAuthorized HTTP error (401).
 * @extends {HttpError}
 */
export const UnAuthorizedError = createHttpErrorClass(HttpStatus.UNAUTHORIZED);

/**
 * Represents an Internal Server Error HTTP error (500).
 * @extends {HttpError}
 */
export const InternalServerError = createHttpErrorClass(HttpStatus.INTERNAL_SERVER_ERROR);

/**
 * Represents an Content Too Larger Error HTTP error (413).
 * @extends {HttpError}
 */
export const ContentTooLargeError = createHttpErrorClass(HttpStatus.PAYLOAD_TOO_LARGE);
