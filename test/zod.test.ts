import * as z from 'zod';
import {describe, it, expect, vi, beforeEach} from 'vitest';
import {validator} from '../src/zod';
import {HttpError} from '../src';

describe('Validator middleware', () => {
  const next = vi.fn();

  function createReq(resOverrides?: any) {
    return {...resOverrides};
  }

  beforeEach(() => {
    next.mockReset();
  });

  describe('body()', () => {
    it('should validate body and attach validated data', () => {
      const schema = z.object({name: z.string(), age: z.number()});
      const req = createReq({body: {name: 'Alice', age: 25}});

      validator.body(schema)(req, {} as any, next);

      expect(req._validated.body).toEqual({name: 'Alice', age: 25});
      expect(req.valid('body')).toEqual({name: 'Alice', age: 25});
      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with HttpError on invalid body', () => {
      const schema = z.object({name: z.string(), age: z.number()});
      const req = createReq({body: {name: 'Alice', age: '25'}}); // invalid type

      validator.body(schema)(req, {} as any, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(HttpError);
      expect(next.mock.calls[0][0].status).toBe(400);
    });
  });

  describe('query()', () => {
    it('should validate query parameters', () => {
      const schema = z.object({page: z.number()});
      const req = createReq({query: {page: 2}});

      validator.query(schema)(req, {} as any, next);

      expect(req._validated.query).toEqual({page: 2});
      expect(req.valid('query')).toEqual({page: 2});
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('params()', () => {
    it('should validate route params', () => {
      const schema = z.object({id: z.string()});
      const req = createReq({params: {id: 'abc'}});

      validator.params(schema)(req, {} as any, next);

      expect(req._validated.params).toEqual({id: 'abc'});
      expect(req.valid('params')).toEqual({id: 'abc'});
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('all()', () => {
    it('should validate multiple parts of the request', () => {
      const schema = {
        body: z.object({name: z.string()}),
        query: z.object({page: z.number()}),
        params: z.object({id: z.string()}),
      };

      const req = createReq({
        body: {name: 'Alice'},
        query: {page: 1},
        params: {id: 'abc'},
      });

      validator.all(schema)(req, {} as any, next);

      expect(req._validated.body).toEqual({name: 'Alice'});
      expect(req._validated.query).toEqual({page: 1});
      expect(req._validated.params).toEqual({id: 'abc'});

      expect(req.valid('body')).toEqual({name: 'Alice'});
      expect(req.valid('query')).toEqual({page: 1});
      expect(req.valid('params')).toEqual({id: 'abc'});

      expect(next).toHaveBeenCalledWith();
    });

    it('should call next with HttpError if any part fails', () => {
      const schema = {
        body: z.object({name: z.string()}),
        query: z.object({page: z.number()}),
      };

      const req = createReq({
        body: {name: 123}, // invalid
        query: {page: 1},
      });

      validator.all(schema)(req, {} as any, next);

      expect(next.mock.calls[0][0]).toBeInstanceOf(HttpError);
      expect(next.mock.calls[0][0].status).toBe(400);
    });
  });
});
