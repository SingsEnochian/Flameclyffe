"""Wayglass Hugging Face Space gateway. No fake local kernel or silent fallback."""
import os
import json
import urllib.request
import urllib.error
import gradio as gr

GATEWAY = os.environ.get("WAYGLASS_GATEWAY_URL", "").rstrip("/")
TOKEN = os.environ.get("WAYGLASS_GATEWAY_TOKEN", "")
MAX_BYTES = 64_000

def call_kernel(message, history):
    if not GATEWAY or not TOKEN:
        return "Wayglass kernel not connected. Configure private WAYGLASS_GATEWAY_URL and WAYGLASS_GATEWAY_TOKEN in Space secrets before enabling conversation."
    if not message or len(message) > 8000:
        return "Please enter a message under 8,000 characters."
    # The configured endpoint must be an owner-authenticated Wayglass conversation adapter.
    # Never point this at a public unauthenticated model endpoint.
    payload = json.dumps({"message": message, "history": (history or [])[-12:]}).encode("utf-8")
    req = urllib.request.Request(
        GATEWAY + "/api/wayglass/ask",
        data=payload,
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + TOKEN},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=25) as response:
            raw = response.read(MAX_BYTES + 1)
            if len(raw) > MAX_BYTES:
                return "Wayglass returned an oversized response; no content displayed."
            data = json.loads(raw)
            if data.get("source") != "wayglass-kernel" or not data.get("receipt_id"):
                return "Kernel provenance missing. Refusing to present an unattributed response as Wayglass."
            return str(data.get("reply", "No reply")) + "\n\nReceipt: " + str(data["receipt_id"])
    except (urllib.error.URLError, TimeoutError, ValueError, KeyError) as exc:
        return "Wayglass kernel unreachable or response invalid. No simulated reply was generated."

with gr.Blocks(title="Wayglass · Kernel Entrance") as demo:
    gr.Markdown("# Wayglass · Kernel Entrance\nOwner-authenticated, receipt-bearing conversations. No simulated kernel.")
    gr.ChatInterface(fn=call_kernel, type="messages")
if __name__ == "__main__":
    demo.launch()
