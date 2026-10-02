import { Page, Locator } from '@playwright/test';
import { S } from '../selectors';

export type Card = { holder: string; number: string; expMonth: string; expYear: string; cvc: string };

export class AccountPage {
  constructor(private page: Page) {}
  private byId = (id: string): Locator => this.page.getByTestId(id);

  async goto() { await this.page.goto('/app/account'); }

  // ---- inputs (exposed for assertions like maxlength) ----
  get accountInput() { return this.byId(S.bank.account); }

  // ---- actions ----
  async saveBanking(routing: string, account: string) {
    await this.byId(S.bank.routing).fill(routing);
    await this.byId(S.bank.account).fill(account);
    await this.byId(S.bank.save).click();
  }

  async saveCard(c: Card) {
    await this.byId(S.card.holder).fill(c.holder);
    await this.byId(S.card.number).fill(c.number);
    await this.byId(S.card.expMonth).fill(c.expMonth);
    await this.byId(S.card.expYear).fill(c.expYear);
    await this.byId(S.card.cvc).fill(c.cvc);
    await this.byId(S.card.save).click();
  }

  // ---- summaries ----
  bankSummary() { return this.byId(S.bank.summary); }
  cardSummary() { return this.byId(S.card.summary); }

  /**
   * Validation errors are shown as sonner toasts, e.g.
   * <li data-sonner-toast data-type="error"><div data-title>Routing number must be exactly 9 digits</div></li>
   * (confirmed for the routing message; other messages are matched by field keyword).
   */
  errorToast(): Locator {
    return this.page.locator('[data-sonner-toast][data-type="error"]').first();
  }

  /** Success confirmation toast (sonner type "success"). */
  successToast(): Locator {
    return this.page.locator('[data-sonner-toast][data-type="success"]').first();
  }
}
