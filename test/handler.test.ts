import {handler, ApiRes} from '../src';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import type {Response, NextFunction, Request} from 'express';

/**
 * Utility: Creates a minimal mock of Express's `Response` object
 * using Vitest spies. Each method is chainable by returning `this`.
 */
const createMockResponse = (): Partial<Response> => ({
  send: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
});

describe('Handler Utility', () => {
  let res: Partial<Response>;
  let next: NextFunction;
  let req: Partial<Request>;

  /**
   * Runs before each test — resets mocks to ensure test isolation.
   */
  beforeEach(() => {
    res = createMockResponse();
    next = vi.fn();
    req = {body: {name: 'Alice'}, query: {}, params: {}};
  });

  /**
   * TEST CASE #1
   * Validates that the handler correctly processes
   * a synchronous route handler that returns an ApiRes instance.
   */
  it('should handle a synchronous route handler correctly', () => {
    // Arrange
    const func = vi.fn().mockReturnValue(new ApiRes('Success'));
    const wrappedHandler = handler(func);

    // Act
    wrappedHandler(req as Request, res as Response, next);

    // Assert: ensure the route logic received proper arguments
    expect(func).toHaveBeenCalledWith({
      req,
      res,
      next,
      body: {name: 'Alice'},
      query: {},
      param: {},
    });

    // Assert: ensure the standardized API response is sent
    expect(res.json).toHaveBeenCalledWith({
      status: 200,
      message: 'Operation successful',
      result: 'Success',
    });
  });

  /**
   * TEST CASE #2
   * Ensures async route handlers returning ApiRes
   * are properly awaited and their results serialized to JSON.
   */
  it('should handle an asynchronous route handler correctly', async () => {
    // Arrange
    const func = vi.fn().mockResolvedValue(new ApiRes('Async Success'));
    const wrappedHandler = handler(func);

    // Act
    await wrappedHandler(req as Request, res as Response, next);

    // Assert: ensure parameters were passed to the wrapped function
    expect(func).toHaveBeenCalledWith({
      req,
      res,
      next,
      body: {name: 'Alice'},
      query: {},
      param: {},
    });

    // Assert: verify the JSON response structure and content
    expect(res.json).toHaveBeenCalledWith({
      status: 200,
      message: 'Operation successful',
      result: 'Async Success',
    });
  });

  /**
   * TEST CASE #3
   * Confirms that errors in async handlers are caught
   * and passed to Express's `next()` error handler.
   */
  it('should call next with an error when an async handler throws', () => {
    return new Promise<void>(resolve => {
      // Arrange
      const error = new Error('Test Error');
      const func = vi.fn().mockRejectedValue(error);
      const wrappedHandler = handler(func);

      // Mock next to resolve the promise when called
      const mockNext = vi.fn(err => {
        expect(err).toBe(error);
        expect(res.json).not.toHaveBeenCalled();
        resolve();
      });

      // Act
      wrappedHandler(req as Request, res as Response, mockNext);
    });
  });
});
