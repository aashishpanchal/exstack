/**
 * 🚀 EXPRESS vs FASTROUTER — FULL PRODUCTION BENCHMARK SUITE
 * ----------------------------------------------------------
 * Includes:
 *  - Route match / middleware / nested / params / multi / wildcard / async
 *  - 10K route stress test
 *  - Cold start registration
 *  - Memory footprint analysis
 */

import {performance} from 'node:perf_hooks';
import {Router as FastRouter} from 'exstack';
import {Router as ExpressRouter} from 'express';

/* -------------------------------------------------------------------------- */
/* 🧰 Helpers                                                                 */
/* -------------------------------------------------------------------------- */

function createMockReqRes(path: string, method = 'GET') {
  const req: any = {method, path, url: path, params: {}};
  const res: any = {send() {}, json() {}, end() {}};
  return {req, res};
}

function measure(name: string, fn: () => void, iterations = 10_000) {
  for (let i = 0; i < 2000; i++) fn(); // warm-up
  if (global.gc) global.gc();
  const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
  const t1 = performance.now();
  for (let i = 0; i < iterations; i++) fn();
  const t2 = performance.now();
  const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;

  const ms = t2 - t1;
  const ops = iterations / (ms / 1000);

  console.log(
    `${name.padEnd(35)} ⏱️ ${ms.toFixed(2)}ms | ⚙️ ${ops.toFixed(0)} ops/s | 🧠 Δ${(memAfter - memBefore).toFixed(
      2,
    )}MB`,
  );
  return ms;
}

/* -------------------------------------------------------------------------- */
/* 🧩 Router Setup                                                            */
/* -------------------------------------------------------------------------- */

function createExpressRouter() {
  const router = ExpressRouter();

  for (let i = 0; i < 100; i++)
    router.get(`/user/${i}`, (req, res) => {
      res.send(`user-${i}`);
    });

  router.use((req, res, next) => next());
  router.use('/api', (req, res, next) => next());

  const api = ExpressRouter();
  api.get('/nested', (req, res) => {
    res.send('nested');
  });
  api.get('/items/:itemId', (req, res) => {
    res.send(req.params);
  });
  router.use('/api/:version', api);

  router.get(
    '/multi/:id',
    (req, res, next) => {
      (req as any)._x = 1;
      next();
    },
    (req, res, next) => {
      (req as any)._y = 2;
      next();
    },
    (req, res) => {
      res.send(`sum:${(req as any)._x + (req as any)._y}`);
    },
  );

  router.use('/wild/*splat', (req, res) => {
    res.send('wild');
  });
  return router;
}

function createFastRouter() {
  const router = new FastRouter();

  for (let i = 0; i < 100; i++) router.get(`/user/${i}`, (req, res) => res.send(`user-${i}`));

  router.use((req, res, next) => next());
  router.use('/api', (req, res, next) => next());

  const api = new FastRouter();
  api.get('/nested', (req, res) => res.send('nested'));
  api.get('/items/:itemId', (req, res) => res.send(req.params));
  router.route('/api/:version', api);

  router.get(
    '/multi/:id',
    (req, res, next) => {
      (req as any)._x = 1;
      next();
    },
    (req, res, next) => {
      (req as any)._y = 2;
      next();
    },
    (req, res) => res.send(`sum:${(req as any)._x + (req as any)._y}`),
  );

  router.use('/wild/*', (req, res) => res.send('wild'));
  router.get('/async/:id', async (req, res) => {
    await new Promise(r => setTimeout(r, 1));
    res.send(`async-${req.param('id')}`);
  });

  return router;
}

/* -------------------------------------------------------------------------- */
/* 🧭 Benchmark Run                                                           */
/* -------------------------------------------------------------------------- */

console.log('\n=============================================');
console.log('🚀 EXPRESS vs FASTROUTER — FULL BENCHMARK SUITE');
console.log('===============================================');

const expressRouter = createExpressRouter();
const fastRouter = createFastRouter();

