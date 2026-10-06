# Hugging Face host route

Route: hf:inference. Set HF_TOKEN in the Hearthgate process environment.
The token needs Make calls to Inference Providers permission.
WAYGLASS_HF_MODEL chooses the server-owned model ID. Default:
openai/gpt-oss-120b:fastest.

Endpoint: https://router.huggingface.co/v1/chat/completions
Source: https://huggingface.co/docs/inference-providers/en/index

This uses HF provider selection for a specified model. It does not implement
HuggingChat Omni's automatic choice between different models.
Requests use the existing instruction and verified inheritance assembly.
Receipts distinguish requested model from returned model; upstream provider
is unknown unless independently supplied by an authoritative response.

Local tests capture HTTP provider transport; no live HF inference was run.
A browser login or a token configured in another application does not set
the Hearthgate environment. Never place tokens in browser code or commits.
