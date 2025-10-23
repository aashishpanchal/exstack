import {handleResult} from '../../handler';
import type {RequestHandler} from 'express';

export type Middleware = [[Function, unknown], unknown][] | [[Function]][];

/**
 * An optimized middleware composer that avoids recursion and excessive closures.
 * It iterates through the middleware stack, calling each handler in sequence.
 *
 * @param {Middleware} middleware - An array of middleware handlers.
 * @returns {RequestHandler} An Express-compatible request handler.
 */
export const compose =
  (middleware: Middleware): RequestHandler =>
  (req, res, done) => {
    let index = -1;
    let i = 0;

    const next = (err?: any) => {
      if (err) return done(err);
      if (i <= index) return done(new Error('next() called multiple times'));
      index = i;

      // Get next middleware
      const item = middleware[i++];
      if (!item) return done();

      const handler = item[0][0];
      // --- Set routeIndex for lazy param resolution
      (req as any).routeIndex = i - 1;

      try {
        const result = handler(req, res, next);
        if (result instanceof Promise) result.then(value => handleResult(value, res)).catch(done);
        else handleResult(result, res);
      } catch (error) {
        done(error);
      }
    };
    next();
  };
