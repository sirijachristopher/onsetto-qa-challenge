import { test as base } from '@playwright/test';
import { AccountPage } from './pages/AccountPage';
import { LoginPage } from './pages/LoginPage';

const USER = process.env.ONSETTO_USER ?? 'candidate1@onsetto.test';
const PASS = process.env.ONSETTO_PASS ?? 'Password123!';

// The saved login only remembers the password step. In a new browser window the app asks
// for the MFA code again (it stays on /login). So: open the app, answer whichever login step
// is shown, then open Account through the sidebar like a user would.
export const test = base.extend<{ account: AccountPage }>({
  account: async ({ page }, use) => {
    const login = new LoginPage(page);
    const accountLink = page.getByRole('link', { name: 'Account' });

    await page.goto('/app/marketplace');
    await accountLink.or(login.email()).or(login.mfaInput()).first().waitFor();

    if (await login.email().isVisible()) {
      await login.submitCredentials(USER, PASS); // saved login was not kept at all
      await login.submitMfa();
    } else if (await login.mfaInput().isVisible()) {
      await login.submitMfa();                   // password remembered, MFA asked again
    }

    await accountLink.click();
    await page.getByTestId('bank-routing').waitFor();
    await use(new AccountPage(page));
  },
});
export { expect } from '@playwright/test';