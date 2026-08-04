# Build Hygiene Patch v0.1

## Purpose

This note records the first build hygiene patch after the workflow/build preflight.

## Findings

- The repository has a root `package.json` for the Flameclyffe workshop.
- Scripts exist for Sigil Activator, STARWELL, Project Zero Companion, and Everos sandbox utilities.
- Dependencies currently use `latest`, which is flexible but not reproducible.
- `package-lock.json` exists but is not a fully resolved lockfile; it mirrors `latest` entries.
- GitHub Pages deploy workflow exists at `.github/workflows/pages.yml`.
- The Pages workflow builds STARWELL React Observatory Lab and copies it to `/starwell-react-lab/` while preserving `/starwell/` as the canonical live glyph instrument channel.

## Patch applied

- Added `.nvmrc` with Node `24`.
- Updated Pages workflow to use `node-version-file: .nvmrc`.
- Added npm dependency caching in the workflow.

## Why Node 24

Node 24 is the current official LTS line as checked during this patch. Production builds should use Active LTS or Maintenance LTS rather than arbitrary Current releases.

## Why `npm install` remains temporary

The workflow still uses:

```text
npm install
```

This is deliberate for the first patch because the current lockfile is not a fully resolved dependency tree. Switching to `npm ci` before generating a proper lockfile could break deployment.

## Next build hygiene pass

1. Replace broad `latest` dependency entries with pinned semver ranges or exact versions.
2. Generate a real `package-lock.json` from a clean install.
3. Switch workflow install command from `npm install` to `npm ci`.
4. Add an `engines` field to `package.json` once the Node target is confirmed across local and CI.
5. Confirm Vite/React plugin compatibility under Node 24.
6. Confirm Pages deployment still preserves `/starwell/` and publishes `/starwell-react-lab/` correctly.

## Boundary

Do not continue piling UI modules onto the build without first stabilising the dependency/runtime surface. The mythframe needs elegant code, not dependency fog.

## Withness note

This patch aligns the workshop compass. The lockfile still needs sharpening.
