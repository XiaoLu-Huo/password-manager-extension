import { describe, it, expect, vi, beforeEach } from 'vitest';
import { detectLoginForm, fillCredentials } from '../content-script';

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

describe('fillCredentials', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('should fill username and password into form fields', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="username" />
        <input type="password" name="password" />
      </form>
    `;

    const result = fillCredentials('testuser', 'testpass');
    expect(result).toBe(true);

    const usernameInput = document.querySelector<HTMLInputElement>('input[name="username"]');
    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
    expect(usernameInput!.value).toBe('testuser');
    expect(passwordInput!.value).toBe('testpass');
  });

  it('should fill only password when no username field exists', () => {
    document.body.innerHTML = `
      <form>
        <input type="password" name="password" />
      </form>
    `;

    const result = fillCredentials('testuser', 'testpass');
    expect(result).toBe(true);

    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]');
    expect(passwordInput!.value).toBe('testpass');
  });

  it('should return false when no login form exists', () => {
    document.body.innerHTML = '<div>No form here</div>';
    const result = fillCredentials('testuser', 'testpass');
    expect(result).toBe(false);
  });

  it('should dispatch input and change events on filled fields', () => {
    document.body.innerHTML = `
      <form>
        <input type="text" name="username" />
        <input type="password" name="password" />
      </form>
    `;

    const passwordInput = document.querySelector<HTMLInputElement>('input[name="password"]')!;
    const inputHandler = vi.fn();
    const changeHandler = vi.fn();
    passwordInput.addEventListener('input', inputHandler);
    passwordInput.addEventListener('change', changeHandler);

    fillCredentials('testuser', 'testpass');

    expect(inputHandler).toHaveBeenCalled();
    expect(changeHandler).toHaveBeenCalled();
  });
});
