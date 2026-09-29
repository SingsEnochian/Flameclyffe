# MirageFS adapter assessment

Source: [SSL-ACTX/mirage-fs](https://github.com/SSL-ACTX/mirage-fs), reviewed at commit `e199f5d` (2026-09-29). License: AGPL-3.0.

MirageFS is a Rust steganographic filesystem that stores encrypted data in carrier media and exposes FUSE/WebDAV and a web UI. It includes Argon2id/XChaCha20-Poly1305, timestamp controls, remote-media support, and optional anonymous upload providers.

## Decision

Add as a reviewed external substrate, not as a browser/runtime dependency. No MirageFS binary, FUSE mount, covert carrier, remote uploader, or `--format` operation is invoked by Flameclyffe. The current ArcSweep contract remains provider- and storage-neutral.

## Why

The project is potentially useful for a future local-first encrypted artifact adapter, but it introduces AGPL obligations, privileged filesystem behavior, destructive formatting, covert-storage concerns, and network exfiltration risk through upload providers. Those concerns are outside the Presence Fabric slice and must not silently become continuity or authority infrastructure.

## Future gate

Any adapter must be a separately reviewed capability with explicit user consent, visible mount/teardown state, credential isolation, threat modeling, license review, and tests proving that identity, continuity, and authority remain owned by ArcSweep. Until then MirageFS is research input only (`EXTERNAL_RESEARCH`, not canon or production authority).
