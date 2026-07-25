# Atomic Chat upstream notice

Upstream project: `AtomicBot-ai/Atomic-Chat`

Upstream repository: `https://github.com/AtomicBot-ai/Atomic-Chat`

Root licence observed during the v0.1 investigation: Apache License 2.0.

Atomic Chat also contains inherited and component-level code with its own metadata and notices. The repository must not be treated as one undifferentiated licence block.

## v0.1 use

Flameclyffe does not copy or redistribute Atomic Chat source in Atomic Engine Bridge v0.1.

The House-owned bridge communicates with an independently installed Atomic Chat process through its documented OpenAI-compatible loopback API at `/v1`.

## Future adoption law

Before any Atomic Chat engine, extension, Rust crate, model-management component, or user-interface code is copied or modified:

1. identify the exact upstream path and commit;
2. record its licence and notices;
3. record local modifications;
4. retain required attribution;
5. audit telemetry, network, filesystem, and process permissions;
6. import the smallest coherent component rather than the full repository;
7. keep the upstream boundary reversible.

This notice is provenance documentation, not legal advice.
