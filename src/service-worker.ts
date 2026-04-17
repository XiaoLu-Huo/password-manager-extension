import { apiClient } from './api-client';
import type { ExtensionMessage, CredentialListItem } from './types';

/**
 * Chrome Extension Service Worker (Manifest V3 background service).
 *
 * Responsibilities:
 * - Acts as API request proxy between content scripts/popup and the backend
 * - Manages Session Token via chrome.storage.session
 * - Handles extension internal messages (search, auto-fill, vault status, login form detection)
 */

// ---- Message Handler ----

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));

    // Return true to indicate async response
    return true;
  },
);

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case 'SEARCH_CREDENTIALS':
      return searchCredentials(message.keyword);

    case 'AUTO_FILL':
      return getAutoFillData(message.credentialId);

    case 'CHECK_VAULT_STATUS':
      return checkVaultStatus();

    case 'LOGIN_FORM_DETECTED':
      return matchCredentialsByUrl(message.url);

    default:
      return { error: 'Unknown message type' };
  }
}

// ---- API Proxy Functions ----

async function searchCredentials(keyword: string): Promise<CredentialListItem[]> {
  return apiClient.get<CredentialListItem[]>(
    `/credentials/search?keyword=${encodeURIComponent(keyword)}`,
  );
}

async function getAutoFillData(
  credentialId: number,
): Promise<{ username: string; password: string }> {
  const credential = await apiClient.get<{
    username: string;
    maskedPassword: string;
  }>(`/credentials/${credentialId}`);

  const password = await apiClient.post<string>(
    `/credentials/${credentialId}/reveal-password`,
  );

  return { username: credential.username, password };
}

async function checkVaultStatus(): Promise<{ isUnlocked: boolean }> {
  try {
    const token = await apiClient.getSessionToken();
    if (!token) {
      return { isUnlocked: false };
    }
    // Try a lightweight API call to verify the session is still valid
    await apiClient.get<unknown>('/settings');
    return { isUnlocked: true };
  } catch {
    return { isUnlocked: false };
  }
}

async function matchCredentialsByUrl(
  url: string,
): Promise<CredentialListItem[]> {
  try {
    const hostname = new URL(url).hostname;
    return apiClient.get<CredentialListItem[]>(
      `/credentials/search?keyword=${encodeURIComponent(hostname)}`,
    );
  } catch {
    return [];
  }
}
