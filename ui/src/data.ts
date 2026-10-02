/** Fake test data only. */
const YEAR = new Date().getFullYear();

export const VALID_ROUTING = '021000021'; // 9 digits
export const VALID_ACCOUNT = '123456789012'; // 12 digits (allowed: 4-17)
export const VALID_CARD = '4242424242424242'; // Luhn-valid test number
export const LUHN_FAIL_CARD = '4242424242424241'; // last digit changed -> Luhn fails
export const CARDHOLDER = 'Test Candidate';
export const CVC = '123';

// The UI has separate Month (MM) and Year (YYYY) fields. Computed so the data never goes stale.
export const EXP_MONTH = '12';
export const FUTURE_YEAR = String(YEAR + 3);
export const PAST_YEAR = String(YEAR - 2);

export function luhnValid(n: string): boolean {
  let sum = 0;
  [...n].reverse().forEach((ch, i) => {
    let d = Number(ch);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  });
  return sum % 10 === 0;
}
