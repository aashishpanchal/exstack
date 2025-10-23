import express from 'express';
import request from 'supertest';
import {Router, handler, ApiRes} from '../src';
import {describe, expect, it, beforeEach, vi} from 'vitest';

describe('Router', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
  });

  it('should handle basic GET request', async () => {
    const router = new Router();
    router.get(
      '/test',
      handler(() => 'ok'),
    );
    app.use(router.dispatch);

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.text).toBe('ok');
  });

  it('should handle POST request with JSON body', async () => {
    const router = new Router();
    app.use(express.json());
    router.post(
      '/test',
      handler(req => ApiRes.ok(req.body)),
    );
    app.use(router.dispatch);

    const res = await request(app).post('/test').send({name: 'test'});
    expect(res.status).toBe(200);
    expect(res.body.result).toEqual({name: 'test'});
  });

  it('should handle route with params', async () => {
    const router = new Router();
    router.get(
      '/users/:id',
      handler(req => {
        return {id: req.params.id};
      }),
    );
    app.use(router.dispatch);

    const res = await request(app).get('/users/123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({id: '123'});
  });

  it('should handle middleware', async () => {
    const router = new Router();
    const middleware = vi.fn((req, res, next) => {
      (req as any).user = 'test';
      next();
    });

    router.use(middleware);
    router.get(
      '/test',
      handler(req => {
        return {user: (req as any).user};
      }),
    );
    app.use(router.dispatch);

    const res = await request(app).get('/test');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({user: 'test'});
    expect(middleware).toHaveBeenCalled();
  });

  it('should handle sub-router', async () => {
    const router = new Router();
    const subRouter = new Router();

    subRouter.get(
      '/sub',
      handler(() => 'sub'),
    );
    router.route('/main', subRouter);

    app.use(router.dispatch);

    const res = await request(app).get('/main/sub');
    expect(res.status).toBe(200);
    expect(res.text).toBe('sub');
  });
});
