# Workshop Rule 01 — No Blind Commits to Public Pages

Working pages are best pages.

Before any public-facing page is committed to `main` or shipped to GitHub Pages, it must pass the workshop check.

## Principle

Build first.
Preview second.
Inspect third.
Commit fourth.
Deploy last.

No blind commits.
No "it probably works."
No spaghetti dragon.

## Required Checks

### A. Build Check

- [ ] `npm install` completes.
- [ ] `npm run starwell:build` completes without errors.
- [ ] Any other affected app builds successfully.
- [ ] No unresolved imports.
- [ ] No missing source files.

### B. Local Preview Check

- [ ] `npm run starwell:preview` runs.
- [ ] Page loads locally.
- [ ] No white screen.
- [ ] No obvious console explosions.
- [ ] Primary interaction works.
- [ ] Active chamber or current page state renders.

### C. Link Check

- [ ] Main hub link works.
- [ ] STARWELL link works.
- [ ] Subpage links work.
- [ ] Return / home links work.
- [ ] Source links work if included.
- [ ] External links open where expected.

### D. Asset Check

- [ ] CSS loads.
- [ ] Images and icons load.
- [ ] Fonts load or degrade gracefully.
- [ ] No missing static assets.
- [ ] Fallback route exists where needed.
- [ ] GitHub Pages path does not point into source-only folders.

### E. Visual Sanity Check

- [ ] Desktop layout looks correct.
- [ ] Tablet layout looks correct.
- [ ] Mobile layout looks correct.
- [ ] Text remains legible.
- [ ] Navigation remains usable.
- [ ] Nothing looks obviously generic or broken.
- [ ] The page has a project-specific visual identity, not starter-template sludge.

### F. GitHub Pages / Deployment Check

- [ ] Vite `base` path is correct.
- [ ] Workflow path triggers include changed files.
- [ ] GitHub Pages source is correct.
- [ ] Expected public route exists.
- [ ] Branch fallback page exists if needed.
- [ ] Public URL is tested after deployment.

### G. Commit Discipline

- [ ] Commit message explains what changed.
- [ ] Experimental work is not mixed into unrelated fixes.
- [ ] No secrets or private values are committed.
- [ ] No generated junk is committed accidentally.
- [ ] If unverified, do not commit to `main`.

## Suggested Workflow

1. Work in a sandbox or feature branch when possible.
2. Build.
3. Preview.
4. Inspect links and layout.
5. Fix.
6. Rebuild.
7. Commit.
8. Deploy.
9. Verify the live page.

## Release Gate

Use this mini-check before calling a page ready:

- [ ] Built.
- [ ] Previewed.
- [ ] Linked.
- [ ] Responsive.
- [ ] Deploy path confirmed.
- [ ] Public URL tested.

## Deployment Note

If the page is intended for GitHub Pages, the live route must be checked after deployment.

A page is not done because the repo contains code.
A page is done when the public door actually opens.

## Motto

Working pages are best pages.
