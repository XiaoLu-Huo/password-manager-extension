import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExtensionApiClient } from '../api-client';
import { ApiError, NetworkError, AuthExpiredError } from '../types';

// Mock chrome.storage.session
const mockStorage: Record<string, unknown> = {};
const chromeMock = {
  storage: {
    session: {
      get: vi.fn(async (key: string) => ({ [key]: mockStorage[key] })),
      set: vi.fn(async (obj: Record<string, unknown>) => {
        Object.assign(mockStorage, obj);
      }),
      remove: vi.fn(async (key: string) => {
        delete mockStorage[key];
      }),
    },
  },
};

vi.stubGlobal('chrome', chromeMock);

describe('ExtensionApiClient', () => {
  let client: ExtensionApiClient;

  beforeEach(() => {
    client = new ExtensionApiClient('http://localhost:8080/api');
    vi.restoreAllMocks();
    Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return data when API responds with code=0', async () => {
    const mockData = { id: 1, name: 'test' };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ code: 0, message: 'ok', data: mockData }),
      }),
    );

    const result = await client.request('/test');
    expect(result).toEqual(mockData);
  });

  it('should throw ApiError when API responds with code≠0', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        status: 200,
        json: async () => ({ code: 1001, message: '密码错误', data: null }),
      }),
    );

    await expect(client.request('/test')).rejects.toThrow(ApiError);
    await expect(client.request('/test')).rejects.toThrow('密码错误');
  });

  it('should throw NetworkError on fetch failure', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockRejectedValue(new TypeError('Failed to fetch')),
    );

    await expect(client.request('/test')).rejects.toThrow(NetworkError);
  });

  it('should throw AuthExpiredError and clear token on 401', async () => {
    await client.setSessionToken('test-token');

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status: 401 }),
    );

    await expect(client.request('/test')).rejects.toThrow(AuthExpiredError);
    expect(await client.getSessionToken()).toBeNull();
  });

  it('should attach Authorization header when token is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ code: 0, message: 'ok', data: null }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.setSessionToken('my-token');
    await client.request('/test');

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer my-token');
  });

  it('should not attach Authorization header when no token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ code: 0, message: 'ok', data: null }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await client.request('/test');

    const [, options] = fetchMock.mock.calls[0];
    const headers = options.headers as Headers;
    expect(headers.get('Authorization')).toBeNull();
  });

  it('should persist token in chrome.storage.session', async () => {
    await client.setSessionToken('stored-token');
    expect(mockStorage['pm_session_token']).toBe('stored-token');

    await client.clearSessionToken();
    expect(mockStorage['pm_session_token']).toBeUndefined();
  });
});
