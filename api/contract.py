"""API contract - taken from the site's API Docs page."""
import os

BASE_URL = os.environ.get("API_BASE_URL", "https://zvyhufnwclhcvmgtqxwp.supabase.co/functions/v1/api-v1")
SITE_URL = os.environ.get("BASE_URL", "https://marketplace.dev-challenge.com")
USER = os.environ.get("ONSETTO_USER", "candidate1@onsetto.test")
PASS = os.environ.get("ONSETTO_PASS", "Password123!")
MFA_CODE = os.environ.get("ONSETTO_MFA", "1234")

# POST /auth/token        {email, password}            -> {mfa_required, mfa_token, message}
# POST /auth/mfa/verify   {mfa_token, code}            -> {access_token, token_type, expires_in, refresh_token}
# PUT  /account/banking   {routing_number, account_number} -> {routing_masked, account_masked, token}
# PUT  /account/payment   {cardholder_name, card_number, exp_month, exp_year, cvc} -> {card_brand, last4, exp_month, exp_year, token}
BANKING_RESPONSE_KEYS = {"routing_masked", "account_masked", "token"}
PAYMENT_RESPONSE_KEYS = {"card_brand", "last4", "exp_month", "exp_year", "token"}
# Documented limit: 30 requests / minute / user.
