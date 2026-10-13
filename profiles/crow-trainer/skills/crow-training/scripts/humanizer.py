"""Optional, attributed Humanizer completion instrument for Crow Trainer."""
import hashlib
import json
import re
import subprocess
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

REFERENCE = Path(__file__).resolve().parent.parent / 'references' / 'HUMANIZER.json'
QUOTES = re.compile(r'(?<!\d)"[^"]+"|“[^”]+”|‘[^’]+’')
NUMBERS = re.compile(r'(?<!\d)[+-]?\d+(?:[.,]\d+)*(?!\d)')
MONTHS = 'January February March April May June July August September October November December'.split()


def canonicalize_literals(candidate, literals):
    """Restore only source-backed spelling/spacing and equivalent date formatting."""
    folded = {}
    for literal in literals:
        if literal.casefold() in folded and folded[literal.casefold()] != literal:
            raise ValueError('Case-ambiguous source literals cannot be canonicalized safely')
        folded[literal.casefold()] = literal
    changes = []
    def normalize(text):
        for literal in sorted(set(literals), key=lambda value: (-len(value), value)):
            aliases = [re.escape(literal)]
            date = re.fullmatch(r'(\d{1,2}) (' + '|'.join(MONTHS) + r') (\d{4})', literal)
            if date:
                day, month, year = date.groups()
                aliases += [rf'0?{int(day)}\.0?{MONTHS.index(month) + 1}\.{year}',
                            rf'0?{int(day)}(?:st|nd|rd|th)?\s+(?:{month}|{month[:3]}\.?)\s+{year}']
            if re.fullmatch(r'\d+(?:\.\d+)? (?:kg|g|km|m|cm|mm|ms|s|ml|L)', literal):
                aliases.append(re.escape(literal).replace(r'\ ', r'\s*'))
            pattern = re.compile(r'(?<!\w)(?:' + '|'.join(aliases) + r')(?!\w)', re.I)
            def replace(match):
                if match.group() != literal:
                    changes.append({'before': match.group(), 'after': literal, 'kind': 'source-backed-formatting'})
                return literal
            text = pattern.sub(replace, text)
        return text
    parts, start = [], 0
    for match in QUOTES.finditer(candidate):
        parts.extend([normalize(candidate[start:match.start()]), match.group()])
        start = match.end()
    parts.append(normalize(candidate[start:]))
    return ''.join(parts), changes


