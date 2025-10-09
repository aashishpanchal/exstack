import {describe, expect, it, vi} from 'vitest';
import type {Request, NextFunction} from 'express';
import {errorHandler, HttpError, HttpStatus} from '../src';

/**
 * Mock Express response object for testing HTTP responses.
 */
const mockResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis(),
});

describe('ErrorHandler', () => {
  /**
   * Test handling of HttpError instances.
   * - Should respond with the correct HTTP status and JSON body.
   */
  it('Should correctly handle HttpError instances', () => {
    const res = mockResponse();
    const err = new HttpError(HttpStatus.BAD_REQUEST, {message: 'Invalid request'});
    const logger = vi.fn();

    errorHandler(true, logger)(err, {} as Request, res as any, {} as NextFunction);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(err.body);
  });

  /**
   * Test logging of the cause property in HttpError.
   * - If an HttpError has a `cause`, the logger should receive it.
   */
  it('Should log the cause of an HttpError if provided', () => {
    const res = mockResponse();
    const cause = new Error('Database connection failed');
    const err = new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, {message: 'Server issue', cause});
    const logger = vi.fn();

    errorHandler(true, logger)(err, {} as Request, res as any, {} as NextFunction);

    expect(logger).toHaveBeenCalledWith(cause);
  });

  /**
   * Test handling of unknown (non-HttpError) errors.
   * - Should log the error.
   * - Should return a standard HTTP 500 InternalServerError response.
   */
  it('Should handle unknown errors gracefully', () => {
    const res = mockResponse();
    const err = new Error('Unexpected failure');
    const logger = vi.fn();

    errorHandler(true, logger)(err, {} as Request, res as any, {} as NextFunction);

    expect(logger).toHaveBeenCalledWith(err);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'InternalServerError',
        message: 'Unexpected failure',
      }),
    );
  });
});
