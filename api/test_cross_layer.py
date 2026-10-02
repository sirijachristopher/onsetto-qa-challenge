"""
Cross-layer integrity: does the UI show what the API says it stored?

The UI saves straight to the database (/rest/v1/...), not through the documented /account/* API, so the
two layers have separate write paths. For each form we submit the values through the real UI, then send the
same values through the API and compare its masked confirmation with the summary the page shows.
A third test writes through the API and checks the UI after a reload.
"""
import os
import re
import pytest
from playwright.sync_api import sync_playwright, expect
import contract as c
from helpers import future_year, split_mask

pytestmark = pytest.mark.cross_layer
ROUTING, ACCOUNT, CARD = "021000021", "987654321012", "4242424242424242"

@pytest.fixture(scope="module")
def page():
    with sync_playwright() as p:
        channel = os.environ.get("PW_CHANNEL", "chrome")   # installed Chrome; PW_CHANNEL=bundled for Playwright's Chromium
        browser = p.chromium.launch(**({} if channel == "bundled" else {"channel": channel}))
        pg = browser.new_context().new_page()
        pg.goto(c.SITE_URL + "/")
        pg.get_by_role("link", name="Log in").first.click()
        pg.locator("#email").fill(c.USER)
        pg.locator("#password").fill(c.PASS)
        pg.get_by_role("button", name="Sign in").click()
        pg.locator("input[data-input-otp]").fill(c.MFA_CODE)
        pg.get_by_role("button", name="Verify").click()
        pg.wait_for_url("**/app/**")
        pg.goto(c.SITE_URL + "/app/account")
        yield pg
        browser.close()

def tid(page, name):
    return page.get_by_test_id(name)


def click_and_save(page, button, table):
    """Click Save and return (payload, status) of the write the page sends to the database.
    The UI does not call the documented /account/* API: it writes straight to /rest/v1/<table>."""
    with page.expect_response(lambda r: f"/rest/v1/{table}" in r.url and r.request.method in ("POST", "PATCH", "PUT")) as info:
        button.click()
    resp = info.value
    try:
        payload = resp.request.post_data_json
    except Exception:
        payload = None
    return payload, resp.status

def ui_bank_masks(text):
    m = re.search(r"Routing:\s*(\S+)\s*\|\s*Account:\s*(\S+)", text)
    assert m, f"unexpected bank summary text: {text!r}"
    return m.group(1), m.group(2)

def test_bank_masks_agree_between_api_and_ui(api, page):
    tid(page, "bank-routing").fill(ROUTING)
    tid(page, "bank-account").fill(ACCOUNT)
    payload, status = click_and_save(page, tid(page, "bank-save"), "bank_accounts")
    assert status in (200, 201, 204), f"UI save returned {status}"
    expect(tid(page, "bank-saved-info")).to_contain_text(ACCOUNT[-4:])
    ui_routing, ui_account = ui_bank_masks(tid(page, "bank-saved-info").inner_text())
    print(f"\n[ui write] fields sent to the database: {sorted(payload) if isinstance(payload, dict) else payload}")

    # same input through the documented API -> its masked confirmation must show the same digits
    r = api.req("PUT", "/account/banking", json={"routing_number": ROUTING, "account_number": ACCOUNT})
    assert r.status_code == 200, r.text
    body = r.json()
    for label, api_mask, ui_mask, original in (("routing", body["routing_masked"], ui_routing, ROUTING),
                                               ("account", body["account_masked"], ui_account, ACCOUNT)):
        assert split_mask(api_mask)[1] == split_mask(ui_mask)[1] == original[-4:], \
            f"{label}: API={api_mask!r} UI={ui_mask!r} digits disagree"
        print(f"[{label}] api={api_mask!r} ui={ui_mask!r} identical_format={api_mask == ui_mask}")

def test_card_details_agree_between_api_and_ui(api, page):
    year = future_year()
    tid(page, "card-holder").fill("Test Candidate")
    tid(page, "card-number").fill(CARD)
    tid(page, "card-exp-month").fill("11")
    tid(page, "card-exp-year").fill(str(year))
    tid(page, "card-cvc").fill("123")
    payload, status = click_and_save(page, tid(page, "card-save"), "payment_methods")
    assert status in (200, 201, 204), f"UI save returned {status}"
    expect(tid(page, "payment-saved-info")).to_contain_text(CARD[-4:])
    text = tid(page, "payment-saved-info").inner_text()
    m = re.search(r"(\w+) ending in (\d{4})\s*\|\s*Expires (\d+)/(\d{4})", text)
    assert m, f"unexpected card summary text: {text!r}"
    brand, last4, month, yr = m.group(1), m.group(2), int(m.group(3)), int(m.group(4))
    print(f"\n[ui write] fields sent to the database: {sorted(payload) if isinstance(payload, dict) else payload}")

    r = api.req("PUT", "/account/payment", json={"cardholder_name": "Test Candidate", "card_number": CARD,
                                                 "exp_month": 11, "exp_year": year, "cvc": "123"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert last4 == body["last4"] == CARD[-4:]
    assert brand.lower() == body["card_brand"].lower()
    assert (month, yr) == (int(body["exp_month"]), int(body["exp_year"])) == (11, year)
    print(f"[card] api={body['card_brand']} {body['last4']} {body['exp_month']}/{body['exp_year']} ui={text.splitlines()[0]!r}")

def test_api_write_is_reflected_in_ui(api, page):
    other = "555566667777"
    r = api.req("PUT", "/account/banking", json={"routing_number": ROUTING, "account_number": other})
    assert r.status_code == 200, r.text
    page.reload()
    expect(tid(page, "bank-saved-info")).to_contain_text(other[-4:])   # UI must show what the API stored
    assert split_mask(r.json()["account_masked"])[1] == other[-4:]