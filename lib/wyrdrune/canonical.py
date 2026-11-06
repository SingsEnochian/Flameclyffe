"""WCE-1 · Wyrdrune Canonical Encoding, Python reference.

Must produce byte-identical output to lib/wyrdrune/canonical.cjs for every
vector in conformance/wce1-vectors.json. RFC 8785 (JCS) rules: ECMAScript
number formatting, UTF-16 code-unit key order, minimal JSON string escaping.
"""
import hashlib
import json
import math
import re
from decimal import Decimal

_LONE = re.compile('[\ud800-\udfff]')  # Python str never pairs surrogates


def _number(x):
    if isinstance(x, bool):
        raise TypeError('bool is not a number')
    x = float(x)
    if not math.isfinite(x):
        raise ValueError('WCE-1: non-finite number')
    if x == 0:
        return '0'
    # Shortest round-trip digits, then ECMAScript Number::toString layout.
    sign = '-' if x < 0 else ''
    # repr() gives the shortest round-trip decimal; Decimal exposes its digits.
    _, dig, exponent = Decimal(repr(abs(x))).as_tuple()
    digits = ''.join(map(str, dig)).lstrip('0')
    while digits.endswith('0'):
        digits = digits[:-1]
        exponent += 1
    k = len(digits)
    n = k + exponent  # value = 0.<digits> * 10**n
    if k <= n <= 21:
        s = digits + '0' * (n - k)
    elif 0 < n <= 21:
        s = digits[:n] + '.' + digits[n:]
    elif -6 < n <= 0:
        s = '0.' + '0' * (-n) + digits
    else:
        e = n - 1
        es = ('+' if e >= 0 else '-') + str(abs(e))
        s = digits[0] + ('.' + digits[1:] if k > 1 else '') + 'e' + es
    return sign + s


def _text(s):
    if _LONE.search(s):
        raise ValueError('WCE-1: ill-formed Unicode text')
    return json.dumps(s, ensure_ascii=False)


def encode(v):
    if v is None:
        return 'null'
    if v is True:
        return 'true'
    if v is False:
        return 'false'
    if isinstance(v, (int, float)):
        return _number(v)
    if isinstance(v, str):
        return _text(v)
    if isinstance(v, (list, tuple)):
        return '[' + ','.join(encode(x) for x in v) + ']'
    if isinstance(v, dict):
        keys = sorted(v.keys(), key=lambda k: k.encode('utf-16-be'))
        return '{' + ','.join(_text(k) + ':' + encode(v[k]) for k in keys) + '}'
    raise TypeError('WCE-1: unsupported value type ' + type(v).__name__)


def digest(v):
    return 'wce1:' + hashlib.sha256(encode(v).encode('utf-8')).hexdigest()


if __name__ == '__main__':
    import sys
    vectors = json.load(open(sys.argv[1], encoding='utf-8'))
    out = [{'name': t['name'], 'encoding': encode(t['value']), 'digest': digest(t['value'])}
           for t in vectors['vectors']]
    print(json.dumps(out, ensure_ascii=False))
