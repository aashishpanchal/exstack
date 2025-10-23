import {match, emptyParam} from './match';
import {Trie, PATH_ERROR, type ParamAssocArray} from './algo';
import {METHOD_NAME_ALL, type ParamIndexMap, type Router} from '../../types';
import {MESSAGE_MATCHER_IS_ALREADY_BUILT, UnsupportedPathError} from '../errors';
import {buildWildcardRegExp, clearWildcardRegExpCache, checkOptionalParameter} from '../utils';
import type {HandlerData, StaticMap, Matcher, MatcherMap} from './match';

/** [handler, paramCount] used internally during route registration */
type HandlerWithMeta<T> = [T, number];

const nullMatcher: Matcher<any> = [/^$/, [], Object.create(null)];

/**
 * Utility function: find middleware handlers that match a given path.
 * Checks for longest matching wildcard pattern (e.g. `/api/*`).
 */
function findMiddleware<T>(
  middleware: Record<string, HandlerWithMeta<T>[]> | undefined,
  path: string,
): HandlerWithMeta<T>[] | undefined {
  if (!middleware) return undefined;

  // Sort keys by descending length for priority (longer = more specific)
  for (const key of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    const re = buildWildcardRegExp(key);
    if (re.test(path)) {
      return [...middleware[key]];
    }
  }
  return undefined;
}

/**
 * Build matcher from preprocessed route data.
 * This is where trie-based RegExp generation happens.
 */
function buildMatcherFromPreprocessedRoutes<T>(routes: [string, HandlerWithMeta<T>[]][]): Matcher<T> {
  const trie = new Trie();
  const handlerData: HandlerData<T>[] = [];
  if (routes.length === 0) {
    return nullMatcher;
  }

  const routesWithStaticPathFlag = routes
    .map(route => [!/\*|\/:/.test(route[0]), ...route] as [boolean, string, HandlerWithMeta<T>[]])
    .sort(([isStaticA, pathA], [isStaticB, pathB]) => (isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length));

  const staticMap: StaticMap<T> = Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, Object.create(null)]), emptyParam];
    } else {
      j++;
    }

    let paramAssoc: ParamAssocArray;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }

    if (pathErrorCheckOnly) {
      continue;
    }

    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap: ParamIndexMap = Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }

  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len = handlerData[i].length; j < len; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len = keys.length; k < len; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }

  const handlerMap: HandlerData<T>[] = [];
  // using `in` because indexReplacementMap is a sparse array
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }

  return [regexp, handlerMap, staticMap] as Matcher<T>;
}

/**
 * Main RegExpRouter implementation (Hono-like)
 */
export class RegExpRouter<T> implements Router<T> {
  name = 'RegExpRouter';
  #middleware?: Record<string, Record<string, HandlerWithMeta<T>[]>>;
  #routes?: Record<string, Record<string, HandlerWithMeta<T>[]>>;

  constructor() {
    this.#middleware = {[METHOD_NAME_ALL]: Object.create(null)};
    this.#routes = {[METHOD_NAME_ALL]: Object.create(null)};
  }

  /**
   * Add a new route or middleware handler.
   */
  add(method: string, path: string, handler: T): void {
    const middleware = this.#middleware;
    const routes = this.#routes;

    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }

    // Ensure method buckets exist (inherit ALL handlers)
    if (!middleware[method]) {
      [middleware, routes].forEach(map => {
        map[method] = Object.create(null);
        Object.keys(map.ALL).forEach(p => {
          map[method][p] = [...map.ALL[p]];
        });
      });
    }

    if (path === '/*') path = '*';

    const paramCount = (path.match(/\/:/g) || []).length;

    // Wildcard routes like /api/* or *
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);

      if (method === 'ALL') {
        Object.keys(middleware).forEach(m => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware.ALL, path) || [];
        });
      } else {
        middleware[method][path] ||=
          findMiddleware(middleware[method], path) || findMiddleware(middleware.ALL, path) || [];
      }

      // Attach handler to all matching paths
      Object.keys(middleware).forEach(m => {
        if (method === 'ALL' || m === method) {
          Object.keys(middleware[m]).forEach(p => {
            if (re.test(p)) middleware[m][p].push([handler, paramCount]);
          });
        }
      });

      Object.keys(routes).forEach(m => {
        if (method === 'ALL' || m === method) {
          Object.keys(routes[m]).forEach(p => {
            if (re.test(p)) routes[m][p].push([handler, paramCount]);
          });
        }
      });

      return;
    }

    // Optional parameters (expand into multiple paths)
    const paths = checkOptionalParameter(path) || [path];

    for (let i = 0; i < paths.length; i++) {
      const currentPath = paths[i];
      Object.keys(routes).forEach(m => {
        if (method === 'ALL' || m === method) {
          routes[m][currentPath] ||= [
            ...(findMiddleware(middleware[m], currentPath) || findMiddleware(middleware.ALL, currentPath) || []),
          ];
          routes[m][currentPath].push([handler, paramCount - paths.length + i + 1]);
        }
      });
    }
  }

  /**
   * Lazily built match() method (defined in ./match.ts)
   */
  match: typeof match<Router<T>, T> = match;

  /**
   * Build all matchers (called internally on first match()).
   */
  protected buildAllMatchers(): MatcherMap<T> {
    const matchers: MatcherMap<T> = Object.create(null);
    Object.keys(this.#routes!)
      .concat(Object.keys(this.#middleware!))
      .forEach(method => {
        matchers[method] ||= this.buildMatcher(method);
      });
    // Release cache
    this.#middleware = this.#routes = undefined;
    clearWildcardRegExpCache();
    return matchers;
  }

  /**
   * Build matcher for a specific HTTP method.
   */
  private buildMatcher(method: string): Matcher<T> | null {
    const routes: [string, HandlerWithMeta<T>[]][] = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware!, this.#routes!].forEach(r => {
      const ownRoute = r[method] ? Object.keys(r[method]).map(path => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...(ownRoute as [string, HandlerWithMeta<T>[]][]));
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...(Object.keys(r[METHOD_NAME_ALL]).map(path => [path, r[METHOD_NAME_ALL][path]]) as [
            string,
            HandlerWithMeta<T>[],
          ][]),
        );
      }
    });

    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
}
