import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('FedCM session client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('returns the verified readiness flag without exposing cookie data', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ready: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ ready: true }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ));
    vi.stubGlobal('fetch', fetchMock);
    const { ensureFedCmSession } = await import('../fedcm-session-client');

    await expect(ensureFedCmSession()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith('/api/fedcm/migrate', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    });
    expect(fetchMock).toHaveBeenCalledWith('/api/fedcm/status', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
  });

  it('deduplicates migration requests on the same page', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ready: false }), { status: 200 }))
      .mockResolvedValueOnce(new Response(
        JSON.stringify({ ready: false }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ));
    vi.stubGlobal('fetch', fetchMock);
    const { ensureFedCmSession } = await import('../fedcm-session-client');

    await Promise.all([ensureFedCmSession(), ensureFedCmSession()]);

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
