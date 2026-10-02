# Onsetto QA Automation Challenge

- **Part 1** – `ui/`: Playwright + TypeScript, Page Object Model, one login reused via storage state.
- **Part 2** – `api/`: pytest tests against the REST API, plus a cross-layer UI-vs-API integrity check.

Fake test data only (shared sandbox account `candidate1@onsetto.test`).

## Part 1 – UI

```bash
cd ui
npm install
npx playwright test --headed       # add --headed to watch the browser; npm run report for the HTML report
```
Tests run in the **Google Chrome installed on your machine** (no browser download).

**Structure**
- `tests/auth.setup.ts` follows the user path (home → *Log in* → email/password → 4-digit MFA → `/app/...`) once and saves `.auth/user.json`. The `chrome` project depends on it, so tests start from a saved session (see Tradeoffs for the MFA detail).
- `src/selectors.ts` is the only place with locators. The account form uses `data-testid`; the login and MFA screens have no test ids, so they use element ids / attributes / button text.
- `src/pages/` holds the page objects; `src/fixtures.ts` takes each account test to the Account page through the sidebar.
- `tests/navigation.spec.ts` checks the home → login path.

**Covered (16 tests + 1 setup step)**
- *Navigation / login:* home → *Log in* → login page; empty credentials blocked; invalid credentials show an error alert and no MFA step; MFA *Verify* disabled until a full 4-digit code is entered; valid code → landing page (the shared setup step).
- *Banking:* empty fields → error alert; 8-digit routing → error names routing; 3-digit account → error names account; valid save → success alert, summary shows only the last 4 digits of routing and account, "Last updated" is today.
- *Payment:* empty fields → error alert; month / year / CVC left empty (one parametrized test) → error about that field; Luhn-fail card; past expiry; 2-digit CVC; valid save → success alert, summary shows "VISA ending in 4242", expiry, and today's date, never the full number or CVC.

Validation errors in this app appear as **toast notifications** (not inline text under the field), so negative tests assert the toast message names the right field (e.g. "Routing number must be exactly 9 digits") and does not name the other one.

## Part 2 – API + cross-layer

```bash
cd api
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
pytest -v                          # everything
pytest -v -m "not cross_layer"     # API only, no browser
```
Env vars (optional): `API_BASE_URL`, `BASE_URL`, `ONSETTO_USER`, `ONSETTO_PASS`, `ONSETTO_MFA`.

**What is asserted** (field names from the API Docs page, kept in `contract.py`)
- Two-step auth: `POST /auth/token {email,password}` → `mfa_token`, then `POST /auth/mfa/verify {mfa_token,code}` → `access_token`, shared for the session.
- Banking: response contains `routing_masked`, `account_masked`, `token`; the visible digits equal the last 4 of what was sent and the mask length matches; neither full number appears anywhere in the body.
- Payment: `card_brand`, `last4`, `exp_month`, `exp_year`, `token`; values match input; full card number and CVC are never returned.
- Validation: invalid routing (8 / 10 digits, non-numeric) rejected with an error naming the routing field; account number 4 and 17 digits accepted, 3 and 18 rejected; Luhn-fail card, past expiry, short/long CVC rejected.
- Security: missing or invalid bearer token → 401/403 with no account data (checked on both PUT endpoints and `/me`); wrong password gives no `mfa_token`.
- The API is limited to 30 requests/minute/user, so calls are shared via module fixtures and `conftest.py` retries on 429. Run Part 1 and Part 2 one after another, not at the same time (they share the limit).

## Why the cross-layer check matters

Onsetto switches real bank accounts, so the dangerous bug is **the UI and the stored data disagreeing**: the user sees "…4242" while the backend persisted different digits (a transformation or truncation bug, a swapped routing/account field, an off-by-one in masking, a stale cache or an old draft saved). A UI-only test sees a plausible summary and passes; a status-code-only test sees `200` and passes. Only comparing what the API reports with what the page renders exposes the gap.

**What I found:** the page does not call the documented `PUT /account/banking` / `/account/payment` endpoints. Its Save button writes straight to the database (`POST /rest/v1/bank_accounts` and `/rest/v1/payment_methods`, upserting on `user_id`) and gets no masked confirmation back. So the product has two separate write paths for the same data, which is exactly where the two layers can drift apart. `test_cross_layer.py` therefore works like this:
- Banking and card: save through the real UI, then send the same values through the documented API and compare the API's masked confirmation with the summary the page shows (digits, brand, month and year).
- API write → reload the page → the UI must show what the API stored.
- The tests also print which fields the UI sends to the database, so the finding is visible in the run output.

**Masking differences:** the docs show `routing_masked` as `•••••0021` and the UI summary renders `Routing: •••••0021  |  Account: ••••••••9012`; the card summary reads `VISA ending in 4242 | Expires 2/2031` (month without a leading zero) while the API returns `card_brand: "visa"`, `last4`, numeric `exp_month`/`exp_year`. The tests therefore compare the visible digits, brand (case-insensitive) and numeric month/year rather than forcing identical strings, and print both formats so differences are documented, not hidden.

## Additional cases I would cover with more time

- **Auth / MFA:** *Cancel and sign out*, *Logout*, session expiry; logged-out `/app/account` redirecting to login.
- **Banking:** over-length account number in the UI (the input caps at 17 digits via `maxlength`; the server-side 18-digit rule is already covered in the API tests); routing with 10 digits or letters.
- **Payment:** card wrong length / spaces; current-month expiry boundary; month `13`; 4-digit CVC; empty cardholder name; saving twice.
- **Cross-layer / API:** JSON-schema validation of responses; lockout and rate-limit behaviour.
- **Non-functional:** accessibility of error messages, cross-browser projects, CI, randomised data per run.

## Tradeoffs
- Timeboxed and representative, not exhaustive.
- Shared sandbox data: all tests save to one account, so Playwright is set to a single worker (`workers: 1`) to avoid tests overwriting each other's summary.
- Errors are toasts that disappear after a few seconds, so assertions run right after the click. Only the routing message text is matched exactly; the other messages are matched by field keyword (`FIELD` in `account.spec.ts`), so a wording change would need a small update there. The success alert is a toast of type `success`.
- Authenticate-once covers the password step only. The app asks for the MFA code again in every new browser window (it stays on `/login`), so the account fixture enters the 4-digit code when it sees the MFA screen. Opening `/app/account` directly did not show the form, so the fixture starts at the landing page and clicks Account in the sidebar, like a user.
- The summary shows "Last updated" in the browser's own date format (e.g. `10/3/2026, 1:20:11 AM`), so the test builds today's date the same way. 
- The summary box only appears after something has been saved, so the tests check it after saving rather than comparing before and after.

## AI tooling
I used Claude to help 
- setup the project Structure
- write a first version of this README
- in TypeScript as i am new to TypeScript
- in code validation and optimization
- in code coverage Validation
