/**
 * RE-13.1: Tests for startWebhookServerIfEnabled.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockListen = vi.fn();
const mockOn = vi.fn();

vi.mock('./create-webhook-server', () => ({
  createWebhookServer: vi.fn(() => ({
    listen: mockListen,
    on: mockOn,
  })),
}));

const originalEnv = process.env;

describe('startWebhookServerIfEnabled', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('disabled by default does not create or listen', async () => {
    delete process.env.ENABLE_WEBHOOK_SERVER;
    delete process.env.WEBHOOK_PORT;

    const { startWebhookServerIfEnabled } = await import('./start-webhook-server');
    startWebhookServerIfEnabled();

    const { createWebhookServer } = await import('./create-webhook-server');
    expect(createWebhookServer).not.toHaveBeenCalled();
    expect(mockListen).not.toHaveBeenCalled();
  });

  it('enabled creates server and calls listen with configured port', async () => {
    process.env.ENABLE_WEBHOOK_SERVER = '1';
    process.env.WEBHOOK_PORT = '3142';

    const { startWebhookServerIfEnabled } = await import('./start-webhook-server');
    startWebhookServerIfEnabled();

    const { createWebhookServer } = await import('./create-webhook-server');
    expect(createWebhookServer).toHaveBeenCalled();
    expect(mockListen).toHaveBeenCalledWith(3142, '127.0.0.1', expect.any(Function));
  });

  it('uses default host 127.0.0.1', async () => {
    process.env.ENABLE_WEBHOOK_SERVER = 'true';
    process.env.WEBHOOK_PORT = '9999';

    const { startWebhookServerIfEnabled } = await import('./start-webhook-server');
    startWebhookServerIfEnabled();

    expect(mockListen).toHaveBeenCalledWith(9999, '127.0.0.1', expect.any(Function));
  });

  it('invalid WEBHOOK_PORT falls back to 3141', async () => {
    process.env.ENABLE_WEBHOOK_SERVER = '1';
    process.env.WEBHOOK_PORT = 'invalid';

    const { startWebhookServerIfEnabled } = await import('./start-webhook-server');
    startWebhookServerIfEnabled();

    expect(mockListen).toHaveBeenCalledWith(3141, '127.0.0.1', expect.any(Function));
  });

  it('missing WEBHOOK_PORT falls back to 3141', async () => {
    process.env.ENABLE_WEBHOOK_SERVER = '1';
    delete process.env.WEBHOOK_PORT;

    const { startWebhookServerIfEnabled } = await import('./start-webhook-server');
    startWebhookServerIfEnabled();

    expect(mockListen).toHaveBeenCalledWith(3141, '127.0.0.1', expect.any(Function));
  });

  it('listen error handler does not throw', async () => {
    process.env.ENABLE_WEBHOOK_SERVER = '1';
    process.env.WEBHOOK_PORT = '3141';

    const { startWebhookServerIfEnabled } = await import('./start-webhook-server');
    startWebhookServerIfEnabled();

    expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function));
    const errorHandler = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'error')?.[1];
    expect(errorHandler).toBeDefined();

    expect(() => {
      errorHandler({ message: 'listen failed', code: 'EADDRINUSE' });
    }).not.toThrow();
  });

  it('port-in-use error is handled without throwing', async () => {
    process.env.ENABLE_WEBHOOK_SERVER = '1';
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { startWebhookServerIfEnabled } = await import('./start-webhook-server');
    startWebhookServerIfEnabled();

    const errorHandler = mockOn.mock.calls.find((c: unknown[]) => c[0] === 'error')?.[1];
    errorHandler({ message: 'EADDRINUSE', code: 'EADDRINUSE' });

    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
