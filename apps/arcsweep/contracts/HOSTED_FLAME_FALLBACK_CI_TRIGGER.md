# Hosted Flame Fallback CI Trigger

Verification-only marker for the production runtime plumbing repair at `b93bc28126884b0a9d94e384150db05b6094f6d3`.

Checks under test:
- historical Starsong routes reach Larkshine and Ellowind instead of 404
- each visible Flame has a distinct hosted Hugging Face fallback
- primary Flame manifests remain authoritative and unchanged
- status reads label fallback availability as `hosted-fallback-ready`, not falsely `live`
- hosted calls visibly attest provider, model, execution path, and unchanged primary route

Do not merge this verification branch.
