import {ApiRes, HttpStatus} from '../src';
import {describe, expect, it, vi} from 'vitest';

// Mock Express response object
const mockResponse = () => ({
  json: vi.fn().mockReturnThis(),
  status: vi.fn().mockReturnThis(),
});

describe('ApiRes', () => {
  /**
   * Verify default constructor values.
   * - result should be null
   * - status should be 200 (OK)
   * - message should be "Operation successful"
   */
  it('Should create an instance with default values', () => {
    const response = new ApiRes();

    expect(response.body).toEqual({
      result: null,
      status: HttpStatus.OK,
      message: 'Operation successful',
    });
  });

  /**
   * Verify instance creation with custom values.
   */
  it('Should create an instance with custom values', () => {
    const customResult = {data: 'Custom Data'};
    const customStatus = HttpStatus.CREATED;
    const customMessage = 'Custom success message';

    const response = new ApiRes(customResult, customStatus, customMessage);

    expect(response.body).toEqual({
      result: customResult,
      status: customStatus,
      message: customMessage,
    });
  });

  /**
   * Validate the structure of the response body getter.
   */
  it('Should return the correct JSON body format', () => {
    const response = new ApiRes('Sample Result', HttpStatus.OK, 'Sample message');

    expect(response.body).toEqual({
      result: 'Sample Result',
      status: HttpStatus.OK,
      message: 'Sample message',
    });
  });

  /**
   * Ensure toJson() sends the correct status and JSON body.
   */
  it('Should send JSON response using toJson()', () => {
    const res = mockResponse();
    const response = new ApiRes('Test Data', HttpStatus.OK, 'Success');

    response.toJson(res as any);

    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith(response.body);
  });

  /**
   * Validate static .ok() helper (200 OK).
   */
  it('Should create an OK (200) response using static method', () => {
    const response = ApiRes.ok('Success Data');

    expect(response.body).toEqual({
      result: 'Success Data',
      status: HttpStatus.OK,
      message: 'Request processed successfully',
    });
  });

  /**
   * Validate static .created() helper (201 Created).
   */
  it('Should create a Created (201) response using static method', () => {
    const response = ApiRes.created('Created Data');

    expect(response.body).toEqual({
      result: 'Created Data',
      status: HttpStatus.CREATED,
      message: 'Resource created successfully',
    });
  });

  /**
   * Validate static .paginated() helper.
   */
  it('Should create a paginated response using static method', () => {
    const paginatedData = ['item1', 'item2'];
    const meta = {total: 2, page: 1, limit: 10};

    const response = ApiRes.paginated(paginatedData, meta);

    expect(response.body).toEqual({
      result: {...meta, data: paginatedData},
      status: HttpStatus.OK,
      message: 'Data retrieved successfully',
    });
  });

  /**
   * Validate chainable setters .msg() and .data().
   */
  it('Should allow chainable setters (msg and data)', () => {
    const response = new ApiRes().msg('Updated message').data({hello: 'world'});

    expect(response.body).toEqual({
      result: {hello: 'world'},
      status: HttpStatus.OK,
      message: 'Updated message',
    });
  });

  /**
   * Validate cloning with a different status using .status().
   */
  it('Should clone with different status using static status()', () => {
    const response = ApiRes.status(HttpStatus.CREATED).data('New Data');

    expect(response.body).toEqual({
      result: 'New Data',
      status: HttpStatus.CREATED,
      message: 'Operation successful',
    });
  });
});