const mocks = {
  route: createMockReqRes('/user/50'),
  nested: createMockReqRes('/api/v1/nested'),
  param: createMockReqRes('/api/v1/items/77'),
  multi: createMockReqRes('/multi/123'),
  wild: createMockReqRes('/wild/test/path'),
  async: createMockReqRes('/async/42'),
  mid: createMockReqRes('/api/any'),
};

/* -------------------------------------------- */
/* 📊 Runtime Performance Tests                 */
/* ---------------------------------------------*/

console.log('\n📊 Runtime (Dispatch) Performance');
const results = [
  measure('Express - Route Match', () => (expressRouter as any).handle(mocks.route.req, mocks.route.res, () => {})),
  measure('FastRouter - Route Match', () => fastRouter.dispatch(mocks.route.req, mocks.route.res, () => {})),

  measure('Express - Middleware', () => (expressRouter as any).handle(mocks.mid.req, mocks.mid.res, () => {})),
  measure('FastRouter - Middleware', () => fastRouter.dispatch(mocks.mid.req, mocks.mid.res, () => {})),

  measure('Express - Nested', () => (expressRouter as any).handle(mocks.nested.req, mocks.nested.res, () => {})),
  measure('FastRouter - Nested', () => fastRouter.dispatch(mocks.nested.req, mocks.nested.res, () => {})),

  measure('Express - Params', () => (expressRouter as any).handle(mocks.param.req, mocks.param.res, () => {})),
  measure('FastRouter - Params', () => fastRouter.dispatch(mocks.param.req, mocks.param.res, () => {})),

  measure('Express - Wildcard', () => (expressRouter as any).handle(mocks.wild.req, mocks.wild.res, () => {})),
  measure('FastRouter - Wildcard', () => fastRouter.dispatch(mocks.wild.req, mocks.wild.res, () => {})),

  measure('Express - Async', () => (expressRouter as any).handle(mocks.async.req, mocks.async.res, () => {})),
  measure('FastRouter - Async', () => fastRouter.dispatch(mocks.async.req, mocks.async.res, () => {})),
];

/* -------------------------------------------- */
/* 🧱 Cold Start (Route Registration)           */
/* -------------------------------------------- */

console.log('\n📊 Cold Start (Registration) Benchmark');
function registerMany(fn: (i: number) => void, count = 10000) {
  const start = performance.now();
  for (let i = 0; i < count; i++) fn(i);
  return performance.now() - start;
}

const expressSetup = registerMany(i => {
  const r = ExpressRouter();
  r.get(`/r${i}`, () => {});
});

const fastSetup = registerMany(i => {
  const r = new FastRouter();
  r.get(`/r${i}`, () => {});
});

console.log(`Express Router - 10K routes: ${expressSetup.toFixed(2)} ms`);
console.log(`FastRouter     - 10K routes: ${fastSetup.toFixed(2)} ms`);

/* -------------------------------------------- */
/* 🧠 Memory Benchmark                          */
/* -------------------------------------------- */

console.log('\n📊 Memory Footprint (10K routes)');
if (global.gc) global.gc();

function memoryUsageAfterRoutes(label: string, fn: () => void) {
  if (global.gc) global.gc();
  const before = process.memoryUsage().heapUsed / 1024 / 1024;
  fn();
  if (global.gc) global.gc();
  const after = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(`${label.padEnd(25)} 🧠 ${(after - before).toFixed(2)} MB used`);
}

memoryUsageAfterRoutes('ExpressRouter (10K)', () => {
  const r = ExpressRouter();
  for (let i = 0; i < 10_000; i++) r.get(`/route/${i}`, () => {});
});

memoryUsageAfterRoutes('FastRouter (10K)', () => {
  const r = new FastRouter();
  for (let i = 0; i < 10_000; i++) r.get(`/route/${i}`, () => {});
});

/* -------------------------------------------- */
/* 📈 Summary                                   */
/* -------------------------------------------- */

console.log('\n===============================');
console.log('🎯 SUMMARY: FastRouter vs Express');
console.log('=================================');
