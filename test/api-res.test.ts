import {ApiRes} from '../src/api-res';
import {HttpStatus} from '../src/enums';
import {describe, expect, it, vi} from 'vitest';

// Mock Express response object to simulate API response behavior
const mockResponse = () => ({
  json: vi.fn().mockReturnThis(), // Mock the .json() method
  status: vi.fn().mockReturnThis(), // Mock the .status() method
});

describe('ApiRes', () => {
  it('Should create an instance with default values', () => {
    // Create an instance of ApiRes without passing parameters
    const response = new ApiRes();

    // Validate that the default values are set correctly
    expect(response.result).toEqual({}); // Default result should be an empty object
    expect(response.status).toBe(HttpStatus.OK); // Default status should be 200 (OK)
    expect(response.message).toBe('Operation successful'); // Default message should be set
  });

  it('Should create an instance with custom values', () => {
    // Custom values for testing
    const customResult = {data: 'Custom Data'};
    const customStatus = HttpStatus.CREATED; // 201 Created
    const customMessage = 'Custom success message';

    // Create an instance of ApiRes with custom values
    const response = new ApiRes(customResult, customStatus, customMessage);

    // Validate that the properties match the provided values
    expect(response.status).toBe(customStatus);
    expect(response.message).toBe(customMessage);
    expect(response.result).toEqual(customResult);
  });

  it('Should return the correct JSON body format', () => {
    // Test instance with sample data
    const response = new ApiRes('Sample Result', HttpStatus.OK, 'Sample message');

    // Validate the response body structure
    expect(response.body).toEqual({
      result: 'Sample Result',
      status: HttpStatus.OK,
      message: 'Sample message',
    });
  });

  it('Should send JSON response using toJson()', () => {
    const res = mockResponse(); // Mock response object
    const response = new ApiRes('Test Data', HttpStatus.OK, 'Success');

    // Call toJson() to send response
    response.toJson(res as any);

    // Validate that the response is sent with correct status and JSON body
    expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(res.json).toHaveBeenCalledWith(response.body);
  });

  it('Should create an OK (200) response using static method', () => {
    // Use the static ok() method
    const response = ApiRes.ok('Success Data');

    // Validate the response properties
    expect(response.status).toBe(HttpStatus.OK);
    expect(response.message).toBe('Request processed successfully');
    expect(response.result).toBe('Success Data');
  });

  it('Should create a Created (201) response using static method', () => {
    // Use the static created() method
    const response = ApiRes.created('Created Data');

    // Validate the response properties
    expect(response.status).toBe(HttpStatus.CREATED);
    expect(response.message).toBe('Resource created successfully');
    expect(response.result).toBe('Created Data');
  });

  it('Should create a paginated response using static method', () => {
    const paginatedData = ['item1', 'item2'];
    const meta = {total: 2, page: 1, limit: 10};

    // Use the static paginated() method
    const response = ApiRes.paginated(paginatedData, meta);

    // Validate the response properties
    expect(response.status).toBe(HttpStatus.OK);
    expect(response.message).toBe('Data retrieved successfully');
    expect(response.result).toEqual({data: paginatedData, ...meta});
  });
});
