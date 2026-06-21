import type * as z from 'zod';
import {HttpError} from './helps/errors';
import type {RequestHandler} from 'express';
import {flattenError, prettifyError} from 'zod';

type Target = 'body' | 'query' | 'params' | 'all';
type Schema<T extends Target> = T extends 'all'
	? {
			body?: z.ZodType;
			query?: z.ZodType;
			params?: z.ZodType;
		}
	: z.ZodType;

class Validator {
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
								meta: flattenError(result.error),
								cause: prettifyError(result.error),
								message: `Invalid data in req.${key}`,
							});
						}

						(req as any)._valid ??= {};
						(req as any)._valid[key] = result.data;
					}
				} else {
					// Validate a single section (body, query, or params)
					const result = (schema as z.ZodType).safeParse(
						(req as any)[target] || {},
					);
					if (!result.success) {
						throw new HttpError(400, {
							code: 'VALIDATION_ERROR',
							meta: flattenError(result.error),
							cause: prettifyError(result.error),
							message: `Invalid data in req.${target}`,
						});
					}

					(req as any)._valid ??= {};
					(req as any)._valid[target] = result.data;
				}

				// Attach req.valid() helper if not already present
				req.valid = (t: Target) => (req as any)._valid?.[t] as any;

				next();
			} catch (error) {
				next(error);
			}
		};

	all = (schema: Schema<'all'>): RequestHandler =>
		this.#middleware('all', schema);
	body = (schema: z.ZodType): RequestHandler =>
		this.#middleware('body', schema);
	query = (schema: z.ZodType): RequestHandler =>
		this.#middleware('query', schema);
	params = (schema: z.ZodType): RequestHandler =>
		this.#middleware('params', schema);
}

export const validator = new Validator();

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
