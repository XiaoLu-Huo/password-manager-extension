import type { LoginFormInfo, CredentialListItem, ExtensionMessage } from './types';

console.log('[PM] Content script loaded on:', window.location.href);

/**
 * Content Script - Comprehensive login form detection and auto-fill.
 *
 * When a login form is detected and matching credentials exist,
 * shows an inline dropdown below the focused input field (like iCloud Passwords).
 * User clicks a credential to auto-fill username + password.
 */

// ---- Login Form Detection ----

export function detectLoginForm(): LoginFormInfo | null {
  const passwordFields = findAllPasswordFields();
  if (passwordFields.length === 0) return null;
  const passwordField = passwordFields.find(isVisible) ?? passwordFields[0];
  const usernameField = findUsernameField(passwordField);
  return { url: window.location.href, usernameField, passwordField };
}

function findAllPasswordFields(): HTMLInputElement[] {
  const results: HTMLInputElement[] = [];
  document.querySelectorAll<HTMLInputElement>('input[type="password"]')
    .forEach((el) => results.push(el));
  if (results.length === 0) {
    const hints = [
      'input[autocomplete="current-password"]', 'input[autocomplete="new-password"]',
      'input[name*="pass" i]', 'input[id*="pass" i]',
      'input[name*="pwd" i]', 'input[id*="pwd" i]', 'input[name*="mima" i]',
      'input[placeholder*="密码"]', 'input[placeholder*="password" i]',
    ];
    for (const sel of hints) {
      try { document.querySelectorAll<HTMLInputElement>(sel).forEach((el) => { if (!results.includes(el)) results.push(el); }); } catch {}
    }
  }
  return results;
}

function findUsernameField(passwordField: HTMLInputElement): HTMLInputElement | null {
  const container = passwordField.closest('form')
    ?? passwordField.closest('div[class*="login" i], div[class*="sign" i], div[id*="login" i], div[id*="sign" i]')
    ?? document;
  const selectors = [
    'input[autocomplete="username"]', 'input[autocomplete="email"]',
    'input[type="email"]', 'input[type="tel"]',
    'input[type="text"][name*="user" i]', 'input[type="text"][name*="email" i]',
    'input[type="text"][name*="login" i]', 'input[type="text"][name*="account" i]',
    'input[type="text"][name*="phone" i]', 'input[type="text"][id*="user" i]',
    'input[type="text"][id*="email" i]', 'input[type="text"][id*="login" i]',
    'input[type="text"][id*="account" i]',
    'input[name*="user" i]', 'input[name*="email" i]', 'input[name*="account" i]',
    'input[id*="user" i]', 'input[id*="email" i]',
    'input[placeholder*="用户" i]', 'input[placeholder*="邮箱" i]',
    'input[placeholder*="手机" i]', 'input[placeholder*="账号" i]',
    'input[placeholder*="username" i]', 'input[placeholder*="email" i]',
    'input[placeholder*="phone" i]',
    'input[type="text"]', 'input:not([type])',
  ];
  for (const selector of selectors) {
    try {
      const candidates = container.querySelectorAll<HTMLInputElement>(selector);
      for (const field of candidates) {
        if (field !== passwordField && isVisible(field) && !isHiddenInput(field)) return field;
      }
    } catch {}
  }
  return null;
}

function isVisible(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  if (el.offsetParent !== null) {
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
  }
  return true;
}

function isHiddenInput(el: HTMLInputElement): boolean {
  return el.type === 'hidden' || el.getAttribute('aria-hidden') === 'true';
}

// ---- Auto-Fill ----

export function fillCredentials(username: string, password: string): boolean {
  const formInfo = detectLoginForm();
  if (!formInfo) return false;
  if (formInfo.usernameField) setInputValue(formInfo.usernameField, username);
  setInputValue(formInfo.passwordField, password);
  return true;
}

function setInputValue(input: HTMLInputElement, value: string): void {
  input.focus();
  const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (nativeSetter) nativeSetter.call(input, value);
  input.value = value;
  input.dispatchEvent(new Event('focus', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'a' }));
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'a' }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

// ---- Inline Dropdown (appears below focused input, like iCloud Passwords) ----

const PM_DROPDOWN_ID = 'pm-autofill-dropdown';
let activeDropdown: HTMLDivElement | null = null;
let matchedCredentials: CredentialListItem[] = [];
let trackedInputs: Set<HTMLInputElement> = new Set();

function removeDropdown(): void {
  if (activeDropdown) { activeDropdown.remove(); activeDropdown = null; }
}

function showDropdownBelowInput(input: HTMLInputElement, credentials: CredentialListItem[]): void {
  removeDropdown();
  if (credentials.length === 0) return;

  const rect = input.getBoundingClientRect();
  const dropdown = document.createElement('div');
  dropdown.id = PM_DROPDOWN_ID;
  dropdown.style.cssText = `
    position: fixed;
    top: ${rect.bottom + 4}px;
    left: ${rect.left}px;
    width: ${Math.max(rect.width, 260)}px;
    max-height: 220px;
    overflow-y: auto;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  `;

  // Header
  const header = document.createElement('div');
  header.style.cssText = 'padding:6px 10px;font-size:11px;color:#888;border-bottom:1px solid #eee;display:flex;align-items:center;gap:4px;';
  header.textContent = '🔑 Password Manager';
  dropdown.appendChild(header);

  // Credential items
  for (const cred of credentials) {
    const item = document.createElement('div');
    item.style.cssText = 'padding:8px 10px;cursor:pointer;border-bottom:1px solid #f5f5f5;display:flex;align-items:center;gap:8px;';
    item.innerHTML = `
      <div style="width:28px;height:28px;border-radius:50%;background:#4285f4;color:#fff;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;flex-shrink:0;">
        ${escapeHtml(cred.accountName.charAt(0).toUpperCase())}
      </div>
      <div style="overflow:hidden;">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(cred.username)}</div>
        <div style="font-size:11px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(cred.accountName)}${cred.url ? ' · ' + escapeHtml(cred.url) : ''}</div>
      </div>
    `;
    item.addEventListener('mouseenter', () => { item.style.background = '#f0f4ff'; });
    item.addEventListener('mouseleave', () => { item.style.background = '#fff'; });
    item.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent input blur
      handleDropdownSelect(cred);
    });
    dropdown.appendChild(item);
  }

  document.body.appendChild(dropdown);
  activeDropdown = dropdown;

  // Reposition if dropdown goes off-screen
  requestAnimationFrame(() => {
    if (!activeDropdown) return;
    const dRect = activeDropdown.getBoundingClientRect();
    if (dRect.bottom > window.innerHeight) {
      activeDropdown.style.top = `${rect.top - dRect.height - 4}px`;
    }
    if (dRect.right > window.innerWidth) {
      activeDropdown.style.left = `${window.innerWidth - dRect.width - 8}px`;
    }
  });
}

