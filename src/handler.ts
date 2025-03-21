import {ApiRes} from './api-res';
import type {Response} from 'express';
import type {Handler, Constructor, WrappedMethods, InputType} from './types';

/**
 * Processes the result of a route handler and sends the appropriate response.
 *
 * @param {unknown} result - The result of the handler, either an ApiRes instance or any other value.
 * @param {Response} res - The Express response object.
 */
const handleResult = (result: unknown, res: Response): void => {
  // Send status and JSON if result is ApiRes
  if (result instanceof ApiRes) result.toJson(res);
  // Send non-ApiRes result directly
  else if (result && result !== res) res.send(result);
};

/**
 * Wraps an async route handler to manage errors and response handling.
 *
 * @param {Handler} callback - The route handler, which can return a value or a Promise.
 * @returns {Handler} - A wrapped handler with error and result handling.
 *
 * @example
 * // without type
 * app.get('/example', handler(async () => await fetchData()));
 * // with body type
 * app.get('/example', handler<InputType<{name: string}>>(async req => await fetchData(req.body.name)));
 * // with param type
 * app.get('/example', handler<InputType<any, {name: string}>>(async req => await fetchData(req.param.name)));
 * // with query type
 * app.get('/example', handler<InputType<any, any, {name: string}>>(async req => await fetchData(req.query.name)));
 */
export const handler =
  <I extends InputType>(callback: Handler<I, any | Promise<any>>): Handler<I, Promise<void>> =>
  async (req, res, next) => {
    try {
      const result = callback(req, res, next);
      // Handle async results
      if (result instanceof Promise) await result.then(value => handleResult(value, res)).catch(next);
      // Handle sync results
      else handleResult(result, res);
    } catch (error) {
      next(error);
    }
  };

/**
 * @param clsOrInstance - The class constructor or an instance of the class.
 * @param args - The arguments for the class constructor.
 * @returns A proxied instance where all methods are wrapped with `async-handler`.
 *
 * @example
 * class MyClass {
 *   async myMethod() {
 *     return 'Hello, World!';
 *   }
 * }
 * const instance = proxyWrapper(MyClass);
 *
 * app.get("/", instance.myMethod)
 */
export const proxyWrapper: {
  /**
   * Wraps a class constructor in a Proxy, allowing all methods to be
   * automatically wrapped with `asyncHandler`.
   *
   * @param clsOrInstance - The class constructor.
   * @returns A proxied instance where all methods are wrapped with `asyncHandler`.
   *
   * @example
   * class MyClass {
   *   async myMethod() {
   *     return 'Hello, World!';
   *   }
   * }
   * const proxiedInstance = proxyWrapper(MyClass);
   * await proxiedInstance.myMethod(); // Automatically wrapped with asyncHandler
   */
  <T extends object>(clsOrInstance: Constructor<T>): WrappedMethods<T>;

  /**
   * Wraps an instance of a class in a Proxy, allowing all methods to be
   * automatically wrapped with `asyncHandler`.
   *
   * @param clsOrInstance - An instance of the class.
   * @returns A proxied instance where all methods are wrapped with `asyncHandler`.
   *
   * @example
   * class MyClass {
   *   async myMethod() {
   *     return 'Hello, World!';
   *   }
   * }
   * const instance = new MyClass();
   * const proxiedInstance = proxyWrapper(instance);
   * await proxiedInstance.myMethod(); // Automatically wrapped with asyncHandler
   */
  <T extends object>(clsOrInstance: T): WrappedMethods<T>;

  /**
   * Wraps a class constructor in a Proxy, allowing all methods to be
   * automatically wrapped with `asyncHandler`, with constructor arguments.
   *
   * @param clsOrInstance - The class constructor.
   * @param args - The arguments for the class constructor.
   * @returns A proxied instance where all methods are wrapped with `asyncHandler`.
   *
   * @example
   * class MyClass {
   *   constructor(private name: string) {}
   *   async greet() {
   *     return `Hello, ${this.name}!`;
   *   }
   * }
   * const proxiedInstance = proxyWrapper(MyClass, 'Alice');
   * await proxiedInstance.greet(); // Automatically wrapped with asyncHandler
   */
  <T extends object>(clsOrInstance: Constructor<T>, ...args: ConstructorParameters<Constructor<T>>): WrappedMethods<T>;
} = <T extends object>(
  clsOrInstance: Constructor<T> | T,
  ...args: ConstructorParameters<Constructor<T>> | []
): WrappedMethods<T> => {
  // Create an instance if clsOrInstance is a constructor
  const instance = typeof clsOrInstance === 'function' ? new clsOrInstance(...args) : clsOrInstance;

  return new Proxy(instance, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      return typeof value === 'function' ? handler(value.bind(target)) : value;
    },
    set() {
      throw new Error('Overriding methods and properties is not allowed.');
    },
  }) as WrappedMethods<T>;
};
