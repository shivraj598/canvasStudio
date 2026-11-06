import { describe, expect, it, vi } from 'vitest';
import { ApiError, createApiClient, tokenStore } from './api';

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function setup(response: Response | Error, token: string | null = 'tok') {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => {
    if (response instanceof Error) throw response;
    return response;
  });
  const client = createApiClient({ baseUrl: '/api', fetch, getToken: () => token });
  const lastCall = () => {
    const [url, init] = fetch.mock.calls.at(-1)!;
    return { url, init: init!, headers: new Headers(init!.headers) };
  };
  return { client, fetch, lastCall };
}

describe('createApiClient', () => {
  it('sends the bearer token and parses JSON', async () => {
    const { client, lastCall } = setup(jsonResponse(200, { user: { id: 'u1' } }));
    await expect(client.me()).resolves.toEqual({ id: 'u1' });
    const { url, headers } = lastCall();
    expect(url).toBe('/api/auth/me');
    expect(headers.get('authorization')).toBe('Bearer tok');
  });

  it('omits the authorization header when signed out', async () => {
    const { client, lastCall } = setup(jsonResponse(200, { providers: [] }), null);
    await client.providers();
    expect(lastCall().headers.has('authorization')).toBe(false);
  });

  it('sends JSON bodies with the right method', async () => {
    const { client, lastCall } = setup(jsonResponse(200, { project: { id: 'p1' } }));
    await client.saveStep('p1', 'brand', { brandName: 'Luna' });
    const { url, init, headers } = lastCall();
    expect(url).toBe('/api/projects/p1/answers');
    expect(init.method).toBe('PUT');
    expect(headers.get('content-type')).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ step: 'brand', data: { brandName: 'Luna' } });
  });

  it('creates projects with an optional name', async () => {
    const { client, lastCall } = setup(jsonResponse(201, { project: { id: 'p1' } }));
    await client.createProject();
    expect(JSON.parse(lastCall().init.body as string)).toEqual({});
  });

  it('returns preview HTML as text', async () => {
    const { client } = setup(new Response('<h1>Hi</h1>', { status: 200 }));
    await expect(client.previewHtml('p1')).resolves.toBe('<h1>Hi</h1>');
  });

  it('turns API errors into ApiError with field details', async () => {
    const { client } = setup(
      jsonResponse(400, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Some fields are invalid',
          details: { fields: { brandName: 'Too short' } },
        },
      }),
    );
    const error = await client.saveStep('p1', 'brand', {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: 'VALIDATION_ERROR' });
    expect((error as ApiError).fieldErrors).toEqual({ brandName: 'Too short' });
  });

  it('handles non-JSON error responses', async () => {
    const { client } = setup(new Response('Bad gateway', { status: 502 }));
    await expect(client.listProjects()).rejects.toMatchObject({
      status: 502,
      code: 'HTTP_ERROR',
      message: 'Request failed (502)',
    });
  });

  it('reports network failures', async () => {
    const { client } = setup(new TypeError('Failed to fetch'));
    await expect(client.listProjects()).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' });
  });
});

describe('tokenStore', () => {
  it('stores, reads and clears the token', () => {
    expect(tokenStore.get()).toBeNull();
    tokenStore.set('abc');
    expect(tokenStore.get()).toBe('abc');
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });

  it('survives storage being unavailable', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('denied');
    });
    expect(tokenStore.get()).toBeNull();
    expect(() => tokenStore.set('x')).not.toThrow();
  });
});
