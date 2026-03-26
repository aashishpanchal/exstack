import express from 'express';
import {serve} from '@/serve';
import {describe, expect, it, vi, afterEach} from 'vitest';

describe('serve', () => {
  let server: any;

  afterEach(() => {
    if (server?.listening) {
      server.close();
    }
  });

  it('should start server on specified port', async () => {
    const app = express();
    server = serve(app, {port: 0, silent: true});

    await new Promise(resolve => server.once('listening', resolve));
    expect(server.listening).toBe(true);
  });

  it('should use PORT env variable', async () => {
    process.env.PORT = '4567';
    const app = express();
    server = serve(app, {silent: true});

    await new Promise(resolve => server.once('listening', resolve));
    const addr = server.address();
    expect(addr.port).toBe(4567);
    delete process.env.PORT;
  });

  it('should use HOST env variable', async () => {
    process.env.HOST = '127.0.0.1';
    const app = express();
    server = serve(app, {port: 0, silent: true});

    await new Promise(resolve => server.once('listening', resolve));
    const addr = server.address();
    expect(addr.address).toBe('127.0.0.1');
    delete process.env.HOST;
  });

  it('should handle requests properly', async () => {
    const app = express();
    app.get('/test', (req, res) => res.json({ok: true}));
    server = serve(app, {port: 0, silent: true});

    await new Promise(resolve => server.once('listening', resolve));
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/test`);
    const data = await res.json();
    expect(data).toEqual({ok: true});
  });

  it('should track connections', async () => {
    const app = express();
    server = serve(app, {port: 0, silent: true});

    await new Promise(resolve => server.once('listening', resolve));
    const port = server.address().port;

    const res = await fetch(`http://localhost:${port}/`);
    expect(res.status).toBe(404);
  });

  it('should disable graceful shutdown when explicitly disabled', () => {
    const app = express();
    const mockOn = vi.spyOn(process, 'on');

    server = serve(app, {port: 0, silent: true, gracefulShutdown: false});

    // Should not register handlers when gracefulShutdown is false
    const sigintCalls = mockOn.mock.calls.filter(call => call[0] === 'SIGINT');
    const sigtermCalls = mockOn.mock.calls.filter(
      call => call[0] === 'SIGTERM',
    );

    expect(sigintCalls.length).toBe(0);
    expect(sigtermCalls.length).toBe(0);

    mockOn.mockRestore();
  });

  it('should support silent mode', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const app = express();
    server = serve(app, {port: 0, silent: true});

    await new Promise(resolve => server.once('listening', resolve));
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should log startup message by default', async () => {
    const consoleSpy = vi.spyOn(console, 'log');
    const app = express();
    server = serve(app, {port: 0, host: 'localhost'});

    await new Promise(resolve => server.once('listening', resolve));
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Listening on:'),
    );
    consoleSpy.mockRestore();
  });
});