async function handleDropdownSelect(credential: CredentialListItem): Promise<void> {
  removeDropdown();
  try {
    const data = await chrome.runtime.sendMessage({ type: 'AUTO_FILL', credentialId: credential.id });
    if (data && !data.error) fillCredentials(data.username, data.password);
  } catch { /* user can retry via popup */ }
}

function escapeHtml(str: string): string {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ---- Attach focus/blur listeners to login inputs ----

function attachInputListeners(formInfo: LoginFormInfo): void {
  const inputs = [formInfo.usernameField, formInfo.passwordField].filter(Boolean) as HTMLInputElement[];
  for (const input of inputs) {
    if (trackedInputs.has(input)) continue;
    trackedInputs.add(input);

    input.addEventListener('focus', () => {
      if (matchedCredentials.length > 0) {
        showDropdownBelowInput(input, matchedCredentials);
      }
    });

    input.addEventListener('blur', () => {
      // Delay removal so mousedown on dropdown item fires first
      setTimeout(removeDropdown, 150);
    });

    // Also show on click (some inputs are already focused when page loads)
    input.addEventListener('click', () => {
      if (matchedCredentials.length > 0 && !activeDropdown) {
        showDropdownBelowInput(input, matchedCredentials);
      }
    });
  }
}

// ---- Close dropdown on outside click or scroll ----

document.addEventListener('click', (e) => {
  if (activeDropdown && !activeDropdown.contains(e.target as Node)) {
    removeDropdown();
  }
}, true);

document.addEventListener('scroll', removeDropdown, true);
window.addEventListener('resize', removeDropdown);

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

// ---- Service Worker Notification & Detection ----

function fetchMatchingCredentials(url: string): void {
  console.log('[PM] Fetching credentials for:', url);
  chrome.runtime.sendMessage(
    { type: 'LOGIN_FORM_DETECTED', url },
    (response) => {
      if (chrome.runtime.lastError) {
        console.log('[PM] Runtime error:', chrome.runtime.lastError.message);
        return;
      }
      console.log('[PM] Got credentials:', response?.length ?? 0);
      if (Array.isArray(response) && response.length > 0) {
        matchedCredentials = response;
        const formInfo = detectLoginForm();
        if (formInfo) {
          attachInputListeners(formInfo);
          const focused = document.activeElement as HTMLInputElement;
          if (focused === formInfo.usernameField || focused === formInfo.passwordField) {
            showDropdownBelowInput(focused, matchedCredentials);
          }
        }
      }
    },
  );
}

function getPageUrl(): string {
  // In iframes, try to get the top-level URL for better matching
  try { return top?.location?.href ?? window.location.href; } catch { /* cross-origin */ }
  
  // For cross-origin iframes, try to extract the real page URL from:
  // 1. document.referrer (usually the parent page URL)
  // 2. URL query parameters (some sites embed the parent URL, e.g. 163 mail)
  if (document.referrer) {
    try {
      const referrerHost = new URL(document.referrer).hostname;
      // If referrer is a different domain, it's likely the parent page
      if (referrerHost !== window.location.hostname) {
        return document.referrer;
      }
    } catch { /* invalid referrer */ }
  }
  
  // Check URL params for embedded parent URLs (common pattern for login iframes)
  try {
    const params = new URLSearchParams(window.location.search);
    for (const [, value] of params) {
      if (value.startsWith('http')) {
        const parsed = new URL(value);
        if (parsed.hostname !== window.location.hostname) {
          return value;
        }
      }
    }
  } catch { /* ignore */ }
  
  return window.location.href;
}

let lastDetectedUrl = '';
let detectionAttempts = 0;

function runDetection(): void {
  const formInfo = detectLoginForm();
  if (formInfo) {
    console.log('[PM] Login form detected, password field:', formInfo.passwordField.name || formInfo.passwordField.id || 'unnamed');
    attachInputListeners(formInfo);
    const currentUrl = getPageUrl();
    // Retry fetching if we haven't got credentials yet (vault may have been locked initially)
    if (currentUrl !== lastDetectedUrl || (matchedCredentials.length === 0 && detectionAttempts < 3)) {
      lastDetectedUrl = currentUrl;
      detectionAttempts++;
      fetchMatchingCredentials(currentUrl);
    }
  }
}

// Run on load
runDetection();

// Retry after a delay (for pages that load forms dynamically or vault unlock timing)
setTimeout(runDetection, 2000);
setTimeout(runDetection, 5000);

// Watch for dynamically added forms
if (document.body) {
  const observer = new MutationObserver(() => runDetection());
  observer.observe(document.body, { childList: true, subtree: true });
}
