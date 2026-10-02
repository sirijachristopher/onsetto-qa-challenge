import { test as setup } from '@playwright/test';
import { LoginPage } from '../src/pages/LoginPage';
import { STORAGE_STATE } from '../playwright.config';

const USER = process.env.ONSETTO_USER ?? 'candidate1@onsetto.test';
const PASS = process.env.ONSETTO_PASS ?? 'Password123!';

setup('authenticate once and save storage state', async ({ page }) => {
  const login = new LoginPage(page);
  await login.goto();
  await login.login(USER, PASS);
  await page.context().storageState({ path: STORAGE_STATE });
});
