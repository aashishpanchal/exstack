import {Param} from './param';
import {compose} from './layer';
import {mergePath} from './utils';
import {HttpError} from '../helps';
import {SmartRouter} from './smart';
import {TrieRouter} from './trie-tree';
import {RegExpRouter} from './reg-exp';
import {handleResult} from '../handler';
import type {RequestHandler} from 'express';
import type {Handler, RouterRoute} from '../types';
import {METHODS, METHOD_NAME_ALL, METHOD_NAME_ALL_LOWERCASE} from '../types';

/**
 * A lightweight, Express-compatible router built on top of a RegExp/Trie based matcher.
 *
 * @remarks
 * This router mimics the Express API (`get`, `post`, `use`, etc.)
 * but internally uses a fast RegExp-based matcher for route lookups.
 * It can be used as standalone middleware or as a building block
 * for custom frameworks.
 *
 * @example
 * ```ts
 * const app = express();
 * const api = new Router();
 *
 * api.get('/ping', (req, res) => res.send('pong'));
 * api.post('/login', async (req, res) => ApiRes.ok({ token: 'abc123' }));
 *
 * app.use(api.dispatch);
 * ```
 */
export class Router {
  routes: RouterRoute[] = [];
  #basePath = '/';
  #path = '/';
  router: SmartRouter<[Handler, RouterRoute]>;

  /** Register a GET route. */
  get!: (path: string, ...handlers: Handler[]) => this;
  /** Register a POST route. */
  post!: (path: string, ...handlers: Handler[]) => this;
  /** Register a PUT route. */
  put!: (path: string, ...handlers: Handler[]) => this;
  /** Register a DELETE route. */
  delete!: (path: string, ...handlers: Handler[]) => this;
  /** Register a PATCH route. */
  patch!: (path: string, ...handlers: Handler[]) => this;
  /** Register a HEAD route. */
  head!: (path: string, ...handlers: Handler[]) => this;
  /** Register an OPTIONS route. */
  options!: (path: string, ...handlers: Handler[]) => this;
  /** Register a route matching any HTTP method. */
  all!: (path: string, ...handlers: Handler[]) => this;

