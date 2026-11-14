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
    if not (GATEWAY and TOKEN and OWNER_USER and OWNER_PASSWORD):
        return False
    parsed = urllib.parse.urlparse(GATEWAY)
    return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password and not parsed.fragment and not parsed.query and parsed.path.endswith("/respond") and not parsed.path.startswith("//") and parsed.port not in (0,)


def call_kernel(message, history):
    if not ready():
        return "Wayglass kernel not connected. Configure private WAYGLASS_RESPOND_URL and WAYGLASS_GATEWAY_TOKEN in Space secrets before enabling conversation."
    if not message or len(message) > 8000:
        return "Please enter a message under 8,000 characters."
    # The configured endpoint must be an owner-authenticated Wayglass conversation adapter.
    # Never point this at a public unauthenticated model endpoint.
    payload = json.dumps({"input": message, "route_id": "wayglass:ship", "character_id": "wayglass", "interaction": {"channel": "OOC"}, "world_id": "wayglass:home", "surface_id": "huggingface-kernel-entrance"}).encode("utf-8")
    req = urllib.request.Request(
        GATEWAY,
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + TOKEN},
        method="POST",
    )
    try:
        with OPENER.open(req, timeout=25) as response:
            raw = response.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                return "Wayglass returned an oversized response; no content displayed."
            data = json.loads(raw)
            if not isinstance(data, dict) or not isinstance(data.get("receipt"), dict):
                return "Wayglass returned an invalid receipt envelope."
            if data.get("schema") != "wayglass.route-turn/v0.1" or data.get("route_id") != "wayglass:ship" or data.get("receipt", {}).get("character_id") != "wayglass" or not data.get("receipt", {}).get("observation_id"):
                return "Kernel provenance missing. Refusing to present an unattributed response as Wayglass."
            if not isinstance(data.get("output"), str) or not data["output"].strip():
                return "Wayglass returned no attributable speech; receipt retained upstream."
            return data["output"] + "\n\nObservation: " + str(data["receipt"]["observation_id"])
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as exc:
        return "Wayglass kernel unreachable or response invalid. No simulated reply was generated."

with gr.Blocks(title="Wayglass · Kernel Entrance") as demo:
    gr.Markdown("# Wayglass · Kernel Entrance\nOwner-authenticated, receipt-bearing conversations. No simulated kernel.")
    gr.ChatInterface(fn=call_kernel, type="messages", api_name=False)
if __name__ == "__main__":
    if not ready():
        raise SystemExit("Wayglass Space disabled: owner gate, HTTPS gateway and token must all be configured.")
    demo.launch(auth=(OWNER_USER, OWNER_PASSWORD), show_api=False)
