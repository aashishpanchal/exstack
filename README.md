# ⚡️ Exstack

[![npm version](https://img.shields.io/npm/v/exstack.svg)](https://www.npmjs.com/package/exstack)
[![npm downloads](https://img.shields.io/npm/dm/exstack.svg)](https://www.npmjs.com/package/exstack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A lightweight, fast, and flexible utility library for **Express.js** — designed to simplify development with a high-performance router, async-safe handlers, built-in validation, and clean, standardized responses.

## 🧭 Table of Contents

- [🚀 Features](#-features)
- [📦 Installation](#-installation)
- [⚡ Quick Start](#-quick-start)
- [🧠 Core Concepts](#-core-concepts)
  - [🗺️ Router](#️-router)
  - [🧮 Benchmarks](#-router-benchmarks)
  - [🪄 Handler](#-handler)
  - [📦 ApiRes](#-apires)
  - [🚨 HttpError](#-httperror)
  - [✅ HttpStatus](#-httpstatus)
  - [🔍 Zod Validator](#-zod-validator)
  - [🧱 Middleware](#-middleware)

- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

## 🚀 Features

- ⚡ **High-Performance Router** — Express-compatible router with ultra-fast matching (Trie / RegExp strategies).
- 🧠 **Async-Friendly Handlers** — Simplify async route logic with automatic error propagation and standardized responses.
- 🧩 **Standardized Responses** — Use `ApiRes` and `HttpError` for clean, consistent, and typed responses.
- ✅ **Zod-Based Validation** — Validate request body, query, and params seamlessly.
- 🧱 **Essential Middleware** — Includes `errorHandler`, `notFound`, and `poweredBy` out of the box.
- 🧾 **HttpStatus Enum** — Access standardized HTTP status codes and names with clear constants.

## 📦 Installation

```bash
npm install exstack
```

## ⚡ Quick Start

```typescript
import * as z from 'zod';
import express from 'express';
import {validator} from 'exstack/zod';
import {Router, handler, errorHandler, notFound, ApiRes} from 'exstack';

const app = express();
const router = new Router();

// Middleware
app.use(express.json());

// Validation schema
const schema = z.object({
  name: z.string(),
});

// Define routes
router.get('/ping', () => 'pong');

router.post('/users', validator.body(schema), req => {
  const user = req.valid<typeof schema>('body');
  return ApiRes.created(user, 'User created successfully');
});

// Mount the router
app.use(router.dispatch);

// Error middleware
app.use(notFound('*splat'));
app.use(errorHandler(process.env.NODE_ENV === 'development'));

app.listen(3000, () => console.log('Server running on port 3000'));
```

## 🧠 Core Concepts

### 🗺️ Router

Exstack’s `Router` is a **powerful and flexible routing solution** that works both standalone or within Express.

- **Smart Routing:** Automatically selects the best strategy (Trie or RegExp), similar to **Hono.js**.
- **Express-like API:** Familiar methods — `.get()`, `.post()`, `.use()`, etc.
- **Parameter Handling:** Easy access via `req.params` and `req.param()`.
- **Middleware & Subrouters:** Modular and composable for scalable applications.

```typescript
import {Router} from 'exstack';

const router = new Router();

router.get('/hello', () => 'Hello, World!');

router.get('/users/:id', req => {
  const {id} = req.params;
  return {userId: id};
});

// Sub-router example
const adminRouter = new Router();
adminRouter.get('/dashboard', () => 'Admin Dashboard');
router.route('/admin', adminRouter);
```

### 🧮 Router Benchmarks

| Test Case   | Express | Router | Improvement      |
| ----------- | ------- | ------ | ---------------- |
| Route Match | 11.24ms | 1.08ms | **10.4x faster** |
| Middleware  | 28.43ms | 1.11ms | **25.6x faster** |
| Params      | 15.88ms | 2.12ms | **7.5x faster**  |
| Wildcard    | 15.12ms | 1.29ms | **11.7x faster** |
| Async       | 15.14ms | 3.29ms | **4.6x faster**  |

**Cold Start (10K routes):**

- Express: 32.74 ms
- Router: 6.20 ms

**Memory Footprint (10K routes):**

- Express: 14.67 MB
- Router: 0.00 MB

### 🪄 Handler

The `handler` utility wraps route logic to **automatically catch errors** and **send responses** cleanly.

```typescript
import {handler, ApiRes} from 'exstack';

// Without handler (classic)
app.get('/user/:id', async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    res.status(200).json(user);
  } catch (err) {
    next(err);
  }
});

// With handler (cleaner)
app.get(
  '/user/:id',
  handler(async req => {
    const user = await getUserById(req.param('id'));
    return ApiRes.ok(user, 'User fetched successfully');
  }),
);
```

> 🧩 **Note:** The Exstack `Router` natively supports async/sync handlers — `handler()` is only needed when using **standalone Express routes**.

### 📦 ApiRes

`ApiRes` standardizes and simplifies success response formatting.

```typescript
router.get('/user', () => ApiRes.ok({name: 'John Doe'}, 'User found'));

router.post('/user', req => {
  const newUser = createUser(req.body);
  return ApiRes.created(newUser, 'User created');
});

// Chainable example
router.post('/user', req => {
  const newUser = createUser(req.body);
  return ApiRes.status(200).msg('User created').data(newUser);
});
```

**Available Methods:**

| Method                                  | Description                |
| --------------------------------------- | -------------------------- |
| `ApiRes.ok(data, message)`              | 200 OK response            |
| `ApiRes.created(data, message)`         | 201 Created response       |
| `ApiRes.paginated(data, meta, message)` | Paginated success response |
| `.status(code)`                         | Chainable status setter    |
| `.msg(message)`                         | Chainable message setter   |
| `.data(data)`                           | Chainable data setter      |

### 🚨 HttpError

The `HttpError` class provides a **consistent and structured way to handle HTTP errors**.

```typescript
import {HttpError, HttpStatus} from 'exstack';

router.get('*', (req, res) =>
  new HttpError(HttpStatus.NOT_FOUND, {
    message: 'Not Found',
  }).toJson(res),
);

router.post('/example/:id', req => {
  if (!req.param('id')) throw new BadRequestError('Id is required');
});
```

**Extended Options:**

```typescript
const err = new HttpError(400, {
  message: 'Validation Error',
  data: {
    username: 'Username is required',
    password: 'Password is required',
  },
  cause: new Error('Invalid input'),
});
```

> _If no custom name is provided, `HttpError` automatically assigns one based on the status code._

#### Common Errors:

- `BadRequestError`
- `UnauthorizedError`
- `NotFoundError`
- `ConflictError`
- `ForbiddenError`
- `PaymentRequiredError`
- `NotImplementedError`
- `InternalServerError`
- `ContentTooLargeError`

#### `HttpError.isHttpError(value)`

Check whether a value is an instance of `HttpError`.

```typescript
// If it is an HttpError, send a JSON response with the error details
if (HttpError.isHttpError(err)) return err.toJson(res);
else
  // If it's not an HttpError, pass it to the next middleware for further handling
  next(err);
```

#### Custom Error Handler Example

```typescript
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // Handle known HttpError instances
  if (HttpError.isHttpError(err)) {
    // Log the cause if it exists
    if (err.options.cause) console.error('HttpError Cause:', err.options.cause);
    return err.toJson(res);
  }
  // Write unknown errors if a write function is provided
  console.error('Unknown Error:', err);
  // Standardized error response for unknown exceptions
  const unknown = {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    error: 'InternalServerError',
    message: isDev ? err.message || 'Unexpected error' : 'Something went wrong',
    stack: isDev ? err.stack : undefined,
  };
  res.status(unknown.status).json(unknown);
};
```

### ✅ HttpStatus

`HttpStatus` provides readable constants for all standard HTTP status codes.

```typescript
import {HttpStatus} from 'exstack';

// Example: Basic usage in a route
app.get('/status-example', (req, res) => {
  res.status(HttpStatus.OK).json({message: 'All good!'});
});

// Example: Custom error handling middleware
app.use((req, res) => {
  res.status(HttpStatus.NOT_FOUND).json({
    error: 'Resource not found',
  });
});

// Example: Response with a 201 Created status
app.post('/create', (req, res) => {
  const resource = createResource(req.body);
  res.status(HttpStatus.CREATED).json({
    message: 'Resource created successfully',
    data: resource,
  });
});
```

### Commonly Used HTTP Status Codes:

- **2xx: Success**
  - `HttpStatus.OK`: 200 — Request succeeded.
  - `HttpStatus.CREATED`: 201 — Resource created.
  - `HttpStatus.ACCEPTED`: 202 — Request accepted for processing.
  - `HttpStatus.NO_CONTENT`: 204 — No content to send.
  - and more ....

- **3xx: Redirection**
  - `HttpStatus.MOVED_PERMANENTLY`: 301 — Resource moved permanently.
  - `HttpStatus.FOUND`: 302 — Resource found at another URI.
  - `HttpStatus.NOT_MODIFIED`: 304 — Resource not modified.
  - and more ....

- **4xx: Client Error**
  - `HttpStatus.BAD_REQUEST`: 400 — Bad request.
  - `HttpStatus.UNAUTHORIZED`: 401 — Authentication required.
  - `HttpStatus.FORBIDDEN`: 403 — Access forbidden.
  - `HttpStatus.NOT_FOUND`: 404 — Resource not found.
  - and more ....

- **5xx: Server Error**
  - `HttpStatus.INTERNAL_SERVER_ERROR`: 500 — Internal server error.
  - `HttpStatus.NOT_IMPLEMENTED`: 501 — Not implemented.
  - `HttpStatus.SERVICE_UNAVAILABLE`: 503 — Service unavailable.
  - and more ....

### 🔍 Zod Validator

The `validator` middleware provides an easy way to validate incoming requests using Zod schemas. It can validate the request `body`, `query`, `params` and `all`.

### Installation

```bash
# node runtime
npm install zod
# bun runtime
bun install zod
```

### Examples

```typescript
import * as z from 'zod';
import {validator} from 'exstack/zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

router.post(
  '/users',
  validator.body(createUserSchema),
  handler(req => {
    const validatedBody = req.valid('body');
    // validatedBody is guaranteed to match the schema
    return ApiRes.created(validatedBody, 'User created');
  }),
);
```

```typescript
router.post(
  '/users',
  validator.body(createUserSchema),
  handler(req => {
    // Option 1: Automatically inferred from schema
    const user = req.valid('body');
    //    ^? { name: string; email: string }

    // Option 2: Explicitly infer from the schema
    const user2 = req.valid<typeof createUserSchema>('body');
    //    ^? z.infer<typeof createUserSchema>

    // Option 3: Manually provide a type if needed
    const user3 = req.valid<{name: string; email: string}>('body');
    //    ^? { name: string; email: string }

    return ApiRes.created(user, 'User created successfully');
  }),
);

// Multi-part Validation Example

const multiSchema = {
  body: z.object({name: z.string()}),
  query: z.object({page: z.string().optional()}),
  params: z.object({id: z.string().uuid()}),
};

router.put(
  '/users/:id',
  validator.all(multiSchema),
  handler(req => {
    const result = req.valid('all');
    return ApiRes.ok(result);
  }),
);
```

### 🧱 Middleware

#### 🛠️ errorHandler

Handles `HttpError` and unknown exceptions with standardized JSON output.

```typescript
import {errorHandler} from 'exstack';

app.use(errorHandler(process.env.NODE_ENV === 'development'));
```

#### 🚫 notFound

Automatically throws a 404 for unmatched routes.

```typescript
app.use(notFound('*splat'));
```

#### ⚙️ poweredBy

Adds an `X-Powered-By` header to responses.

```typescript
app.use(poweredBy('Exstack'));
```

## 🤝 Contributing

Contributions are welcome!
Please open an issue or submit a pull request to help improve **Exstack**.

## 📄 License

Licensed under the [MIT License](./LICENSE).
