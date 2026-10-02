import pytest
from helpers import body_text, digits, split_mask
import contract as c

ROUTING, ACCOUNT = "021000021", "123456789012"

def put(api, routing=ROUTING, account=ACCOUNT):
    return api.req("PUT", "/account/banking", json={"routing_number": routing, "account_number": account})

@pytest.fixture(scope="module")
def saved(api):                      # one call shared by the tests below (30 req/min limit)
    return put(api)

def test_update_returns_documented_fields(saved):
    assert saved.status_code == 200, saved.text
    assert c.BANKING_RESPONSE_KEYS <= set(saved.json())

def test_confirmation_is_masked_and_matches_input(saved):
    body = saved.json()
    for key, original in (("routing_masked", ROUTING), ("account_masked", ACCOUNT)):
        mask_len, visible = split_mask(body[key])
        assert visible == original[-4:], f"{key} shows wrong last-4: {body[key]}"
        assert mask_len == len(original) - 4, f"{key} mask length does not match the stored length"

def test_sensitive_values_never_returned_in_clear_text(saved):
    text = body_text(saved)
    assert ROUTING not in text and ACCOUNT not in text
    assert digits(saved.json()["account_masked"]) == ACCOUNT[-4:]

@pytest.mark.parametrize("routing", ["02100002", "0210000211", "abcdefghi"])
def test_invalid_routing_rejected_with_field_level_error(api, routing):
    r = put(api, routing=routing)
    assert r.status_code in (400, 422), (routing, r.status_code, r.text)
    assert "routing" in body_text(r).lower(), "error should name the routing field"

@pytest.mark.parametrize("account,ok", [("1" * 4, True), ("1" * 17, True), ("1" * 3, False), ("1" * 18, False)])
def test_account_number_length_boundaries(api, account, ok):
    r = put(api, account=account)
    if ok:
        assert r.status_code == 200, r.text
    else:
        assert r.status_code in (400, 422), (len(account), r.status_code)
        assert "account" in body_text(r).lower()
