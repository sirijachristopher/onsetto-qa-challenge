import pytest
import contract as c
from helpers import body_text, future_year, luhn_ok

CARD, CVC = "4242424242424242", "123"
assert luhn_ok(CARD) and not luhn_ok("4242424242424241")

def payload(**over):
    p = {"cardholder_name": "Test Candidate", "card_number": CARD,
         "exp_month": 12, "exp_year": future_year(), "cvc": CVC}
    p.update(over)
    return p

def put(api, **over):
    return api.req("PUT", "/account/payment", json=payload(**over))

@pytest.fixture(scope="module")
def saved(api):
    return put(api)

def test_update_returns_documented_fields(saved):
    assert saved.status_code == 200, saved.text
    assert c.PAYMENT_RESPONSE_KEYS <= set(saved.json())

def test_confirmation_values_match_input(saved):
    b = saved.json()
    assert b["last4"] == CARD[-4:]
    assert b["card_brand"].lower() == "visa"
    assert (int(b["exp_month"]), int(b["exp_year"])) == (12, future_year())

def test_pan_and_cvc_never_returned(saved):
    assert CARD not in body_text(saved)
    values = [str(v) for v in saved.json().values()]
    assert CVC not in values and "cvc" not in saved.json()

def test_luhn_fail_rejected_with_card_field_error(api):
    r = put(api, card_number="4242424242424241")
    assert r.status_code in (400, 422), r.text
    assert "card" in body_text(r).lower()

@pytest.mark.parametrize("over", [
    {"exp_month": 1, "exp_year": future_year(-2)},   # past expiry
    {"cvc": "12"},                                   # too short
    {"cvc": "12345"},                                # too long
], ids=["past-expiry", "cvc-too-short", "cvc-too-long"])
def test_other_invalid_inputs_rejected(api, over):
    assert put(api, **over).status_code in (400, 422)
