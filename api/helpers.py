import json, re
from datetime import date

def digits(s) -> str:
    return re.sub(r"\D", "", str(s))

def luhn_ok(n: str) -> bool:
    s = 0
    for i, ch in enumerate(reversed(n)):
        d = int(ch)
        if i % 2:
            d = d * 2 - 9 if d * 2 > 9 else d * 2
        s += d
    return s % 10 == 0

def future_year(years=3) -> int:
    return date.today().year + years

def body_text(resp) -> str:
    try:
        return json.dumps(resp.json(), ensure_ascii=False)
    except ValueError:
        return resp.text

def split_mask(masked: str):
    """'•••••0021' -> (5, '0021'): number of mask characters and the visible digits."""
    m = re.fullmatch(r"([^\d]*)(\d+)", masked.strip())
    assert m, f"unexpected mask format: {masked!r}"
    return len(m.group(1)), m.group(2)
