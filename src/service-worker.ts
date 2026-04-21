import { apiClient } from './api-client';
import type { ExtensionMessage, CredentialListItem, CredentialDetail, CreateCredentialData, UpdateCredentialData } from './types';

/**
 * Chrome Extension Service Worker (Manifest V3 background service).
 */

// ---- Message Handler ----

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    handleMessage(message)
      .then(sendResponse)
      .catch((error) => sendResponse({ error: error.message }));
    return true;
  },
);

async function handleMessage(message: ExtensionMessage): Promise<unknown> {
  switch (message.type) {
    case 'SEARCH_CREDENTIALS':
      return searchCredentials(message.keyword);
    case 'LIST_CREDENTIALS':
      return listCredentials();
    case 'AUTO_FILL':
      return getAutoFillData(message.credentialId);
    case 'CHECK_VAULT_STATUS':
      return checkVaultStatus();
    case 'LOGIN_FORM_DETECTED':
      return matchCredentialsByUrl(message.url);
    case 'UNLOCK_VAULT':
      return unlockVault(message.masterPassword);
    case 'VERIFY_TOTP':
      return verifyTotp(message.totpCode);
    case 'GET_CREDENTIAL':
      return getCredential(message.credentialId);
    case 'REVEAL_PASSWORD':
      return revealPassword(message.credentialId);
    case 'CREATE_CREDENTIAL':
      return createCredential(message.data);
    case 'UPDATE_CREDENTIAL':
      return updateCredential(message.credentialId, message.data);
    case 'DELETE_CREDENTIAL':
      return deleteCredential(message.credentialId);
    case 'NAVIGATE_AND_FILL':
      return navigateAndFill(message.credentialId, message.url);
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

async function listCredentials(): Promise<CredentialListItem[]> {
  return apiClient.get<CredentialListItem[]>('/credentials');
}

async function getAutoFillData(
  credentialId: number,
): Promise<{ username: string; password: string }> {
  const credential = await apiClient.get<{ username: string }>(`/credentials/${credentialId}`);
  const password = await apiClient.post<string>(`/credentials/${credentialId}/reveal-password`);
  return { username: credential.username, password };
}

async function getCredential(credentialId: number): Promise<CredentialDetail> {
  return apiClient.get<CredentialDetail>(`/credentials/${credentialId}`);
}

async function revealPassword(credentialId: number): Promise<{ password: string }> {
  const password = await apiClient.post<string>(`/credentials/${credentialId}/reveal-password`);
  return { password };
}

async function createCredential(data: CreateCredentialData): Promise<CredentialDetail> {
  return apiClient.post<CredentialDetail>('/credentials', data);
}

async function updateCredential(credentialId: number, data: UpdateCredentialData): Promise<CredentialDetail> {
  return apiClient.put<CredentialDetail>(`/credentials/${credentialId}`, data);
}

async function deleteCredential(credentialId: number): Promise<{ success: boolean }> {
  await apiClient.delete(`/credentials/${credentialId}`);
  return { success: true };
}

async function navigateAndFill(
  credentialId: number, url: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get credentials first
    const data = await getAutoFillData(credentialId);

    // Open the URL in a new tab
    const tab = await chrome.tabs.create({ url, active: true });
    if (!tab.id) return { success: false, error: '无法创建标签页' };

    const tabId = tab.id;

    // Wait for the page to finish loading, then try to fill
    return new Promise((resolve) => {
      const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
        if (updatedTabId !== tabId || changeInfo.status !== 'complete') return;
        chrome.tabs.onUpdated.removeListener(onUpdated);

        // Give the page a moment for JS frameworks to render login forms
        setTimeout(async () => {
          try {
            const frames = await chrome.webNavigation.getAllFrames({ tabId });
            let filled = false;
            if (frames) {
              const results = await Promise.allSettled(
                frames.map((frame) =>
                  chrome.tabs.sendMessage(tabId, {
                    type: 'FILL_CREDENTIALS',
                    username: data.username,
                    password: data.password,
                  }, { frameId: frame.frameId })
                )
              );
              filled = results.some((r) => r.status === 'fulfilled' && (r.value as { success: boolean })?.success);
            }
            resolve({ success: filled });
          } catch {
            resolve({ success: false, error: '填充失败' });
          }
        }, 1500); // wait 1.5s for SPA rendering
      };

      chrome.tabs.onUpdated.addListener(onUpdated);

      // Timeout after 15 seconds
      setTimeout(() => {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve({ success: false, error: '页面加载超时' });
      }, 15000);
    });
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : '操作失败' };
  }
}

async function checkVaultStatus(): Promise<{ isUnlocked: boolean }> {
  try {
    const token = await apiClient.getSessionToken();
    if (!token) return { isUnlocked: false };
    await apiClient.get<unknown>('/settings');
    return { isUnlocked: true };
  } catch {
    return { isUnlocked: false };
  }
}

async function matchCredentialsByUrl(url: string): Promise<CredentialListItem[]> {
  try {
    const hostname = new URL(url).hostname;
    // Try full hostname first
    let results = await apiClient.get<CredentialListItem[]>(
      `/credentials/search?keyword=${encodeURIComponent(hostname)}`,
    );
    if (results.length > 0) return results;
    
    // Fall back to main domain (e.g. "163.com" from "smart.mail.163.com")
    const parts = hostname.split('.');
    if (parts.length > 2) {
      const mainDomain = parts.slice(-2).join('.');
      results = await apiClient.get<CredentialListItem[]>(
        `/credentials/search?keyword=${encodeURIComponent(mainDomain)}`,
      );
    }
    return results;
  } catch {
    return [];
  }
}

async function unlockVault(
  masterPassword: string,
): Promise<{ isUnlocked: boolean; mfaRequired?: boolean; error?: string }> {
  try {
    const result = await apiClient.post<{ mfaRequired: boolean; sessionToken: string | null }>(
      '/auth/unlock', { masterPassword },
    );
    if (result.mfaRequired) return { isUnlocked: false, mfaRequired: true };
    if (result.sessionToken) await apiClient.setSessionToken(result.sessionToken);
    return { isUnlocked: true };
  } catch (error: unknown) {
    return { isUnlocked: false, error: error instanceof Error ? error.message : '解锁失败' };
  }
}

async function verifyTotp(
  totpCode: string,
): Promise<{ isUnlocked: boolean; error?: string }> {
  try {
    const result = await apiClient.post<{ mfaRequired: boolean; sessionToken: string | null }>(
      '/auth/verify-totp', { totpCode },
    );
    if (result.sessionToken) await apiClient.setSessionToken(result.sessionToken);
    return { isUnlocked: true };
  } catch (error: unknown) {
    return { isUnlocked: false, error: error instanceof Error ? error.message : '验证失败' };
  }
}
