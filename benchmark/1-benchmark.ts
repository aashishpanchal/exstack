/**
 * 🚀 FastRouter vs Express Router Full Benchmark
 * Covers: route matching, middleware, nested routers, params, async, wildcard, multiple handlers
 */

import {Router as FastRouter} from 'exstack';
import {Router as ExpressRouter} from 'express';

/* 🧩 Mock request/response helpers */
function createMockReqRes(path: string, method = 'GET') {
  const req: any = {method, path, url: path, params: {}};
  const res: any = {
    send() {},
    json() {},
    end() {},
  };
  return {req, res};
}

/* 🧭 Express Router Setup */
function createExpressRouter() {
  const router = ExpressRouter();

  // 100 static routes
  for (let i = 0; i < 100; i++)
    router.get(`/user/${i}`, (req, res) => {
      res.send(`user-${i}`);
    });

  // Middleware chain
  router.use((req, res, next) => next());
  router.use('/api', (req, res, next) => next());

  // Nested router
  const api = ExpressRouter();
  api.get('/nested', (req, res) => {
    res.send('nested');
  });

  // Dynamic parent param
  api.get('/items/:itemId', (req, res) => {
    res.send(req.params);
  });
  router.use('/api/:version', api);

  // Multi-handler route
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
      res.send(`id:${req.params.id} sum:${(req as any)._x + (req as any)._y}`);
    },
  );

  // Wildcard route
  router.use('/wild/*', (req, res) => {
    res.send('wildcard');
  });

  return router;
}

/* ⚙️ FastRouter Setup */
function createFastRouter() {
  const router = new FastRouter();

  // 100 static routes
  for (let i = 0; i < 100; i++) router.get(`/user/${i}`, (req, res) => res.send(`user-${i}`));

  // Middleware chain
  router.use((req, res, next) => next());
  router.use('/api', (req, res, next) => next());

  // Nested router
  const api = new FastRouter();
  api.get('/nested', (req, res) => res.send('nested'));
  api.get('/items/:itemId', (req, res) => res.send(req.params));
  router.route('/api/:version', api);

  // Multi-handler route
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
    (req, res) => res.send(`id:${req.param('id')} sum:${(req as any)._x + (req as any)._y}`),
  );

  // Wildcard route
  router.use('/wild/*', (req, res) => res.send('wildcard'));

  // Async route
  router.get('/async/:id', async (req, res) => {
    await new Promise(r => setTimeout(r, 1));
    res.send(`async-${req.param('id')}`);
  });

  return router;
}

/* ⚡ Benchmark utility */
function benchmark(name: string, fn: () => void, iterations = 10_000): number {
  console.log(`\n🧪 ${name}`);

  for (let i = 0; i < 2000; i++) fn(); // warmup

  if (global.gc) global.gc();
  const memBefore = process.memoryUsage().heapUsed / 1024 / 1024;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) fn();

  const duration = performance.now() - start;
  const memAfter = process.memoryUsage().heapUsed / 1024 / 1024;
  const ops = iterations / (duration / 1000);

  console.log(`   ⏱️  Time: ${duration.toFixed(2)} ms`);
  console.log(`   ⚙️  Ops/sec: ${ops.toLocaleString(undefined, {maximumFractionDigits: 0})}`);
  console.log(`   🧠  Memory: ${memAfter.toFixed(2)} MB (Δ${(memAfter - memBefore).toFixed(2)})`);

  return duration;
}

/* 🚀 Run benchmarks */
console.log('\n==================================================');
console.log('🚀  EXPRESS vs FASTROUTER PERFORMANCE BENCHMARK');
console.log('==================================================');

const expressRouter = createExpressRouter();
const fastRouter = createFastRouter();

// Pre-create mock requests for each feature
const mocks = {
  routeMatch: createMockReqRes('/user/50'),
  middleware: createMockReqRes('/api/test'),
  nested: createMockReqRes('/api/v1/nested'),
  param: createMockReqRes('/api/v1/items/77'),
  multiHandler: createMockReqRes('/multi/99'),
  wildcard: createMockReqRes('/wild/anything/here'),
  asyncRoute: createMockReqRes('/async/123'),
};

