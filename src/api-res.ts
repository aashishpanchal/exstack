import {Response} from 'express';
import {HttpStatus} from './enums';
import type {HttpStatusCode, RedirectStatusCode, ClientErrorStatusCode, ServerErrorStatusCode} from './types';

/** The structure of the HTTP response body. */
export type HttpResBody = {result: any; status: number; message: string};
// Define the type for the status code of HTTP success response
type StatusCode = Exclude<HttpStatusCode, ClientErrorStatusCode | ServerErrorStatusCode | RedirectStatusCode>;

/**
 * ApiRes class for standardizing API responses
 */
export class ApiRes {
  /**
   * Creates an instance of ApiRes.
   * @param {any} result - The result of the operation
   * @param {StatusCode} status - The HTTP status code
   * @param {string} message - The response message
   */
  constructor(
    readonly result: any = {},
    readonly status: StatusCode = HttpStatus.OK,
    readonly message: string = 'Operation successful',
  ) {}

  /**
   * Returns the Body (JSON) representation of the response.
   * @returns The Body (JSON) representation of the response
   */
  public getBody = (): HttpResBody => ({
    status: this.status,
    message: this.message,
    result: this.result,
  });

  /**
   * Send the json of HTTP response.
   * @param {Response} res - The Express response object.
   *
   * @example
   * new ApiRes('Hello World', 200).toJson(res);
   */
  public toJson = (res: Response) => {
    res.status(this.status).json(this.getBody());
  };

  /**
   * Creates an OK (200) response.
   * @param {any} result - The result to be included in the response
   * @param {string} [message='Request processed successfully'] - The response message
   * @returns {ApiRes} An ApiRes instance with OK status
   */
  static ok = (result: any, message: string = 'Request processed successfully'): ApiRes =>
    new ApiRes(result, HttpStatus.OK, message);

  /**
   * Creates a Created (201) response.
   * @param {any} result - The result to be included in the response
   * @param {string} [message='Resource created successfully'] - The response message
   * @returns {ApiRes} An ApiRes instance with Created status
   */
  static created = (result: any, message: string = 'Resource created successfully'): ApiRes =>
    new ApiRes(result, HttpStatus.CREATED, message);

  /**
   * Creates a paginated OK (200) response.
   * @param {any} data - The paginated data
   * @param {object} meta - Metadata for pagination
   * @param {string} [message='Data retrieved successfully'] - The response message
   * @returns {ApiRes} An ApiRes instance with OK status and paginated data
   */
  static paginated = (data: any, meta: object, message: string = 'Data retrieved successfully'): ApiRes =>
    new ApiRes({...meta, data}, HttpStatus.OK, message);
}
