import pytest
import contract as c
from helpers import body_text

BANK = {"routing_number": "021000021", "account_number": "1234567890"}
LEAK_KEYS = ("routing_masked", "account_masked", "last4", "card_brand", "token")

def _no_account_data(r):
    t = body_text(r)
    for k in LEAK_KEYS:
        assert f'"{k}"' not in t, f"unauthenticated response leaks '{k}': {t[:200]}"
    assert "1234567890" not in t

@pytest.mark.parametrize("path", ["/account/banking", "/account/payment"])
def test_missing_token_rejected(anon, path):
    r = anon.req("PUT", path, token=None, json=BANK)
    assert r.status_code in (401, 403)
    _no_account_data(r)

@pytest.mark.parametrize("path", ["/account/banking", "/account/payment"])
def test_invalid_token_rejected(anon, path):
    r = anon.req("PUT", path, token="not.a.real.token", json=BANK)
    assert r.status_code in (401, 403)
    _no_account_data(r)

def test_profile_requires_auth(anon):
    r = anon.req("GET", "/me", token=None)
    assert r.status_code in (401, 403)
    assert c.USER not in body_text(r)

def test_bad_password_rejected_without_mfa_token(anon):
    r = anon.req("POST", "/auth/token", token=None, json={"email": c.USER, "password": "wrong-password"})
    assert r.status_code in (400, 401, 403)
    assert "mfa_token" not in body_text(r)
