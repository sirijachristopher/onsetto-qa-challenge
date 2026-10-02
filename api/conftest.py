import time
import pytest
import requests
import contract as c


class Api:
    """Thin wrapper around requests: base URL, bearer token, and retry on 429 (limit: 30 req/min/user)."""

    def __init__(self):
        self.session, self.token = requests.Session(), None

    def req(self, method, path, token="default", **kw):
        headers = kw.pop("headers", {})
        tok = self.token if token == "default" else token
        if tok:
            headers["Authorization"] = f"Bearer {tok}"
        for attempt in range(4):
            r = self.session.request(method, c.BASE_URL + path, headers=headers, timeout=20, **kw)
            if r.status_code != 429 or attempt == 3:
                return r
            time.sleep(float(r.headers.get("Retry-After") or 0) or 15 * (attempt + 1))
        return r


def login(api: Api) -> str:
    """Two-step auth: /auth/token -> mfa_token, /auth/mfa/verify -> bearer token."""
    r1 = api.req("POST", "/auth/token", token=None, json={"email": c.USER, "password": c.PASS})
    assert r1.status_code == 200, f"/auth/token -> {r1.status_code} {r1.text}"
    r2 = api.req("POST", "/auth/mfa/verify", token=None,
                 json={"mfa_token": r1.json()["mfa_token"], "code": c.MFA_CODE})
    assert r2.status_code == 200, f"/auth/mfa/verify -> {r2.status_code} {r2.text}"
    return r2.json()["access_token"]


@pytest.fixture(scope="session")
def api():
    a = Api()
    a.token = login(a)      # once per session
    return a


@pytest.fixture
def anon():
    return Api()            # no token