def protect_quotes(draft, literals=(), include_quotes=True):
    protected = {}
    prefix = 'CROWQUOTE' + hashlib.sha256(draft.encode()).hexdigest()[:12].upper()
    if prefix in draft:
        raise ValueError('Quotation marker collision')
    def replace(match):
        token = prefix + chr(65 + len(protected) // 26) + chr(65 + len(protected) % 26) + 'END'
        protected[token] = match.group()
        return token
    # Longest literal first; quotations win overlaps so each span is protected once.
    parts = ([QUOTES.pattern] if include_quotes else []) + [re.escape(value)
        for value in sorted(set(literals), key=lambda value: (-len(value), value)) if value]
    if not parts:
        return draft, protected
    return re.compile('|'.join('(?:' + part + ')' for part in parts)).sub(replace, draft), protected


def restore_quotes(candidate, protected):
    errors = [token for token in protected if candidate.count(token) != 1]
    # Do not repair corrupted, omitted or duplicated placeholders by guessing.
    if errors:
        return candidate, errors
    for token, literal in protected.items():
        candidate = candidate.replace(token, literal)
    return candidate, []


def check_preservation(draft, candidate, literals):
    errors = []
    for label, pattern in [('numbers', NUMBERS), ('quotations', QUOTES)]:
        if Counter(pattern.findall(draft)) != Counter(pattern.findall(candidate)):
            errors.append(label + '-changed')
    for value in dict.fromkeys(literals):
        if not value or value not in draft:
            raise ValueError('Required literal must occur in the original draft')
        if candidate.count(value) != draft.count(value):
            errors.append('literal-changed:' + value)
    return errors


def sha256(path):
    digest = hashlib.sha256()
    with path.open('rb') as stream:
        for chunk in iter(lambda: stream.read(8 * 1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest()


def run(args):
    spec = json.loads(REFERENCE.read_text())
    model = Path(args.model_file).resolve()
    runtime = Path(args.runtime).resolve()
    draft = Path(args.input).read_text(encoding='utf-8').strip()
    if not draft:
        raise SystemExit('Empty draft')
    if not 1 <= args.tokens <= 2048:
        raise SystemExit('Token budget must be between 1 and 2048')
    if model.stat().st_size != spec['checkpoint_bytes'] or sha256(model) != spec['checkpoint_sha256']:
        raise SystemExit('Checkpoint does not match the pinned Humanizer reference')
    for value in args.require_literal + args.protect_span:
        if not value or value not in draft:
            raise SystemExit('Required literal must occur in the original draft')
    canonicalize_literals('', args.require_literal)  # Reject ambiguous references before inference.
    model_draft, protected = protect_quotes(draft,
        (args.require_literal if args.protect_literals else []) + args.protect_span,
        include_quotes=args.protect_quotes)
    prompt = spec['instr'] + '\n\n' + model_draft + spec['sep']
    assert hashlib.sha256((spec['instr'] + '\n\nX' + spec['sep']).encode()).hexdigest()[:16] == spec['fingerprint']
    root = Path.cwd() / '.crow-trainer' / 'humanizer'
    root.mkdir(parents=True, exist_ok=True)
    folder = root / datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    folder.mkdir()
    (folder / 'draft.txt').write_text(draft, encoding='utf-8')
    (folder / 'protected-quotations.json').write_text(json.dumps(protected, indent=2) + '\n')
    prompt_file = folder / 'prompt.txt'
    prompt_file.write_text(prompt, encoding='utf-8')
    command = [str(runtime), '-m', str(model), '-f', str(prompt_file), '-no-cnv',
               '--no-display-prompt', '--simple-io', '--color', 'off', '-ngl', '0',
               '-c', '2048', '-t', '4', '-n', str(args.tokens), '--seed', '20261012',
               '--temp', '1.0', '--top-p', '0.95', '--top-k', '0', '--min-p', '0',
               '--repeat-penalty', '1.0']
    runtime_error = None
    with (folder / 'runtime-output.txt').open('w') as output, (folder / 'runtime.log').open('w') as log:
        try:
            result = subprocess.run(command, stdout=output, stderr=log, timeout=900)
            returncode = result.returncode
        except subprocess.TimeoutExpired:
            returncode = 124
        except OSError as exc:
            runtime_error = f'{type(exc).__name__}: {exc}'
            log.write(runtime_error + '\n')
            returncode = 127
    raw = (folder / 'runtime-output.txt').read_text()
    reached_eos = raw.rstrip().endswith('[end of text]')
    candidate = raw.rstrip().removesuffix('[end of text]').rstrip()
    candidate, marker_errors = restore_quotes(candidate, protected)
    (folder / 'unreviewed-model-candidate.txt').write_text(candidate + '\n')
    candidate, formatting_changes = canonicalize_literals(candidate, args.require_literal)
    (folder / 'candidate.txt').write_text(candidate + '\n')
    errors = check_preservation(draft, candidate, args.require_literal)
    errors += ['protected-marker-changed:' + token for token in marker_errors]
    try:
        runtime_digest = sha256(runtime)
    except OSError as exc:
        runtime_digest = None
        if runtime_error is None:
            runtime_error = f'{type(exc).__name__}: {exc}'
    receipt = {'instrument': 'Humanizer', 'student': 'The Crow', 'source': spec['source'],
               'revision': spec['revision'], 'checkpoint_sha256': spec['checkpoint_sha256'],
               'runtime_sha256': runtime_digest,
               'runtime_error': runtime_error, 'returncode': returncode, 'reached_eos': reached_eos,
               'draft_sha256': hashlib.sha256(draft.encode()).hexdigest(),
               'candidate_sha256': hashlib.sha256(candidate.encode()).hexdigest(),
               'preservation_errors': errors, 'protected_spans': len(protected),
               'protect_quotes': args.protect_quotes, 'protect_literals': args.protect_literals,
               'protected_explicit_spans': args.protect_span,
               'formatting_changes': formatting_changes,
               'wrapper_sha256': sha256(Path(__file__)),
               'checks_scope': 'embedded numeric and multiline quotation multisets; specified literal occurrence counts only',
               'verdict': 'held-for-review' if returncode == 0 and runtime_digest is not None and runtime_error is None and reached_eos and candidate.strip() and not errors else 'failed',
               'token_budget': args.tokens, 'completion_requires_review': True,
               'weights_updated': False, 'production_promoted': False, 'run_directory': str(folder)}
    (folder / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt, indent=2))
    if receipt['verdict'] == 'failed':
        raise SystemExit(1)


def add_command(sub):
    parser = sub.add_parser('humanize', help='Run the optional Humanizer instrument; retain draft and review receipt')
    parser.add_argument('--model-file', required=True)
    parser.add_argument('--runtime', required=True, help='Path to llama-completion')
    parser.add_argument('--input', required=True)
    parser.add_argument('--tokens', type=int, default=256)
    parser.add_argument('--require-literal', action='append', default=[])
    parser.add_argument('--protect-span', action='append', default=[],
                        help='Select one original span to mask, such as a non-negotiable phrase')
    parser.add_argument('--protect-quotes', action='store_true', default=True,
                        help='Mask quotations, then restore only intact unique markers (default)')
    parser.add_argument('--no-protect-quotes', dest='protect_quotes', action='store_false',
                        help='Diagnostic comparison: let the model rewrite quotations; preservation checks still apply')
    parser.add_argument('--protect-literals', action='store_true', default=False,
                        help='Experimental: hide required literal spans; attribution needs close review')
    parser.add_argument('--no-protect-literals', dest='protect_literals', action='store_false',
                        help='Diagnostic comparison without required-literal masking')
    parser.set_defaults(func=run)
