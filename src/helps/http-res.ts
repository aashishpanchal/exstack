import {Response} from 'express';
import {HttpStatus} from '../status';
import type {HttpStatusCode, RedirectStatusCode, ClientErrorStatusCode, ServerErrorStatusCode} from '../types';

// Define the type for the status code of HTTP success response
type Status = Exclude<HttpStatusCode, ClientErrorStatusCode | ServerErrorStatusCode | RedirectStatusCode>;

/** The structure of the HTTP response body. */
export type HttpResBody = {result: any; status: number; message: string};

/**
 * ApiRes class for standardizing API responses
 */
export class ApiRes {
  /**
   * Creates an instance of ApiRes.
   * @param {any} result - The result of the operation
   * @param {Status} status - The HTTP status code
   * @param {string} message - The response message
   */
  constructor(
    private result: any = null,
    private status: Status = HttpStatus.OK,
    private message: string = 'Operation successful',
  ) {}

  /**
   * Returns the Body (JSON) representation of the response.
   * @returns The Body (JSON) representation of the response
   *
   * @example
   * new ApiRes('Hello World', 200).body;
   */
  get body(): HttpResBody {
    return {
      status: this.status,
      message: this.message,
      result: this.result,
    };
  }

  /** Set message (chainable) */
  msg = (message: string): ApiRes => {
    this.message = message;
    return this;
  };

  /** Set result/data (chainable) */
  data = (result: any): ApiRes => {
    this.result = result;
    return this;
  };

  /**
   * Send the json of HTTP response.
   * @param {Response} res - The Express response object.
   *
   * @example
   * new ApiRes('Hello World', 200).toJson(res);
   */
  toJson = (res: Response): void => {
    res.status(this.status).json(this.body);
  };

  /** Clone self with a different status */
  static status = (code: Status) => new ApiRes(null, code);

  /** Creates an OK (200) response. */
  static ok = (result: any, message: string = 'Request processed successfully'): ApiRes =>
    new ApiRes(result, HttpStatus.OK, message);

  /** Creates a Created (201) response. */
  static created = (result: any, message: string = 'Resource created successfully'): ApiRes =>
    new ApiRes(result, HttpStatus.CREATED, message);

  /** Creates a paginated OK (200) response. */
  static paginated = (data: any, meta: object, message: string = 'Data retrieved successfully'): ApiRes =>
    new ApiRes({...meta, data}, HttpStatus.OK, message);
}
