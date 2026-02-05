import type Http from 'node:http';
import type Https from 'node:https';
import type {Express} from 'express';
import type {Socket} from 'net';

/**
 * Server configuration options
 */
type Options = {
  /** Port (default: 3000 or PORT env) */
  port?: number;
  /** Hostname (default: 'localhost' or HOST env) */
  hostname?: string;
  /** Enable graceful shutdown (default: true, disabled in CI/TEST) */
  gracefulShutdown?:
    | boolean
    | {
        /** Timeout in seconds (default: 5 or SERVER_SHUTDOWN_TIMEOUT env) */
        gracefulTimeout?: number;
      };
  /** Suppress startup logs */
  silent?: boolean;
};

type Application = Express | Http.Server | Https.Server;

/**
 * Start an Express app or HTTP/HTTPS server with graceful shutdown support
 *
 * @param app - Express application or HTTP/HTTPS server instance
 * @param options - Server configuration options
 * @returns HTTP/HTTPS server instance
 *
 * @example
 * ```typescript
 * // Basic usage with Express
 * const app = express();
 * serve(app, { port: 3000 });
 *
 * // With HTTPS
 * const httpsServer = https.createServer({ cert, key }, app);
 * serve(httpsServer, { port: 443 });
 *
 * // Custom graceful shutdown timeout
 * serve(app, {
 *   port: 3000,
 *   gracefulShutdown: { gracefulTimeout: 10 }
 * });
 *
 * // Disable graceful shutdown
 * serve(app, { gracefulShutdown: false });
 * ```
 *
 * @remarks
 * Graceful shutdown behavior:
 * - On SIGINT/SIGTERM: stops accepting new connections, waits for active requests
 * - Shows countdown timer with remaining time
 * - Press Ctrl+C again to force close immediately
 * - After timeout: automatically force closes all connections
 * - Long-running connections (SSE, WebSocket) will be force closed on timeout
 */
export function serve(app: Application, options: Options = {}) {
  const port =
    options.port ?? (Number.parseInt(process.env.PORT || '') || 3000);
  const hostname = options.hostname ?? process.env.HOST ?? 'localhost';
  const gracefulConfig = options.gracefulShutdown ?? true;
  const silent = options.silent ?? false;

  // Track all open sockets for force close
  const connections = new Set<Socket>();
  let closeCalled = false;
  let isShuttingDown = false;

  const server: Http.Server = app.listen(port, hostname, () => {
    if (!silent) {
      const url = `http://${hostname}:${port}/`;
      console.log(`\x1b[32m➜ Listening on:\x1b[0m \x1b[36m${url}\x1b[0m`);
    }
  });

  // Track connections for cleanup
  server.on('connection', socket => {
    connections.add(socket);
    socket.on('close', () => connections.delete(socket));
  });

  // Setup graceful shutdown (disabled in CI/TEST)
  if (gracefulConfig !== false && !process.env.CI && !process.env.TEST) {
    const gracefulTimeout =
      gracefulConfig === true || !gracefulConfig?.gracefulTimeout
        ? Number.parseInt(process.env.SERVER_SHUTDOWN_TIMEOUT || '') || 5
        : gracefulConfig.gracefulTimeout;

    const closeServer = () =>
      new Promise<void>((resolve, reject) => {
        if (closeCalled) return resolve();
        closeCalled = true;
        // Stop accepting new connections, wait for existing requests
        server.close(err => (err ? reject(err) : resolve()));
      });

    const forceClose = async () => {
      process.stderr.write(
        '\x1b[31m\x1b[2K\rForcibly closing connections...\n\x1b[0m',
      );
      // Destroy all open sockets immediately
      for (const socket of connections) {
        socket.destroy();
      }
      await closeServer();
      process.stderr.write('\x1b[33mServer closed.\n\x1b[0m');
      process.exit(0);
    };

    const shutdown = async () => {
      // Second Ctrl+C → force close
      if (isShuttingDown) {
        await forceClose();
        return;
      }
      isShuttingDown = true;
      const closePromise = closeServer();
      // Countdown with 1s intervals
      for (let remaining = gracefulTimeout; remaining > 0; remaining--) {
        process.stderr.write(
          `\x1b[90m\rStopping server gracefully (${remaining}s)... Press \x1b[1mCtrl+C\x1b[0m\x1b[90m again to force close.\x1b[0m`,
        );
        const closed = await Promise.race([
          closePromise.then(() => true),
          new Promise<false>(r => setTimeout(() => r(false), 1000)),
        ]);
        // All requests completed
        if (closed) {
          process.stderr.write(
            '\x1b[2K\r\x1b[32mServer closed successfully.\n\x1b[0m',
          );
          process.exit(0);
        }
      }
      // Timeout expired → force close
      process.stderr.write('\x1b[2K\rGraceful shutdown timed out.\n');
      await forceClose();
    };

    process.on('SIGINT', shutdown); // Ctrl+C
    process.on('SIGTERM', shutdown); // Docker/PM2 stop
  }

  return server;
}
