// ---- Extension internal message types ----

export type ExtensionMessage =
  | { type: 'SEARCH_CREDENTIALS'; keyword: string }
  | { type: 'LIST_CREDENTIALS' }
  | { type: 'AUTO_FILL'; credentialId: number }
  | { type: 'CHECK_VAULT_STATUS' }
  | { type: 'LOGIN_FORM_DETECTED'; url: string }
  | { type: 'FILL_CREDENTIALS'; username: string; password: string }
  | { type: 'UNLOCK_VAULT'; masterPassword: string }
  | { type: 'VERIFY_TOTP'; totpCode: string }
  | { type: 'GET_CREDENTIAL'; credentialId: number }
  | { type: 'REVEAL_PASSWORD'; credentialId: number }
  | { type: 'CREATE_CREDENTIAL'; data: CreateCredentialData }
  | { type: 'UPDATE_CREDENTIAL'; credentialId: number; data: UpdateCredentialData }
  | { type: 'DELETE_CREDENTIAL'; credentialId: number }
  | { type: 'NAVIGATE_AND_FILL'; credentialId: number; url: string };

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

export interface CredentialDetail {
  id: number;
  accountName: string;
  username: string;
  maskedPassword: string;
  url: string | null;
  notes: string | null;
  tags: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCredentialData {
  accountName: string;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  tags?: string;
}

export interface UpdateCredentialData {
  accountName?: string;
  username?: string;
  password?: string;
  url?: string;
  notes?: string;
  tags?: string;
}
