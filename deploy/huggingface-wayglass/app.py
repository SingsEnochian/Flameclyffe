"""Wayglass Hugging Face Space gateway. No fake local kernel or silent fallback."""
import os
import json
import urllib.request
import urllib.error
import urllib.parse
import gradio as gr

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None

OPENER = urllib.request.build_opener(NoRedirect)


GATEWAY = os.environ.get("WAYGLASS_RESPOND_URL", "")
TOKEN = os.environ.get("WAYGLASS_GATEWAY_TOKEN", "")
MAX_BYTES = 64_000
OWNER_USER = os.environ.get("WAYGLASS_OWNER_USER", "")
OWNER_PASSWORD = os.environ.get("WAYGLASS_OWNER_PASSWORD", "")

def ready():
    if not all(isinstance(value, str) and value.strip() and value == value.strip() for value in (GATEWAY, TOKEN, OWNER_USER, OWNER_PASSWORD)):
        return False
    # urllib encodes Authorization as Latin-1; reject non-ASCII bearer material before any request.
    if any(ord(char) < 33 or ord(char) > 126 for char in TOKEN):
        return False
    if GATEWAY != GATEWAY.strip() or any(ord(char) < 33 or ord(char) == 127 for char in GATEWAY):
        return False
    parsed = urllib.parse.urlparse(GATEWAY)
    try:
        port = parsed.port
    except ValueError:
        return False
    # Validate the URL before the first network call; never let encoded path
    # separators or a malformed authority alter the authenticated route.
    return (
        parsed.scheme == "https"
        and bool(parsed.hostname)
        and (port is None or 1 <= port <= 65535)
        and "@" not in parsed.netloc and not parsed.username and not parsed.password
        and not parsed.fragment and not parsed.query
        and parsed.path.endswith("/respond")
        and all(segment not in ("", ".", "..") for segment in parsed.path.split("/")[1:])
        and not parsed.path.startswith("//")
        and "%" not in parsed.path
        and "\\" not in parsed.path
    )


def call_kernel(message, history):
    if not ready():
        return "Wayglass kernel not connected. Configure private WAYGLASS_RESPOND_URL and WAYGLASS_GATEWAY_TOKEN in Space secrets before enabling conversation."
    if not isinstance(message, str) or not message.strip() or len(message) > 8000:
        return "Please enter a message under 8,000 characters."
    # Reject lone UTF-16 surrogates before transport; JSON escaping otherwise hides
    # malformed Unicode from the byte-budget and downstream display contracts.
    if any(0xD800 <= ord(ch) <= 0xDFFF for ch in message):
        return "Please enter a message with valid Unicode text."
    if len(message.encode("utf-8")) > 32000:
        return "Please enter a message under 8,000 characters."
    # Preserve bounded context; never trust client-supplied privileged roles.
    prior = []
    if isinstance(history, list):
        for turn in history[-24:]:
            if not isinstance(turn, dict):
                continue
            role, content = turn.get("role"), turn.get("content")
            if role in ("user", "assistant") and isinstance(content, str) and len(content) <= 8000 and not any(0xD800 <= ord(ch) <= 0xDFFF for ch in content) and len(content.encode("utf-8")) <= 32000:
                prior.append({"role": role, "content": content})
    # Reserve the new turn before selecting history so the complete request stays bounded.
    # This is a transport budget, not a limit on what the owner may write locally.
    budget = max(0, MAX_BYTES - len(json.dumps(message).encode("utf-8")) - 4_000)
    # Bound the aggregate context, not only each turn. Preserve newest turns first.
    selected = []
    for turn in reversed(prior):
        size = len(json.dumps(turn).encode("utf-8"))
        if size > budget:
            break
        selected.append(turn)
        budget -= size
    prior = list(reversed(selected))
    # The configured endpoint must be an owner-authenticated Wayglass conversation adapter.
    # Never point this at a public unauthenticated model endpoint.
    payload = json.dumps({"input": message, "history": prior, "route_id": "wayglass:ship", "character_id": "wayglass", "interaction": {"channel": "OOC"}, "world_id": "wayglass:home", "surface_id": "huggingface-kernel-entrance"}).encode("utf-8")
    if len(payload) > MAX_BYTES:
        return "Wayglass request exceeds the private transport limit; no request sent."
    req = urllib.request.Request(
        GATEWAY,
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + TOKEN},
        method="POST",
    )
    try:
        with OPENER.open(req, timeout=25) as response:
            if getattr(response, "status", 200) != 200:
                return "Wayglass kernel unreachable or response invalid. No simulated reply was generated."
            raw = response.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                return "Wayglass returned an oversized response; no content displayed."
            # Duplicate JSON keys make attribution ambiguous across parsers; fail closed.
            def unique_object(pairs):
                result = {}
                for key, value in pairs:
                    if key in result:
                        raise ValueError("duplicate response key")
                    result[key] = value
                return result
            data = json.loads(raw, object_pairs_hook=unique_object)
            if not isinstance(data, dict) or not isinstance(data.get("receipt"), dict):
                return "Wayglass returned an invalid receipt envelope."
            if data.get("schema") != "wayglass.route-turn/v0.1" or data.get("route_id") != "wayglass:ship" or data.get("receipt", {}).get("character_id") != "wayglass" or not isinstance(data.get("receipt", {}).get("observation_id"), str) or not data["receipt"]["observation_id"].strip() or len(data["receipt"]["observation_id"]) > 128 or not all(char.isascii() and (char.isalnum() or char in "-_:.") for char in data["receipt"]["observation_id"]):
                return "Kernel provenance missing. Refusing to present an unattributed response as Wayglass."
            if not isinstance(data.get("output"), str) or not data["output"].strip() or len(data["output"]) > 32000:
                return "Wayglass returned no attributable speech; receipt retained upstream."
            # Reject controls that could spoof attribution or observation receipts.
            if any(
                (ord(ch) < 32 and ch not in "\n\t")
                or ord(ch) == 127
                or 0x80 <= ord(ch) <= 0x9f
                or 0x202a <= ord(ch) <= 0x202e
                or 0x2066 <= ord(ch) <= 0x2069
                or 0xD800 <= ord(ch) <= 0xDFFF
                for ch in data["output"]
            ):
                return "Wayglass returned unsafe display controls; no speech displayed."
            return data["output"] + "\n\nObservation: " + str(data["receipt"]["observation_id"])
    except (OSError, TimeoutError, ValueError, KeyError):
        return "Wayglass kernel unreachable or response invalid. No simulated reply was generated."

with gr.Blocks(title="Wayglass · Kernel Entrance") as demo:
    gr.Markdown("# Wayglass · Kernel Entrance\nOwner-authenticated, receipt-bearing conversations. No simulated kernel.")
    gr.ChatInterface(fn=call_kernel, type="messages", api_name=False)
if __name__ == "__main__":
    if not ready():
        raise SystemExit("Wayglass Space disabled: owner gate, HTTPS gateway and token must all be configured.")
    demo.launch(auth=(OWNER_USER, OWNER_PASSWORD), show_api=False)
