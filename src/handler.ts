import {ApiRes} from './helps';
import type {Handler, Context, InputType} from './types';
import type {NextFunction, Request, Response} from 'express';

type ReqHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

/**
 * Sends the result from a route handler to the client.
 *
 * - If result is an `ApiRes`, call its `.toJson()` method.
 * - Otherwise, send it directly (ignores `res` itself).
 */
const handleResult = (result: unknown, res: Response): void => {
  if (result instanceof ApiRes) result.toJson(res);
  else if (result && result !== res) res.send(result);
};

/**
 * Wraps an async/sync route handler.
 *
 * Responsibilities:
 * - Builds a `ctx` object with `{ req, res, next, body, query, param }`
 * - Calls your handler and catches errors
 * - Passes handler return value into `handleResult`
 *
 * @typeParam I - Input type for body/query/param (see `InputType`)
 *
 * @example
 * // Without type
 * app.get(
 *  '/ping',
 *   handler(async () => ApiRes.ok({ alive: true }).msg('Pong')),
 * );
 *
 * // Body type
 * type LoginInput = InputType<{ username: string; password: string }>;
 *
 * app.post('/login',
 *   handler<LoginInput>(async ({ body }) => new ApiRes(200, { user: body.username }))
 * );
 */
export const handler =
  <I extends InputType>(callback: Handler<I>): ReqHandler =>
  async (req, res, next) => {
    try {
      const ctx: Context = {
        req,
        res,
        next,
        body: req.body,
        query: req.query,
        param: req.params,
      };
      const result = callback(ctx);
      if (result instanceof Promise) {
        // Await async handler
        result.then(value => handleResult(value, res)).catch(next);
      } else {
        // Handle sync result
        handleResult(result, res);
      }
    } catch (error) {
      next(error);
    }
  };
