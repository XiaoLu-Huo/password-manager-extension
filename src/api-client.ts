import { ApiResponse, ApiError, NetworkError, AuthExpiredError } from './types';

const DEFAULT_BASE_URL = 'http://localhost:8080/api';
const SESSION_TOKEN_KEY = 'pm_session_token';

/**
 * API client for Chrome Extension service worker.
 *
 * Follows the same pattern as the Electron app's ApiClient:
 * - Parses ApiResponse<T>: code=0 → return data, code≠0 → throw ApiError
 * - Intercepts 401 → clears session token
 * - Attaches session token to request headers automatically
 * - Wraps network failures as NetworkError
 *
 * Uses chrome.storage.session for token persistence within the browser session.
 */
export class ExtensionApiClient {
  private sessionToken: string | null = null;
  private baseUrl: string;

  constructor(baseUrl = DEFAULT_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // ---- Session Token Management ----

  async setSessionToken(token: string | null): Promise<void> {
    this.sessionToken = token;
    if (token) {
      await chrome.storage.session.set({ [SESSION_TOKEN_KEY]: token });
    } else {
      await chrome.storage.session.remove(SESSION_TOKEN_KEY);
    }
  }

  async getSessionToken(): Promise<string | null> {
    if (this.sessionToken) {
      return this.sessionToken;
    }
    const result = await chrome.storage.session.get(SESSION_TOKEN_KEY);
    this.sessionToken = result[SESSION_TOKEN_KEY] ?? null;
    return this.sessionToken;
  }

  async clearSessionToken(): Promise<void> {
    this.sessionToken = null;
    await chrome.storage.session.remove(SESSION_TOKEN_KEY);
  }

  // ---- Core Request Method ----

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const token = await this.getSessionToken();

    const headers = new Headers(options.headers);
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch {
      throw new NetworkError('网络连接失败，请检查后端服务是否启动');
    }

    if (response.status === 401) {
      await this.clearSessionToken();
      throw new AuthExpiredError('会话已过期，请重新解锁');
    }

    const result: ApiResponse<T> = await response.json();

    if (result.code !== 0) {
      throw new ApiError(result.code, result.message);
    }

    return result.data;
  }

  // ---- Convenience HTTP Methods ----

  get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }
}

// Singleton instance used by the service worker
export const apiClient = new ExtensionApiClient();