// 1️⃣ Route matching
console.log('\n📊 Route Matching Performance');
const expressMatch = benchmark('Express Router - Match', () =>
  (expressRouter as any).handle(mocks.routeMatch.req, mocks.routeMatch.res, () => {}),
);
const fastMatch = benchmark('FastRouter - Match', () =>
  fastRouter.dispatch(mocks.routeMatch.req, mocks.routeMatch.res, () => {}),
);

// 2️⃣ Middleware
console.log('\n📊 Middleware Chain Performance');
const expressMid = benchmark('Express Router - Middleware', () =>
  (expressRouter as any).handle(mocks.middleware.req, mocks.middleware.res, () => {}),
);
const fastMid = benchmark('FastRouter - Middleware', () =>
  fastRouter.dispatch(mocks.middleware.req, mocks.middleware.res, () => {}),
);

// 3️⃣ Nested routers
console.log('\n📊 Nested Router Performance');
const expressNest = benchmark('Express Router - Nested', () =>
  (expressRouter as any).handle(mocks.nested.req, mocks.nested.res, () => {}),
);
const fastNest = benchmark('FastRouter - Nested', () =>
  fastRouter.dispatch(mocks.nested.req, mocks.nested.res, () => {}),
);

// 4️⃣ Param extraction
console.log('\n📊 Parameter Extraction Performance');
const expressParam = benchmark('Express Router - Params', () =>
  (expressRouter as any).handle(mocks.param.req, mocks.param.res, () => {}),
);
const fastParam = benchmark('FastRouter - Params', () =>
  fastRouter.dispatch(mocks.param.req, mocks.param.res, () => {}),
);

// 5️⃣ Multi-handler
console.log('\n📊 Multi-handler Route Performance');
const expressMulti = benchmark('Express Router - Multi-handler', () =>
  (expressRouter as any).handle(mocks.multiHandler.req, mocks.multiHandler.res, () => {}),
);
const fastMulti = benchmark('FastRouter - Multi-handler', () =>
  fastRouter.dispatch(mocks.multiHandler.req, mocks.multiHandler.res, () => {}),
);

// 6️⃣ Wildcard
console.log('\n📊 Wildcard Route Performance');
const expressWildcard = benchmark('Express Router - Wildcard', () =>
  (expressRouter as any).handle(mocks.wildcard.req, mocks.wildcard.res, () => {}),
);
const fastWildcard = benchmark('FastRouter - Wildcard', () =>
  fastRouter.dispatch(mocks.wildcard.req, mocks.wildcard.res, () => {}),
);

// 7️⃣ Async route
console.log('\n📊 Async Route Performance');
const expressAsync = benchmark('Express Router - Async', () =>
  (expressRouter as any).handle(mocks.asyncRoute.req, mocks.asyncRoute.res, () => {}),
);
const fastAsync = benchmark('FastRouter - Async', () =>
  fastRouter.dispatch(mocks.asyncRoute.req, mocks.asyncRoute.res, () => {}),
);

// 📈 Summary
console.log('\n==================================================');
console.log('🎯 FINAL PERFORMANCE SUMMARY');
console.log('==================================================');

const ratios = [
  expressMatch / fastMatch,
  expressMid / fastMid,
  expressNest / fastNest,
  expressParam / fastParam,
  expressMulti / fastMulti,
  expressWildcard / fastWildcard,
  expressAsync / fastAsync,
];
const avg = ratios.reduce((a, b) => a + b, 0) / ratios.length;

console.table([
  {Test: 'Route Match', Improvement: `${ratios[0].toFixed(1)}x faster`},
  {Test: 'Middleware', Improvement: `${ratios[1].toFixed(1)}x faster`},
  {Test: 'Nested Router', Improvement: `${ratios[2].toFixed(1)}x faster`},
  {Test: 'Parameter Extraction', Improvement: `${ratios[3].toFixed(1)}x faster`},
  {Test: 'Multi-handler', Improvement: `${ratios[4].toFixed(1)}x faster`},
  {Test: 'Wildcard', Improvement: `${ratios[5].toFixed(1)}x faster`},
  {Test: 'Async Route', Improvement: `${ratios[6].toFixed(1)}x faster`},
  {Test: 'Average', Improvement: `${avg.toFixed(1)}x faster overall 🚀`},
]);

console.log('\n✨ FastRouter benchmark completed.\n');
