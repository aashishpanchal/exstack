import {ApiRes} from '../src/api-res';
import {describe, it, expect, vi} from 'vitest';
import {handler, proxyWrapper} from '../src/handler';

// Mock Express request, response, and next function
const mockResponse = () => ({
  send: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
});
const mockNext = vi.fn();

describe('Handler', () => {
  it('Should handle a synchronous route handler correctly', () => {
    const req = {}; // Mock request object
    const res = mockResponse();
    const func = vi.fn().mockReturnValue(new ApiRes('Success'));

    // Wrap function with handler
    const wrappedHandler = handler(func);
    wrappedHandler(req as any, res as any, mockNext);

    // Check expectations
    expect(func).toHaveBeenCalledWith(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({status: 200, message: 'Operation successful', result: 'Success'});
  });

  it('Should handle an asynchronous route handler correctly', async () => {
    const res = mockResponse();
    const req = {};
    const func = vi.fn().mockResolvedValue(new ApiRes('Async Success'));

    const wrappedHandler = handler(func);
    await wrappedHandler(req as any, res as any, mockNext);

    expect(func).toHaveBeenCalledWith(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({status: 200, message: 'Operation successful', result: 'Async Success'});
  });

  it('Should call next with error on async failure', async () => {
    const req = {};
    const res = mockResponse();
    const error = new Error('Test Error');
    const func = vi.fn().mockRejectedValue(error); // Throw error on runtime

    const wrappedHandler = handler(func);
    await wrappedHandler(req as any, res as any, mockNext);
    // Check next have error or not
    expect(mockNext).toHaveBeenCalledWith(error);
  });
});

describe('ProxyWrapper Handler', () => {
  class TestClass {
    async successMethod() {
      return new ApiRes('Wrapped Success');
    }
    async failureMethod() {
      throw new Error('Wrapped Error');
    }
  }

  it('Should wrap a class method and handle successful response', async () => {
    const res = mockResponse();
    const instance = proxyWrapper(TestClass);

    await instance.successMethod({} as any, res as any, mockNext);

    expect(res.json).toHaveBeenCalledWith({status: 200, message: 'Operation successful', result: 'Wrapped Success'});
  });

  it('Should pass error to next on method failure', async () => {
    const res = mockResponse();
    const instance = proxyWrapper(TestClass);

    await instance.failureMethod({} as any, res as any, mockNext);

    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});
