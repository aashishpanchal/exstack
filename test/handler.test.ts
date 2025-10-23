import express from 'express';
import request from 'supertest';
import {describe, expect, it, beforeEach} from 'vitest';
import {handler, ApiRes, HttpError, errorHandler} from '../src';

describe('handler', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
  });

  it('should handle a simple string return', async () => {
    app.get(
      '/test',
      handler(() => 'ok'),
    );
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('should handle a JSON object return', async () => {
    app.get(
      '/test',
      handler(() => ({a: 1})),
    );
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({a: 1});
  });

  it('should handle an ApiRes return', async () => {
    app.get(
      '/test',
      handler(() => ApiRes.ok({a: 1}, 'test')),
    );
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body.result).toEqual({a: 1});
    expect(res.body.message).toBe('test');
  });

  it('should handle an async handler', async () => {
    app.get(
      '/test',
      handler(async () => {
        return Promise.resolve('ok');
      }),
    );
    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('should handle sync errors', async () => {
    app.get(
      '/test',
      handler(() => {
        throw new HttpError(400, {message: 'test error'});
      }),
    );
    app.use(errorHandler());

    const res = await request(app).get('/test');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('test error');
  });

  it('should handle async errors', async () => {
    app.get(
      '/test',
      handler(async () => {
        throw new HttpError(400, {message: 'test error'});
      }),
    );
    app.use(errorHandler());

    const res = await request(app).get('/test');
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('test error');
  });
});
