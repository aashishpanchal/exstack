import {HttpError} from './index';
import type {RequestHandler} from 'express';
import {prettifyError, flattenError, type ZodType} from 'zod';

type Type = 'body' | 'query' | 'params';

export class Validator {
  /**
   * Generic middleware to validate a specific part of the request (body, query, or params)
   */
  #middleware =
    (schema: ZodType, type: Type): RequestHandler =>
    (req, res, next) => {
      // Perform safe parsing using the schema and target request type
      const {success, data, error} = schema.readonly().safeParse(req[type] || {});

      if (success) {
        // If valid, replace the original data with the parsed and typed version
        Object.assign(req[type], data);
        next(); // Proceed to the next middleware or route handler
      } else {
        throw new HttpError(404, {
          data: flattenError(error),
          cause: prettifyError(error),
          message: `Received data is not valid from req.${type}`,
        });
      }
    };

  /**
   * Shortcut to validate request body against a Zod schema.
   *
   * @param schema - Zod schema for validating req.body
   */
  body = (schema: ZodType): RequestHandler => this.#middleware(schema, 'body');

  /**
   * Shortcut to validate request URL parameters against a Zod schema.
   *
   * @param schema - Zod schema for validating req.params
   */
  params = (schema: ZodType): RequestHandler => this.#middleware(schema, 'params');

  /**
   * Shortcut to validate request query string against a Zod schema.
   *
   * @param schema - Zod schema for validating req.query
   */
  query = (schema: ZodType): RequestHandler => this.#middleware(schema, 'query');
}

export const validator = new Validator();
