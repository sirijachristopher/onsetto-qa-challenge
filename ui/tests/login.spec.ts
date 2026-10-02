import { test, expect } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';

// These tests exercise the login screens themselves, so they run logged-out.
test.use({ storageState: { cookies: [], origins: [] } });

const USER = process.env.ONSETTO_USER ?? 'candidate1@onsetto.test';
const PASS = process.env.ONSETTO_PASS ?? 'Password123!';

test('empty email and password -> login is blocked with an alert', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.submitCredentials('', '');
  // The email field is `required`, so the browser's own validation may stop the submit before the app shows a toast.
  await expect.poll(async () => (await login.blockedByBrowserValidation()) || (await login.errorToast().isVisible())).toBe(true);
  await expect(login.mfaInput()).toHaveCount(0);
  await expect(page).toHaveURL(/\/login/);
});

test('invalid credentials -> error alert and no MFA step', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.submitCredentials('wrong.user@onsetto.test', 'Wrong-Password-1');
  await expect(login.errorToast()).toBeVisible();
  await expect(login.mfaInput()).toHaveCount(0);
  await expect(page).toHaveURL(/\/login/);
});

test('MFA page: Verify stays disabled until a full 4-digit code is entered', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.submitCredentials(USER, PASS);
  await expect(login.verifyButton()).toBeDisabled();           // nothing entered
  await login.mfaInput().fill('12');
  await expect(login.verifyButton()).toBeDisabled();           // incomplete code
  await login.mfaInput().fill('1234');
  await expect(login.verifyButton()).toBeEnabled();            // complete code
});
