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

To expose the Pocket Concordance Lens on the same public deployment, the STARWELL build script now runs two builds:

```text
vite build --config apps/starwell/vite.config.js
vite build --config apps/pocket-concordance-lens/vite.vercel.config.js
```

The second config writes the Pocket Concordance Lens build into:

```text
dist/starwell/concordance
```

Expected public route:

```text
/concordance/
```

The original Pocket Lens config remains available for its standalone / GitHub Pages-shaped build:

```text
apps/pocket-concordance-lens/vite.config.js
```

The Vercel-shaped config is:

```text
apps/pocket-concordance-lens/vite.vercel.config.js
```

Do not duplicate the Pocket Concordance Lens source into STARWELL. Build it into the STARWELL output instead.
