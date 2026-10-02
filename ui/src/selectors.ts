/**
 * Locators, taken from the real pages' HTML.
 * Login + MFA screens have no test ids (plain ids / attributes / button text).
 * The account page has data-testid AND id on every input and button.
 */
export const S = {
  login: {
    username: '#email',
    password: '#password',
    submitName: 'Sign in',
    mfaCode: 'input[data-input-otp]', // ONE hidden 4-digit input
    mfaSubmitName: 'Verify',          // disabled until 4 digits are entered
  },
  bank: {
    routing: 'bank-routing',
    account: 'bank-account',
    save: 'bank-save',
    summary: 'bank-saved-info',
  },
  card: {
    holder: 'card-holder',
    number: 'card-number',
    expMonth: 'card-exp-month',
    expYear: 'card-exp-year',
    cvc: 'card-cvc',
    save: 'card-save',
    summary: 'payment-saved-info',
  },
} as const;
