import { test, expect } from '@playwright/test';

// Run logged-out: this test checks the path a new visitor takes from the challenge URL.
test.use({ storageState: { cookies: [], origins: [] } });

test('home page "Log in" leads to the login form', async ({ page }) => {
  await page.goto('/'); // the URL from the invitation email lands on the home page, not the login form
  await expect(page.getByRole('heading', { name: 'Integration Engineer Challenge' })).toBeVisible();

  // The home page Log in button has no test id (it is a button inside <a href="/login">), so use role + text.
  await page.getByRole('link', { name: 'Log in' }).first().click();

  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('#email')).toBeVisible();
  await expect(page.locator('#password')).toBeVisible();
});
