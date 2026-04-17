import type { LoginFormInfo } from './types';

/**
 * Content Script - Login form detection.
 *
 * Detects `input[type="password"]` elements on the page, extracts the page URL,
 * and sends a LOGIN_FORM_DETECTED message to the Service Worker when a login form is found.
 */

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

  // Try to find a username field near the password field
  const usernameField = findUsernameField(passwordField);

  return {
    url: window.location.href,
    usernameField,
    passwordField,
  };
}

/**
 * Find a likely username/email input field associated with the password field.
 * Looks for text/email inputs in the same form or nearby in the DOM.
 */
function findUsernameField(
  passwordField: HTMLInputElement,
): HTMLInputElement | null {
  const form = passwordField.closest('form');
  const container = form ?? document;

  // Look for common username field patterns
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

/**
 * Notify the Service Worker that a login form was detected.
 */
function notifyServiceWorker(url: string): void {
  chrome.runtime.sendMessage({ type: 'LOGIN_FORM_DETECTED', url });
}

/**
 * Run detection on the current page.
 */
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
