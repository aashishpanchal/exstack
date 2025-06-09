import {HttpError} from '../src/errors';
import {HttpStatus} from '../src/enums';
import {describe, expect, it, vi} from 'vitest';
import {errorHandler, makePermission} from '../src/utils';
import type {Request, NextFunction} from 'express';

// Mocked Express response object to simulate HTTP responses
const mockResponse = () => ({
  status: vi.fn().mockReturnThis(), // Mock status method
  json: vi.fn().mockReturnThis(), // Mock JSON method
});

describe('ErrorHandler', () => {
  it('Should correctly handle HttpError instances', () => {
    const res = mockResponse();
    const err = new HttpError(HttpStatus.BAD_REQUEST, {message: 'Invalid request'});
    const logger = vi.fn();

    // Call the error handler
    errorHandler(true, logger)(err, {} as Request, res as any, {} as NextFunction);

    // Expect the response to have been set with correct status and JSON output
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(err.body);
  });

  it('Should log the cause of an HttpError if provided', () => {
    const res = mockResponse();
    const cause = new Error('Database connection failed');
    const err = new HttpError(HttpStatus.INTERNAL_SERVER_ERROR, {message: 'Server issue', cause});
    const logger = vi.fn();

    // Call the error handler
    errorHandler(true, logger)(err, {} as Request, res as any, {} as NextFunction);

    // Expect the logger to have been called with the cause
    expect(logger).toHaveBeenCalledWith(cause);
  });

  it('Should handle unknown errors gracefully', () => {
    const res = mockResponse();
    const err = new Error('Unexpected failure');
    const logger = vi.fn();

    // Call the error handler
    errorHandler(true, logger)(err, {} as Request, res as any, {} as NextFunction);

    // Expect the logger to log the unknown error
    expect(logger).toHaveBeenCalledWith(err);

    // Expect the response to return a standard error structure
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

describe('MakePermission', () => {
  it('Should correctly generate permission mappings', () => {
    const permissions = makePermission({
      actions: ['create', 'read'] as const,
      subjects: ['user', 'post'] as const,
    });

    // Expect the generated permissions to match expected values
    expect(permissions).toEqual({
      USER_READ: 'user:read',
      USER_CREATE: 'user:create',
      POST_READ: 'post:read',
      POST_CREATE: 'post:create',
    });
  });

  it('Should correctly apply action filters for subjects', () => {
    const permissions = makePermission({
      actions: ['create', 'read', 'update'] as const,
      subjects: ['user', 'post'] as const,
      filter: {
        user: ['read'], // Only 'read' allowed for 'user'
        post: ['create', 'update'], // Only 'create' and 'update' for 'post'
      },
    });

    // Expect only allowed actions to be present
    expect(permissions).toEqual({
      USER_READ: 'user:read',
      POST_CREATE: 'post:create',
      POST_UPDATE: 'post:update',
    });
  });

  it('Should return an empty object when given no actions or subjects', () => {
    const permissions = makePermission({
      actions: [] as const,
      subjects: [] as const,
    });

    // Expect no permissions to be generated
    expect(permissions).toEqual({});
  });
});
