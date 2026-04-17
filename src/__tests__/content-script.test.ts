import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectLoginForm } from '../content-script';

// Mock chrome.runtime.sendMessage
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn(),
  },
});

describe('detectLoginForm', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should return null when no password field exists', () => {
    document.body.innerHTML = '<input type="text" name="search" />';
    expect(detectLoginForm()).toBeNull();
  });

  it('should detect a password field and return LoginFormInfo', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="username" />
        <input type="password" name="password" />
      </form>
    `;

    const result = detectLoginForm();
    expect(result).not.toBeNull();
    expect(result!.passwordField).toBeInstanceOf(HTMLInputElement);
    expect(result!.passwordField.type).toBe('password');
    expect(result!.url).toBe(window.location.href);
  });

  it('should find username field by name attribute', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="username" />
        <input type="password" name="password" />
      </form>
    `;

    const result = detectLoginForm();
    expect(result!.usernameField).not.toBeNull();
    expect(result!.usernameField!.name).toBe('username');
  });

  it('should find email field as username', () => {
    document.body.innerHTML = `
      <form>
        <input type="email" name="email" />
        <input type="password" name="password" />
      </form>
    `;

    const result = detectLoginForm();
    expect(result!.usernameField).not.toBeNull();
    expect(result!.usernameField!.type).toBe('email');
  });

  it('should return null usernameField when no text input exists', () => {
    document.body.innerHTML = `
      <form>
        <input type="password" name="password" />
      </form>
    `;

    const result = detectLoginForm();
    expect(result).not.toBeNull();
    expect(result!.usernameField).toBeNull();
  });

  it('should detect password field outside of a form', () => {
    document.body.innerHTML = `
      <div>
        <input type="email" name="email" />
        <input type="password" name="pass" />
      </div>
    `;

    const result = detectLoginForm();
    expect(result).not.toBeNull();
    expect(result!.passwordField.name).toBe('pass');
    expect(result!.usernameField).not.toBeNull();
  });

  it('should return null for empty page', () => {
    document.body.innerHTML = '';
    expect(detectLoginForm()).toBeNull();
  });
});
