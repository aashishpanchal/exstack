# Ex⚡

[![npm downloads](https://img.shields.io/npm/dm/exstack.svg)](https://www.npmjs.com/package/exstack)
[![npm version](https://img.shields.io/npm/v/exstack.svg)](https://www.npmjs.com/package/exstack)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview 🌟

> `exstack` is a lightweight utility library designed specifically for Express.js, helping developers simplify server-side logic and reduce boilerplate code. It provides ready-to-use features like error handling, HTTP status utilities, and standardized API responses, enabling you to write cleaner, more maintainable code effortlessly.

## Navigation 📌

1. **[Overview](#overview-)**
2. **[Installation](#installation-)**
3. **[Motivation](#motivation-)**
4. **[Quick Start](#quick-start-)**
5. **Core Features**
   - [Error Handling Middleware](#errorhandler-error-handler-middleware)
   - [Not Found Middleware](#notfound-notfound-handler-middleware-)
   - [Async Handler](#async-handler-simplifying-controllers-️)
   - [Standardized API Responses](#standardized-json-responses-with-apires-)
   - [HttpError Utility](#httperror-)
   - [HttpStatus Constants](#httpstatus-)
   - [Permission Utility](#permission-makepermission-function)
   - [Class-Based Controllers with ProxyWrapper](#proxywrapper-class-controllers-️)
6. **[Conclusion](#conclusion-)**
7. **[Contributing](#contributing-)**
8. **[Author](#author-)**
9. **[License](#license-)**

## Installation 📥

```bash
npm install --save exstack
```

## Motivation 💡

> Building APIs often involves repetitive tasks like handling errors, managing HTTP status codes, or structuring JSON responses. `exstack` was created to eliminate this hassle, allowing developers to focus on writing business logic instead of reinventing common solutions. Whether you're a beginner or an experienced developer, `exstack` streamlines your workflow and ensures your **Express** applications are consistent and reliable.

## Quick Start ⚡

Here’s a minimal setup to get you started with exstack:

```typescript
import express from 'express';
import {handler, errorHandler, notFound} from 'exstack';

const app = express();

// Middleware
app.use(express.json());

// Routers
app.get(
  '/user/:id',
  handler(async (req, res) => {
    const user = await getUserById(req.params.id);
    return ApiRes.ok(user); // Send user data in the response
  }),
);

// Error handling middleware
app.use(notFound());
app.use(errorHandler(conf.isDev, logger.error));

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

## `errorHandler`: Error Handler Middleware

The `errorHandler` middleware manages **HttpErrors** and **Unknown** errors, returning appropriate **json responses.**

### Usage

```typescript
import {errorHandler} from 'exstack';

// Basic usage with default options
app.use(globalErrorHandler(process.env.NODE_ENV === 'development'));

// Custom usage with logging in production mode
app.use(globalErrorHandler(process.env.NODE_ENV === 'development', logger.error));
```

### Arguments

- **isDev**: Enables detailed error messages in development mode (default: **true**).
- **logger**: Optional callback for logging or handling errors.

## `notFound`: NotFound Handler Middleware 🚨

The `notFound` middleware manages **NotFoundError** errors, returning appropriate **json responses.**

### Usage

```typescript
import {notFound} from 'exstack';
// without path
app.use(notFound());
// With path
app.use(notFound('*'));
```

## `async-handler`: Simplifying Controllers 🛠️

Eliminates repetitive **`try-catch`** blocks by managing error handling for both async and sync functions. It also integrates seamlessly with **ApiRes** for enhanced response handling.

### Simplifying Route Handlers

```typescript
import {handler, ApiRes} from 'exstack';

// Route without async-handler (traditional approach with try-catch)
app.get('/user/:id', async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    res.status(200).json(user);
  } catch (error) {
    next(error); // Pass the error to the error-handling middleware
  }
});

// Route using handler (simplified with exstack)
app.get(
  '/user/:id',
  handler(async (req, res) => {
    const user = await getUserById(req.params.id);
    // Send success response using ApiRes
    return ApiRes.ok(user, 'User fetched successfully');
  }),
);
```

### Advanced Example

```typescript
import {handler, ApiRes, type InputType} from 'exstack';

// Login type handler
type LoginInput = InputType<{email: string; password: string}>;

// Login request handler
const login = handler<LoginInput>(async (req, res) => {
  const {email, password} = req.body;
  const user = await loginUser(email, password);

  // Manually setting headers
  res.setHeader('X-Custom-Header', 'SomeHeaderValue');

  // Set multiple cookies for authentication
  res.cookie('access-token', user.accessToken, {
    httpOnly: true,
    secure: true, // Set to true in production with HTTPS
    maxAge: 3600000, // 1 hour
  });

  res.cookie('refresh-token', user.refreshToken, {
    httpOnly: true,
    secure: true,
    maxAge: 7 * 24 * 3600000, // 1 week
  });

  // API response with token and user info
  return ApiRes.ok(user, 'Logged in successfully');
});
```

### Minimal Examples

```typescript
// text response with 200 status
app.get(
  '/hello',
  handler(() => 'Hello World'),
);
// object response with 200 status
app.get(
  '/welcome',
  handler(() => ({message: 'Hello World!'})),
);
// without api-res
app.pos(
  '/login',
  handler(async (req, res) => {
    const user = await getUserById(req.params.id);
    // Manually setting headers
    res.setHeader('X-Custom-Header', 'SomeHeaderValue');
    // Setting cookies
    res.cookie('access-token', user.accessToken, {
      httpOnly: true,
      secure: true, // Set to true in production with HTTPS
      maxAge: 3600000, // 1 hour
    });
    // Sending a custom JSON response
    return res.status(200).json({
      status: 'success',
      message: 'User fetched successfully',
      data: user,
    });
  }),
);
```

## Standardized JSON Responses with ApiRes 📊

ApiRes provides a consistent structure for API responses. It includes several static methods that handle common response patterns, such as `ok`, `created`, and `paginated`.

#### Usage:

```typescript
import {ApiRes, handler} from 'exstack';

// Example without async-handler
app.get('/hello', (req, res) => new ApiRes.ok({}, 'Hello World').toJson(res));

// With ok (200)
const get = handler(async req => ApiRes.ok(await getUser(req.params), 'Get user successfully'));

// With created (201)
const create = handler(async req => ApiRes.created(await createUser(req.body), 'User created successfully'));

// With paginated (200)
const list = handler(async req => {
  const {data, meta} = await getUsers(req.query);
  return ApiRes.paginated(data, meta, 'Get users list successfully');
});

// Routers
app.route('/').get(list).post(create);
app.route('/:id').get(get);
```

### ApiRes `Static` Methods

- `ok(result, message)`: Returns a success response (HTTP 200).
- `created(result, message)`: Returns a resource creation response (HTTP 201).
- `paginated(data, meta, message)`: Returns a success response (HTTP 200).

### `ApiRes.toJson(res: Response): void` Method

Send `HTTP` json Response.

```typescript
new ApiRes({}, 'Hello World').toJson(res);
```

### `ApiRes.body: HttpResBody` Property

Returns the Body `(JSON)` representation of the response.

```typescript
new ApiRes({}, 'Hello World').body;
```

## HttpError ❌

The HttpError class standardizes error handling by extending the native Error class. It’s used to throw HTTP-related errors, which are the caught by **`errorHandler`** [middleware](#errorhandler-error-handler-middleware).

#### Usage:

```typescript
import {HttpError, HttpStatus} from 'exstack';

// Example without async-handler
app.get(
  '*',
  req => new HttpError(HttpStatus.NOT_FOUND, {message: 'Not Found'}).toJson(req.res!), // Throw a 404 error
);

// Example with async-handler
app.post(
  '/example/:id',
  handler(req => {
    if (!req.params.id) throw new BadRequestError('Id is required');
    // .....
  }),
);
```

### Option `data` or `cause`.

```typescript
const err = new HttpError(400, {
  message: 'Validation Error',
  data: {
    username: 'Username is required',
    password: 'Password is required',
  },
  cause: new Error(...)
});
```

> _Note: status code is provided, the **HttpError** class will automatically generate an appropriate error name based on that status code._

### Common HTTP Errors:

- `BadRequestError`
- `UnAuthorizedError`
- `NotFoundError`
- `ConflictError`
- `ForbiddenError`
- `PaymentRequiredError`
- `NotImplementedError`
- `InternalServerError`
- `ContentTooLargeError`

### `isHttpError(value)` Static Method:

The `HttpError.isHttpError(value)` method determines if a specific value is an instance of the `HttpError` class.

```typescript
// If it is an HttpError, send a JSON response with the error details
if (HttpError.isHttpError(err)) return err.toJson(res);
else
  // If it's not an HttpError, pass it to the next middleware for further handling
  next(err);
```

### Custom ErrorHandler Middleware

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

### `error.toJson(res: Response): void` Method

Send `HTTP` json Response.

```typescript
new HttpError('Hello World').toJson(res);
```

### `error.body: HttpErrorBody` Property

Converts an `HttpError` instance into a structured JSON format.

```typescript
const body = new HttpError(400, {message: 'Hello World'}).body;
```

### `createHttpErrorClass` Function

Utility function to create custom error class.

```typescript
import {createHttpErrorClass, HttpStatus} from 'exstack';

/**
 * Represents a Bad Gateway HTTP error (502).
 * @extends {HttpError}
 */
export const BadGatewayError = createHttpErrorClass(HttpStatus.BAD_GATEWAY);
```

## HttpStatus ✅

The `HttpStatus` provides readable constants for standard HTTP status codes **(2xx, 3xx, 4xx, 5xx)** and **Names**, improving code clarity and consistency.

#### Usage:

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

### `HttpStatus.XXX_NAME` of HTTP Status Code Name

The provides a simple lookup for the descriptive names of HTTP status codes.

```typescript
const statusName = HttpStatus.["200_NAME"]; // 'OK'
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

## Permission `makePermission` function

Utility function, That Generates a permission object mapping `subjects` and `actions` to permission strings.

```ts
/** Server Permissions */
const Permissions = makePermission({
  actions: ['create', 'read', 'update', 'delete'] as const,
  subjects: ['user', 'blog', 'comment'] as const,
  filter: {
    user: ['read'], // user only map read
  },
});

console.log(Permission.USER_READ); // user:read
```

## `proxyWrapper`: Class Controllers 🏗️

`exstack` provides the utility `proxyWrapper` to make simplify working with class-based controllers in Express.

#### Usage:

```typescript
// example-controller.ts
import {Request} from 'express';

// Controller Class
class ExampleController {
  constructor(private message: string) {}

  async getData(req: Request) {
    // Your logic here
    return ApiRes.ok({}, this.message);
  }
}

// example-routes.ts
import {Router} from 'express';
import {proxyWrapper} from 'exstack';
import {ExampleController} from './example-controller';

const exampleRoutes = (): Router => {
  const router = Router();

  // Create a proxied instance of ExampleController
  const example = proxyWrapper(ExampleController, 'Hello World');

  // Configure routes
  return router.post('/data', example.getData);
};
```

### `proxyWrapper(clsOrInstance, ...args)`:

- **Parameters**:
  - `clsOrInstance`: A class constructor or an instance of a class.
  - `args`: Arguments for the class constructor (if `clsOrInstance` is a constructor).
- **Returns**: A proxied instance where all methods are wrapped with `async-handler`.

### How It Works

- Instantiates the specified class if a constructor is provided.
- Wraps all its methods with `async-handler`, allowing for automatic handle of asynchronous operations.
- **Prevents method/property** overrides for safety.

### Using Dependency Injection Libraries (Optional)

You can use `proxyWrapper` with dependency injection libraries like [`typedi`](https://www.npmjs.com/package/typedi) or [`tsyringe`](https://www.npmjs.com/package/tsyringe).

#### Example with `tsyringe`

```typescript
const exampleRoutes = (): Router => {
  const router = Router();

  // Create a proxied instance of ExampleController
  const example = proxyWrapper(container.resolve(ExampleController));

  // Configure routes
  return router.post('/data', example.getData);
};
```

#### Example with `typedi`

```typescript
const exampleRoutes = (): Router => {
  const router = Router();

  // Create a proxied instance of ExampleController
  const example = proxyWrapper(Container.get(ExampleController));

  // Configure routes
  return router.post('/data', example.getData);
};
```

## Conclusion 🏁

`exstack` is a powerful tool designed to simplify and enhance Express.js applications by providing essential features out of the box. Whether you’re building a simple API or a complex web application, exstack helps you maintain clean and manageable code.

## Contributing 🤝

Contributions are highly appreciated! To contribute:

1. Fork the repository.
2. Create a new branch for your feature or bug fix.
3. Submit a pull request with a clear description of your changes.

## Author 👤

- Created by **Aashish Panchal**.
- GitHub: [@aashishpanchal](https://github.com/aashishpanchal)

## License 📜

[MIT © Aashish Panchal](LICENSE)
