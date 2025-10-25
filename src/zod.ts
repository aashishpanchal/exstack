import type * as z from 'zod';
import {HttpError} from './helps';
import type {RequestHandler} from 'express';
import {flattenError, prettifyError} from 'zod';

/**
 * Possible request targets to validate.
 */
type Target = 'body' | 'query' | 'params' | 'all';

/**
 * Shape of schemas passed to `.all()`.
 */
type Schema<T extends Target> = T extends 'all'
  ? {
      body?: z.ZodType;
      query?: z.ZodType;
      params?: z.ZodType;
    }
  : z.ZodType;

/**
 * Express.js-compatible validator class.
 */
class Validator {
  /**
   * Core validation logic used internally by all public methods.
   * @template T - The part of the request to validate ('body' | 'query' | 'params' | 'all')
   * @param {T} target - The target request part or 'all'
   * @param {Schema<T>} schema - Zod schema(s) for validation
   * @returns {RequestHandler} Express middleware
   * @private
   */
  #middleware =
    <T extends Target>(target: T, schema: Schema<T>): RequestHandler =>
    (req, _, next) => {
      try {
        // Validate multiple request parts
        if (target === 'all') {
          const schemas = schema as Schema<'all'>;
          for (const key of Object.keys(schemas) as Exclude<Target, 'all'>[]) {
            const zodSchema = schemas[key];
            if (!zodSchema) continue;

            const result = zodSchema.safeParse((req as any)[key] || {});
            if (!result.success) {
              throw new HttpError(400, {
                code: 'VALIDATION_ERROR',
                data: flattenError(result.error),
                cause: prettifyError(result.error),
                message: `Invalid data in req.${key}`,
              });
            }

            (req as any)._validated ??= {};
            (req as any)._validated[key] = result.data;
          }
        } else {
          // Validate a single section (body, query, or params)
          const result = (schema as z.ZodType).safeParse((req as any)[target] || {});
          if (!result.success) {
            throw new HttpError(400, {
              code: 'VALIDATION_ERROR',
              data: flattenError(result.error),
              cause: prettifyError(result.error),
              message: `Invalid data in req.${target}`,
            });
          }

          (req as any)._validated ??= {};
          (req as any)._validated[target] = result.data;
        }

        // Attach req.valid() helper if not already present
        req.valid = (t: Target) => (req as any)._validated?.[t] as any;

        next();
      } catch (error) {
        next(error);
      }
    };

  /**
   * Validates the request body against a Zod schema.
   * @param {ZodType} schema - Zod schema to validate `req.body`
   * @returns {RequestHandler} Middleware that validates `req.body` and populates `req._validated.body`
   */
  body = (schema: z.ZodType): RequestHandler => this.#middleware('body', schema);

  /**
   * Validates the request query string against a Zod schema.
   * @param {ZodType} schema - Zod schema to validate `req.query`
   * @returns {RequestHandler} Middleware that validates `req.query` and populates `req._validated.query`
   */
  query = (schema: z.ZodType): RequestHandler => this.#middleware('query', schema);

  /**
   * Validates the request URL parameters against a Zod schema.
   * @param {ZodType} schema - Zod schema to validate `req.params`
   * @returns {RequestHandler} Middleware that validates `req.params` and populates `req._validated.params`
   */
  params = (schema: z.ZodType): RequestHandler => this.#middleware('params', schema);

  /**
   * Validates multiple parts of the request (body, query, params) simultaneously.
   * @param {Schema<'all'>} schema - Object containing Zod schemas for each request part
   * @returns {RequestHandler} Middleware that validates all provided request parts and populates `req._validated`
   */
  all = (schema: Schema<'all'>): RequestHandler => this.#middleware('all', schema);
}

/**
 * Provides middleware for validating request body, query, params, or all of them using Zod schemas.
 * Attaches a `req.valid()` helper to access validated data.
 */
export const validator = new Validator();

/**
 * Extends Express Request.
 */
declare module 'express-serve-static-core' {
  interface Request {
    /**
     * Retrieve already validated data.
     *
     * ### Examples
     *
     * ```ts
     * import { z } from 'zod';
     * import { validator } from './validator';
     *
     * // Define a schema for the body
     * const userSchema = z.object({
     *   name: z.string(),
     *   age: z.number().int(),
     * });
     *
     * // Use validator middleware
     * app.post('/user', validator.body(userSchema), (req, res) => {
     *   // ✅ Inferred automatically from the Zod schema
     *   const user = req.valid('body');
     *   // user: { name: string; age: number }
     *
     *   // ✅ Explicitly specify Zod type if you prefer clarity
     *   const typedUser = req.valid<typeof userSchema>('body');
     *
     *   // ✅ Or manually define your own structure
     *   const manualUser = req.valid<{ name: string; age: number }>('body');
     *
     *   res.json(user);
     * });
     * ```
     */
    valid<T extends Target>(
      type: T,
    ): T extends 'body'
      ? Record<string, any>
      : T extends 'query'
        ? Record<string, any>
        : T extends 'all'
          ? {body: Body; query: Query; params: Params}
          : Record<string, any>;
    valid<T extends z.ZodType>(type: Target): z.Infer<T>;
    valid<T extends object>(type: Target): T;
  }
}
