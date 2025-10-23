import {Request} from 'express';
import {tryDecode} from './utils';
import type {Result, RouterRoute, Handler} from '../types';

const tryDecodeURIComponent = (str: string) => tryDecode(str, decodeURIComponent);

export class Param {
  /** Cache of decoded parameter values to avoid redundant decoding operations. */
  #cache: Map<string, string> = new Map();

  constructor(
    private req: Request & {routeIndex: number},
    private matchResult: Result<[Handler, RouterRoute]>,
  ) {}

  /**
   * Retrieves the active route index for this request.
   */
  #routeIndex = (): number => this.req.routeIndex || 0;

  /**
   * Retrieves the decoded value of a specific route parameter by key.
   *
   * @param {string} key - The name of the route parameter.
   * @returns {string | undefined} The decoded parameter value, or `undefined` if not found.
   *
   * @example
   * ```ts
   * const userId = param.param('id');
   * ```
   */
  param = (key: string): string | undefined => {
    const routeIndex = this.#routeIndex();
    const paramKey = this.matchResult[0][routeIndex][1][key];
    const value = this.#getParamValue(paramKey);
    return value ? this.#decode(value) : value;
  };

  /**
   * Retrieves all decoded route parameters as a key-value record.
   *
   * @returns {Record<string, string>} An object mapping parameter names to decoded values.
   *
   * @example
   * ```ts
   * const allParams = param.params();
   * // => { id: '123', name: 'John' }
   * ```
   */
  params = (): Record<string, string> => {
    const routeIndex = this.#routeIndex();
    const decoded: Record<string, string> = {};
    const keys = Object.keys(this.matchResult[0][routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.matchResult[0][routeIndex][1][key]);
      if (value !== undefined) {
        decoded[key] = this.#decode(value);
      }
    }
    return decoded;
  };

  /**
   * Resolves the parameter value from the match result.
   */
  #getParamValue = (paramKey: any): string | undefined =>
    this.matchResult[1] ? this.matchResult[1][paramKey] : paramKey;

  /**
   * Decodes a URL-encoded parameter value and caches the result.
   */
  #decode = (value: string): string => {
    if (this.#cache.has(value)) return this.#cache.get(value)!;
    const decoded = value.includes('%') ? tryDecodeURIComponent(value) : value;
    this.#cache.set(value, decoded);
    return decoded;
  };
}
