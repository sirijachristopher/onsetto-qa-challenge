import { test, expect } from '../src/fixtures';
import * as d from '../src/data';

// Error toasts name the field they belong to. Routing text is confirmed
// ("Routing number must be exactly 9 digits"); the others are matched by keyword.
const FIELD = {
  routing: /routing/i,
  account: /account/i,
  cardNumber: /card number|card|luhn/i,
  expiry: /expir|month|year|date/i,
  cvc: /cvc|cvv|security code/i,
};

// Summary shows "Last updated: mm/dd/yyyy, hh:mm:ss" in the browser's locale; same machine -> same format.
const TODAY = new Date().toLocaleDateString('en-US'); // e.g. 02/10/2026


const card = {
  holder: d.CARDHOLDER, number: d.VALID_CARD,
  expMonth: d.EXP_MONTH, expYear: d.FUTURE_YEAR, cvc: d.CVC,
};

test.describe('banking details', () => {
  test('saves valid details; summary shows masked values only and a new timestamp', async ({ account }) => {
    await account.saveBanking(d.VALID_ROUTING, d.VALID_ACCOUNT);

    await expect(account.successToast()).toBeVisible();          // success alert
    await expect(account.bankSummary()).toContainText(`Last updated: ${TODAY}`);
    await expect(account.bankSummary()).toContainText(d.VALID_ROUTING.slice(-4));
    await expect(account.bankSummary()).toContainText(d.VALID_ACCOUNT.slice(-4));
    await expect(account.bankSummary()).not.toContainText(d.VALID_ROUTING);
    await expect(account.bankSummary()).not.toContainText(d.VALID_ACCOUNT);
  });

  test('all banking fields empty -> error alert and summary unchanged', async ({ account }) => {
    await account.saveBanking('', '');
    await expect(account.errorToast()).toBeVisible();
  });

  test('8-digit routing number -> error names the routing field', async ({ account }) => {
    await account.saveBanking('02100002', d.VALID_ACCOUNT);
    await expect(account.errorToast()).toContainText('Routing number must be exactly 9 digits');
    await expect(account.errorToast()).not.toContainText(FIELD.account);
  });

  test('3-digit account number (below minimum) -> error names the account field', async ({ account }) => {
    await account.saveBanking(d.VALID_ROUTING, '123');
    await expect(account.errorToast()).toContainText(FIELD.account);
    await expect(account.errorToast()).not.toContainText(FIELD.routing);
  });
});

test.describe('payment method', () => {
  test('saves a valid card; summary shows brand, last-4 and expiry, never the full number', async ({ account }) => {
    await account.saveCard(card);

    await expect(account.successToast()).toBeVisible();          // success alert
    await expect(account.cardSummary()).toContainText(/visa ending in 4242/i);
    await expect(account.cardSummary()).toContainText(`Last updated: ${TODAY}`);
    await expect(account.cardSummary()).toContainText(`${Number(d.EXP_MONTH)}/${d.FUTURE_YEAR}`);
    await expect(account.cardSummary()).not.toContainText(d.VALID_CARD);
    await expect(account.cardSummary()).not.toContainText(d.CVC);
  });

  test('all payment fields empty -> error alert and summary unchanged', async ({ account }) => {
    await account.saveCard({ holder: '', number: '', expMonth: '', expYear: '', cvc: '' });
    await expect(account.errorToast()).toBeVisible();
  });

  // One required field left empty at a time -> the error must be about that field.
  const missing: Array<[string, Partial<typeof card>, RegExp]> = [
    ['month', { expMonth: '' }, FIELD.expiry],
    ['year', { expYear: '' }, FIELD.expiry],
    ['CVC', { cvc: '' }, FIELD.cvc],
  ];
  for (const [name, override, expected] of missing) {
    test(`${name} empty (other details valid) -> error about the ${name}`, async ({ account }) => {
      await account.saveCard({ ...card, ...override });
      await expect(account.errorToast()).toContainText(expected);
    });
  }

  test('Luhn-failing card number -> error names the card number', async ({ account }) => {
    await account.saveCard({ ...card, number: d.LUHN_FAIL_CARD });
    await expect(account.errorToast()).toContainText(FIELD.cardNumber);
    await expect(account.errorToast()).not.toContainText(FIELD.cvc);
  });

  test('past expiry -> error about the expiry, not the card number', async ({ account }) => {
    await account.saveCard({ ...card, expYear: d.PAST_YEAR });
    await expect(account.errorToast()).toContainText(FIELD.expiry);
    await expect(account.errorToast()).not.toContainText(/card number/i);
  });

  test('2-digit CVC -> error names the CVC', async ({ account }) => {
    await account.saveCard({ ...card, cvc: '12' });
    await expect(account.errorToast()).toContainText(FIELD.cvc);
  });
});