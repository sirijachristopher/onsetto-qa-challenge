import { Page, Locator, expect } from '@playwright/test';
import { S } from '../selectors';

export class LoginPage {
  constructor(private page: Page) {}

  // Follow the same path as a real user: the invitation URL lands on the home page, then click "Log in".
  // That button has no test id (it is a button inside <a href="/login">), so it is found by role + text.
  async goto() {
    await this.page.goto('/');
    await this.page.getByRole('link', { name: 'Log in' }).first().click();
    await expect(this.page).toHaveURL(/\/login/);
  }

  email(): Locator { return this.page.locator(S.login.username); }
  mfaInput(): Locator { return this.page.locator(S.login.mfaCode); }
  verifyButton(): Locator { return this.page.getByRole('button', { name: S.login.mfaSubmitName }); }
  errorToast(): Locator { return this.page.locator('[data-sonner-toast][data-type="error"]').first(); }

  async submitCredentials(user: string, pass: string) {
    await this.email().fill(user);
    await this.page.locator(S.login.password).fill(pass);
    await this.page.getByRole('button', { name: S.login.submitName }).click();
  }

  async submitMfa(code = '1234') {
    await this.mfaInput().fill(code); // 4 digits, any code accepted
    await this.verifyButton().click();
  }

  async login(user: string, pass: string, mfa = '1234') {
    await this.submitCredentials(user, pass);
    await this.submitMfa(mfa);
    await expect(this.page).toHaveURL(/\/app/);
  }

  /** True if the browser itself blocked the submit (HTML5 `required` / type=email validation). */
  async blockedByBrowserValidation(): Promise<boolean> {
    return this.page.locator('form').first().evaluate((f: HTMLFormElement) => !f.checkValidity());
  }
}
