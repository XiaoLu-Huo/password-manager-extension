import type { LoginFormInfo, CredentialListItem, ExtensionMessage } from './types';

/**
 * Content Script - Login form detection and auto-fill.
 *
 * Detects `input[type="password"]` elements on the page, extracts the page URL,
 * and sends a LOGIN_FORM_DETECTED message to the Service Worker when a login form is found.
 * Also handles FILL_CREDENTIALS messages to fill username/password into form fields.
 */

// ---- Login Form Detection ----

/**
 * Detect login forms on the current page.
 * Returns LoginFormInfo if a password field is found, null otherwise.
 */
export function detectLoginForm(): LoginFormInfo | null {
  const passwordField = document.querySelector<HTMLInputElement>(
    'input[type="password"]',
  );

  if (!passwordField) {
    return null;
  }

  const usernameField = findUsernameField(passwordField);

  return {
    url: window.location.href,
    usernameField,
    passwordField,
  };
}

/**
 * Find a likely username/email input field associated with the password field.
 */
function findUsernameField(
  passwordField: HTMLInputElement,
): HTMLInputElement | null {
  const form = passwordField.closest('form');
  const container = form ?? document;

  const selectors = [
    'input[type="email"]',
    'input[type="text"][name*="user"]',
    'input[type="text"][name*="email"]',
    'input[type="text"][name*="login"]',
    'input[type="text"][name*="account"]',
    'input[type="text"][autocomplete="username"]',
    'input[type="text"][autocomplete="email"]',
    'input[type="text"]',
  ];

  for (const selector of selectors) {
    const field = container.querySelector<HTMLInputElement>(selector);
    if (field && field !== passwordField) {
      return field;
    }
  }

  return null;
}

// ---- Auto-Fill ----

/**
 * Fill credentials into the detected login form fields.
 */
export function fillCredentials(username: string, password: string): boolean {
  const formInfo = detectLoginForm();
  if (!formInfo) return false;

  if (formInfo.usernameField) {
    setInputValue(formInfo.usernameField, username);
  }
  setInputValue(formInfo.passwordField, password);

  return true;
}

/**
 * Set an input field's value and dispatch change/input events
 * so that frameworks (React, Angular, etc.) detect the change.
 */
function setInputValue(input: HTMLInputElement, value: string): void {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
  } else {
    input.value = value;
  }

  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// ---- Auto-Fill Prompt UI (plain DOM) ----

let promptContainer: HTMLDivElement | null = null;

function showAutoFillPrompt(credentials: CredentialListItem[]): void {
  removeAutoFillPrompt();
  if (credentials.length === 0) return;

  promptContainer = document.createElement('div');
  promptContainer.id = 'pm-autofill-prompt';
  promptContainer.style.cssText = `
    position: fixed; bottom: 16px; right: 16px; width: 300px;
    background: #fff; border-radius: 8px; z-index: 2147483647;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15); border: 1px solid #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = `
    padding: 10px 12px; border-bottom: 1px solid #eee;
    display: flex; justify-content: space-between; align-items: center;
  `;
  header.innerHTML = `<span style="font-weight:600;font-size:13px">🔑 自动填充</span>`;

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.setAttribute('aria-label', '关闭');
  closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:16px;color:#888;';
  closeBtn.addEventListener('click', removeAutoFillPrompt);
  header.appendChild(closeBtn);
  promptContainer.appendChild(header);

  // Credential list
  const list = document.createElement('ul');
  list.style.cssText = 'list-style:none;max-height:200px;overflow-y:auto;margin:0;padding:0;';

  for (const cred of credentials) {
    const item = document.createElement('li');
    item.style.cssText = 'padding:8px 12px;cursor:pointer;border-bottom:1px solid #f7f7f7;';
    item.innerHTML = `
      <div style="font-weight:500;font-size:13px">${escapeHtml(cred.accountName)}</div>
      <div style="font-size:11px;color:#666">${escapeHtml(cred.username)}</div>
    `;
    item.addEventListener('click', () => handlePromptSelect(cred));
    list.appendChild(item);
  }

  promptContainer.appendChild(list);
  document.body.appendChild(promptContainer);
}

function removeAutoFillPrompt(): void {
  if (promptContainer) {
    promptContainer.remove();
    promptContainer = null;
  }
}

async function handlePromptSelect(credential: CredentialListItem): Promise<void> {
  removeAutoFillPrompt();
  try {
    const data = await chrome.runtime.sendMessage({
      type: 'AUTO_FILL',
      credentialId: credential.id,
    });
    if (data && !data.error) {
      fillCredentials(data.username, data.password);
    }
  } catch {
    // Silently fail - user can retry via popup
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---- Message Listener ----

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse) => {
    if (message.type === 'FILL_CREDENTIALS') {
      const success = fillCredentials(message.username, message.password);
      sendResponse({ success });
    }
    return false;
  },
);

// ---- Service Worker Notification ----

function notifyServiceWorker(url: string): void {
  chrome.runtime.sendMessage(
    { type: 'LOGIN_FORM_DETECTED', url },
    (response) => {
      if (Array.isArray(response) && response.length > 0) {
        showAutoFillPrompt(response);
      }
    },
  );
}

// ---- Detection Runner ----

function runDetection(): void {
  const formInfo = detectLoginForm();
  if (formInfo) {
    notifyServiceWorker(formInfo.url);
  }
}

// Run detection when the script loads (document_idle)
runDetection();

// Observe DOM changes to detect dynamically added login forms
const observer = new MutationObserver(() => {
  runDetection();
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
