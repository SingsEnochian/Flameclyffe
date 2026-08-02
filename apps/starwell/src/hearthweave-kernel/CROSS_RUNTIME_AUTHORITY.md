# Cross-Runtime Authority Boundary

Hearthgate currently has two executable packet forms:

- `hearthgate.dual-aspect-packet.v1` — the Python Hearthgate Kernel packet;
- `hearthweave.dual-aspect-packet/v1` — the browser Hearthweave / Arcsweep packet.

They are complementary runtime expressions, not independent truths.

## Activation law

A Python packet may activate alone after the loopback Living Engine independently accepts it through both:

- `POST /v1/hearthgate/audit`
- `POST /v1/hearthgate/replay`

When a browser Hearthweave packet is already active, the Python packet may activate only when a `hearthgate.cross-runtime-correspondence/v1` receipt verifies:

1. the registered House correspondence;
2. all six PREMAQ axes within the declared tolerance;
3. the temporal skew within policy;
4. canon foundation and overlay sovereignty;
5. the Python authority proof;
6. the Hearthweave packet and shared-state fingerprints;
7. the submitted correspondence receipt's own bind fingerprint.

Missing, stale, failed, tampered, or unregistered correspondence fails closed with:

```text
HEARTHGATE_RIVAL_ACTIVE_STATE
```

## Trust boundary

JavaScript does not accept a packet merely because its embedded claims say `VERIFIED`. The Python service revalidates the complete Pydantic packet, recomputes correspondence and sensory projections, verifies the receipt against the body, and replays the packet hash. The resulting authority proof is then bound into the cross-runtime receipt.

Test-only verifier injection exists solely to exercise deterministic failure paths without starting the loopback service. Production clients use the loopback authority endpoints.
