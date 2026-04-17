// ---- Extension internal message types ----

export type ExtensionMessage =
  | { type: 'SEARCH_CREDENTIALS'; keyword: string }
  | { type: 'AUTO_FILL'; credentialId: number }
  | { type: 'CHECK_VAULT_STATUS' }
  | { type: 'LOGIN_FORM_DETECTED'; url: string }
  | { type: 'FILL_CREDENTIALS'; username: string; password: string };

// ---- Auto-fill data ----

export interface AutoFillData {
  username: string;
  password: string;
}

// ---- Login form detection result ----

export interface LoginFormInfo {
  url: string;
  usernameField: HTMLInputElement | null;
  passwordField: HTMLInputElement;
}

// ---- Unified API response format ----

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

// ---- Custom error types ----

export class ApiError extends Error {
  constructor(public code: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class AuthExpiredError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthExpiredError';
  }
}

// ---- Credential DTOs ----

export interface CredentialListItem {
  id: number;
  accountName: string;
  username: string;
  url: string | null;
  tags: string | null;
}
