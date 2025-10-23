import {ApiRes} from './helps';
import type {Handler} from './types';
import type {NextFunction, Request, Response} from 'express';

/**
 * Sends the result from a route handler to the client.
 *
 * - If `result` is an {@link ApiRes}, calls its `.toJson(res)` method.
 * - Otherwise, sends it directly (unless it *is* the response object itself).
 *
 * @param result - The value returned by a route handler.
 * @param res - The Express response object.
 */
export const handleResult = (result: unknown, res: Response): void => {
  if (result instanceof ApiRes) result.toJson(res);
  else if (result && result !== res) res.send(result);
};

/**
 * Wraps a route handler (sync or async) and automatically:
 * - Invokes the handler with `(req, res, next)`
 * - Catches synchronous and asynchronous errors
 * - Passes any returned value into {@link handleResult}
 *
 * @param callback - A function that handles a request, returning a value or `Promise`.
 * @returns An Express-compatible request handler.
 *
 * @example
 * app.get('/ping', handler(async () => ApiRes.ok({ alive: true }).msg('Pong')));
 *
 * @example
 * app.post('/login', handler(async (req, res) => {
 *   const { username, password } = req.body;
 *   return new ApiRes(200, { user: username });
 * }));
 */
export const handler = (callback: Handler) => async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = callback(req, res, next);
    if (result instanceof Promise) result.then(value => handleResult(value, res)).catch(next);
    else handleResult(result, res);
  } catch (error) {
    next(error);
  }
};
