import type {RequestHandler} from 'express';

/**
 * Middleware to customize or override the `X-Powered-By` HTTP header.
 * Often used for branding or hiding technology stack.
 *
 * @param name - Value to be set for the `X-Powered-By` header
 */
export const poweredBy =
  (name: string): RequestHandler =>
  (_, res, next) => {
    res.setHeader('x-powered-by', name); // Set the custom header
    next(); // Continue to next middleware
  };