  constructor() {
    // Dynamically assign route registration methods
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach(method => {
      this[method] = (arg1: string | Handler, ...args: Handler[]) => {
        if (typeof arg1 === 'string') {
          this.#path = arg1;
        } else {
          this.#addRoute(method, this.#path, arg1);
        }
        args.forEach(handler => this.#addRoute(method, this.#path, handler));
        return this as any;
      };
    });
    // --- dynamic router assignment ---
    this.router = new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()],
    });
  }

  /**
   * Register a route for one or more HTTP methods and paths.
   *
   * @param method - A single method or an array of methods (e.g. `'get'`, `'post'`).
   * @param path - A single path or an array of paths.
   * @param handlers - One or more handlers to attach.
   * @returns This router instance (for chaining).
   *
   * @example
   * ```ts
   * router.on(['get', 'post'], ['/user', '/account'], handler);
   * ```
   */
  on = (method: string | string[], path: string | string[], ...handlers: Handler[]) => {
    for (const p of [path].flat()) {
      this.#path = p;
      for (const m of [method].flat()) {
        handlers.forEach(handler => this.#addRoute(m.toUpperCase(), this.#path, handler));
      }
    }
    return this;
  };

  /**
   * Registers middleware handlers.
   * Works similarly to `app.use()` in Express.
   *
   * - If called with a path: attaches handlers only for that path.
   * - If called without a path: applies globally to all requests.
   *
   * @param arg1 - Path string or the first handler function.
   * @param handlers - Additional handler functions.
   * @returns This router instance.
   *
   * @example
   * ```ts
   * router.use(authMiddleware);
   * router.use('/api', apiMiddleware);
   * ```
   */
  use = (arg1: string | Handler, ...handlers: Handler[]) => {
    if (typeof arg1 === 'string') {
      this.#path = arg1;
    } else {
      this.#path = '*';
      handlers.unshift(arg1);
    }
    handlers.forEach(handler => this.#addRoute(METHOD_NAME_ALL, this.#path, handler));
    return this;
  };

  /**
   * Mounts another `Router` instance at a given path prefix.
   *
   * This allows modular route composition (similar to Express `.use('/api', router)`).
   *
   * @param path - Path prefix at which to mount the sub-router.
   * @param router - Another Router instance to mount.
   * @returns This router instance.
   *
   * @example
   * ```ts
   * const api = new Router();
   * api.get('/user', (req, res) => res.send('user'));
   *
   * const app = new Router();
   * app.route('/api', api); // Mounts as /api/user
   * ```
   */
  route(path: string, router: Router): this {
    if (router === this) throw new Error('Cannot mount router onto itself');
    const base = mergePath(this.#basePath, path);
    router.routes.map(r => {
      this.#addRoute(r.method, mergePath(base, r.path), r.handler);
    });

    return this;
  }

  /**
   * Internal method that registers a route into the internal matcher.
   */
  #addRoute(method: string, path: string, handler: Handler): this {
    method = method.toUpperCase();
    const fullPath = mergePath(this.#basePath, path);

    const route: RouterRoute = {
      basePath: this.#basePath,
      path: fullPath,
      method,
      handler,
    };

    this.router.add(method, path, [handler, route]);
    this.routes.push(route);

    return this;
  }

  /**
   * Lazily attaches `req.params` and `req.param()` helpers to a request object.
   */
  #attachParams(req: any, result: any) {
    if (req._param) return; // Already attached

    const instance = new Param(req, result);
    req._param = instance;

    const parentParams = req.params ? {...req.params} : {};

    Object.defineProperty(req, 'params', {
      configurable: true,
      enumerable: true,
      get() {
        const local = instance.params();
        return Object.keys(parentParams).length ? {...parentParams, ...local} : local;
      },
      set(value) {
        Object.defineProperty(req, 'params', {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      },
    });

    req.param = (key: string) => instance.param(key) ?? parentParams[key];
  }

  /**
   * Express-compatible middleware that dispatches incoming requests.
   *
   * @remarks
   * Matches the incoming request against registered routes,
   * attaches `req.params` dynamically, and invokes matched handlers.
   * Falls back to `next()` if no route matches.
   *
   * @example
   * ```ts
   * const app = express();
   * const api = new Router();
   *
   * api.get('/ping', (req, res) => res.send('pong'));
   *
   * app.use(api.dispatch);
   * ```
   */
  dispatch: RequestHandler = (req, res, next) => {
    try {
      const path = req.path || req.url;
      const method = req.method === 'HEAD' ? 'GET' : req.method;
      const result = this.router.match(method, path);

      // Attach a default req.valid() if not already present
      if (typeof req.valid !== 'function') {
        req.valid = (t: any) => {
          throw new HttpError(501, {
            code: 'INTERNAL_SERVER_ERROR',
            message: `Request validation for '${t}' was not run. Use validator.${t === 'all' ? 'all()' : t + '()'} middleware first.`,
          });
        };
      }

      // No match found → delegate to next middleware
      if (!result || !result[0]?.length) return next();

      // Attach params (lazy + inherited)
      this.#attachParams(req, result);

      const handlers = result[0];

      // Single handler optimization
      if (handlers.length === 1) {
        const handler = handlers[0][0][0];
        (req as any).routeIndex = 0;
        try {
          const maybePromise = handler(req as any, res, next);
          if (maybePromise instanceof Promise) maybePromise.then(v => handleResult(v, res)).catch(next);
          else handleResult(maybePromise, res);
        } catch (err) {
          next(err);
        }
        return;
      }

      // Multiple handlers → compose middleware stack
      compose(handlers)(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Extends the Express `Request` interface with a typed `param()` helper.
 */
declare module 'express-serve-static-core' {
  interface Request {
    /**
     * Retrieves a route parameter by name.
     *
     * @example
     * ```ts
     * app.get('/user/:id', (req, res) => {
     *   const userId = req.param('id');
     * });
     * ```
     */
    param: (key: string) => string | undefined;
  }
}
