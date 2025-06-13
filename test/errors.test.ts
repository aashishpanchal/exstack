import {describe, expect, it, vi} from 'vitest';
import {
  HttpError,
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
  UnAuthorizedError,
  InternalServerError,
  ContentTooLargeError,
} from '../src/errors';
import {HttpStatus} from '../src/enums';

// Mock Express response object to simulate API response handling
const mockResponse = () => ({
  json: vi.fn().mockReturnThis(), // Mock `json` method
  status: vi.fn().mockReturnThis(), // Mock `status` method
});

describe('HttpError', () => {
  it('Should create an HttpError instance with correct properties', () => {
    // Create an HttpError instance
    const error = new HttpError(HttpStatus.BAD_REQUEST, {message: 'Invalid input'});

    // Verify the error properties
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(HttpStatus.BAD_REQUEST);
    expect(error.name).toBe('BadRequestError');
    expect(error.message).toBe('Invalid input');
    expect(error.body).toMatchObject({
      data: null, // Default value for `data`
      error: 'BadRequestError',
      status: HttpStatus.BAD_REQUEST,
      message: 'Invalid input',
    });
  });

  it('Should use default status 500 if no status is provided', () => {
    // Create an HttpError instance without a status code
    const error = new HttpError(undefined, {message: 'Server error'});

    // Check if it defaults to 500 (Internal Server Error)
    expect(error).toBeInstanceOf(HttpError);
    expect(error.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(error.name).toBe('InternalServerError');
  });

  it('Should correctly identify an HttpError instance', () => {
    const error = new HttpError(HttpStatus.BAD_REQUEST, {message: 'Test'});

    // Validate if the function correctly identifies an HttpError
    expect(HttpError.isHttpError(error)).toBe(true);
    expect(HttpError.isHttpError(new Error('Normal error'))).toBe(false);
  });

  it('Should return a correct JSON response when toJson is called', () => {
    const res = mockResponse();
    const error = new BadRequestError('Invalid request');

    // Call `toJson` method to simulate response behavior
    error.toJson(res as any);

    // Ensure `status` and `json` methods were called with expected values
    expect(res.json).toHaveBeenCalledWith(error.body);
    expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
  });

  it('Should include cause and data in the error body if provided', () => {
    const data = {field: 'email', issue: 'Invalid format'}; // Example error data
    const cause = new Error('Underlying issue'); // Underlying error cause
    const error = new BadRequestError('Validation error', {data, cause});

    // Verify error details including `cause` and `data`
    expect(error.options.cause).toBeInstanceOf(Error); // Ensure cause is an Error object
    expect(error.body).toMatchObject({
      data: expect.objectContaining(data), // Match error details
      error: 'BadRequestError',
      status: HttpStatus.BAD_REQUEST,
      message: 'Validation error',
    });
  });
});

// Tests for specific HttpError sub-classes
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
      // Instantiate the specific error class
      const error = new Class('Test error');
      // Validate error properties
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
