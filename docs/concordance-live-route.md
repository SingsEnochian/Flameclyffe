# Concordance Live Route

Status: deployment route note. Last reconciled 2026-06-16.

Pocket Concordance Lens is a separate Vite app in:

```text
apps/pocket-concordance-lens
```

The STARWELL Vercel deployment serves the main STARWELL build from:

```text
dist/starwell
```

The Pocket Concordance Lens is exposed on the same public deployment by two cooperating paths.

First, STARWELL has a multipage entry:

```text
apps/starwell/concordance/index.html
```

That entry mounts the Pocket Concordance Lens React source from:

```text
apps/pocket-concordance-lens/src/main.jsx
```

It is included in the STARWELL Vite input map so a plain STARWELL build can emit:

```text
dist/starwell/concordance/index.html
```

Second, the STARWELL build script also runs the Pocket Concordance Lens Vercel-shaped build:

```text
vite build --config apps/starwell/vite.config.js
vite build --config apps/pocket-concordance-lens/vite.vercel.config.js
```

The second config writes the Pocket Concordance Lens standalone build into the same public route folder:

```text
dist/starwell/concordance
```

Expected public routes:

```text
/concordance
/concordance/
```

The STARWELL Vite base now defaults to `/` for Vercel-style root hosting. For GitHub Pages-style hosting, pass an explicit base when building:

```text
STARWELL_BASE=/Flameclyffe/starwell-react-lab/ npm run starwell:build
```

The original Pocket Lens config remains available for its standalone / GitHub Pages-shaped build:

```text
apps/pocket-concordance-lens/vite.config.js
```

The Vercel-shaped config is:

```text
apps/pocket-concordance-lens/vite.vercel.config.js
```

Do not duplicate the Pocket Concordance Lens source into STARWELL. Either mount the source as a STARWELL multipage entry or build the Pocket app into the STARWELL output route.
