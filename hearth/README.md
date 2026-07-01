# The Hearth

Organ One: **The Mirror**.

This folder is scaffolding for a local Hearth mirror of selected Flameclyffe/Supabase tables. It is intentionally manual: nothing here auto-runs, no browser page imports it, and no cloud fetch starts on page load.

## Mirror Rule

The Mirror writes dated local folders:

```text
hearth/mirror/YYYY-MM-DD/
```

Each run writes:

- one JSON file per exported table
- `manifest.json` with timestamp, source project id, tables attempted, row counts, omissions, errors, and status

The Mirror fails closed when Supabase credentials are missing. It may still write a failed manifest so the refusal is visible.

## Credentials

Do not commit secrets.

Use environment variables:

```bash
SUPABASE_URL="https://PROJECT_ID.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="..."
```

or copy `hearth/config/hearth.config.example.json` to `hearth/config/hearth.config.json` and keep the real config untracked. Prefer environment variables for credentials.

## Run Manually

```bash
node hearth/scripts/mirror_supabase_to_hearth.mjs
```

Optional config path:

```bash
node hearth/scripts/mirror_supabase_to_hearth.mjs hearth/config/hearth.config.json
```

## Privacy Boundary

The Mirror must not ingest raw private chat unless it is explicitly marked shareable. Rows marked private, sensitive, constellation-private, or non-shareable are omitted by default. These omissions are counted in the manifest.

Seed extraction and witness extraction are future steps. The Mirror does not fake those outputs.

## TODO

- TODO(seed extraction): derive curated seed-memory candidates from explicitly shareable mirror rows only.
- TODO(witness extraction): derive witness fragments from explicitly shareable observation rows only.
- TODO(review): compare table names with the live Supabase project before the first manual run.
