import {describe, expect, it, vi} from 'vitest';
import {
  HttpError,
  HttpStatus,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  UnAuthorizedError,
  InternalServerError,
  ContentTooLargeError,
} from '../src';

// Mock Express response
const mockResponse = () => ({
  json: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
});

describe('HttpError', () => {
  // Test basic HttpError properties and body structure.
  it('Should create an HttpError instance with correct properties', () => {
    const error = new HttpError(HttpStatus.BAD_REQUEST, {message: 'Invalid input'});

    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(HttpStatus.BAD_REQUEST);
    expect(error.name).toBe('BadRequestError');
    expect(error.message).toBe('Invalid input');
    expect(error.body).toMatchObject({
      data: null,
      error: 'BadRequestError',
      status: HttpStatus.BAD_REQUEST,
      message: 'Invalid input',
    });
  });

  // Should default to 500 InternalServerError if status is omitted.
  it('Should use default status 500 if no status is provided', () => {
    const error = new HttpError(undefined, {message: 'Server error'});
    expect(error.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(error.name).toBe('InternalServerError');
  });

  // Test type guard HttpError.isHttpError.
  it('Should correctly identify an HttpError instance', () => {
    const error = new HttpError(HttpStatus.BAD_REQUEST, {message: 'Test'});
    expect(HttpError.isHttpError(error)).toBe(true);
    expect(HttpError.isHttpError(new Error('Normal error'))).toBe(false);
  });

  // Test sending JSON via toJson().
  it('Should return a correct JSON response when toJson is called', () => {
    const res = mockResponse();
    const error = new BadRequestError('Invalid request');
    error.toJson(res as any);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(res.json).toHaveBeenCalledWith(error.body);
  });

  // Test inclusion of data and cause in the error body.
  it('Should include cause and data in the error body if provided', () => {
    const data = {field: 'email', issue: 'Invalid format'};
    const cause = new Error('Underlying issue');
    const error = new BadRequestError('Validation error', {data, cause});

    expect(error.options.cause).toBeInstanceOf(Error);
    expect(error.body).toMatchObject({
      data: expect.objectContaining(data),
      error: 'BadRequestError',
      status: HttpStatus.BAD_REQUEST,
      message: 'Validation error',
    });
  });
});

// Tests for specific HttpError subclasses
describe('HttpError Sub-Classes', () => {
  const testCases = [
    {Class: ConflictError, status: HttpStatus.CONFLICT, name: 'ConflictError'},
    {Class: NotFoundError, status: HttpStatus.NOT_FOUND, name: 'NotFoundError'},
    {Class: ForbiddenError, status: HttpStatus.FORBIDDEN, name: 'ForbiddenError'},
    {Class: BadRequestError, status: HttpStatus.BAD_REQUEST, name: 'BadRequestError'},
    {Class: UnAuthorizedError, status: HttpStatus.UNAUTHORIZED, name: 'UnauthorizedError'},
    {Class: InternalServerError, status: HttpStatus.INTERNAL_SERVER_ERROR, name: 'InternalServerError'},
    {Class: ContentTooLargeError, status: HttpStatus.PAYLOAD_TOO_LARGE, name: 'PayloadTooLargeError'},
  ];

  testCases.forEach(({Class, status, name}) => {
    it(`Should create an instance of ${name} with correct status`, () => {
      const error = new Class('Test error');
      expect(error).toBeInstanceOf(Class);
      expect(error.name).toBe(name);
      expect(error.status).toBe(status);
      expect(error.body).toMatchObject({
        status,
        error: name,
        message: 'Test error',
      });
    });
  });
});
