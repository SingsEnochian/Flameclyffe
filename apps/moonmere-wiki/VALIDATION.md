# Moonmere Archive Validation

Validated locally against the isolated app directory on 2026-06-12.

## Passed

- `npm run typecheck`
- `npm run lint`
- `NEXT_TELEMETRY_DISABLED=1 npm run build`

## Generated routes

- `/`
- `/books`
- `/books/the-luna-who-called-down-the-moon`
- `/characters`
- `/characters/eira-catrine-windmere`
- `/characters/iestyn-rhydian-caerwyn`
- `/galleries`
- `/magic`
- `/timeline`
- `/windmere`
- `/api/revalidate`

## Scope boundary

This validation confirms compilation, static generation, and route assembly in mock-data mode. It does not claim live Notion access, Netlify deployment, or browser-observed production behaviour. Those remain separate validation gates.
