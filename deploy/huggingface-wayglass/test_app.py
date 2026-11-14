"""Executable regression tests for the owner-only Hugging Face Wayglass entrance.

No network, provider inference, real credentials or Gradio server is started.
"""
import ast
import importlib.util
import io
import json
import pathlib
import sys
import types
import unittest
from unittest.mock import patch

APP = pathlib.Path(__file__).with_name("app.py")


class FakeBlocks:
    def __init__(self, **kwargs):
        self.kwargs = kwargs
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload
    def __enter__(self):
        return self
    def __exit__(self, *args):
        return False
    def read(self, size):
        return self.payload[:size]


def load_app():
    gradio = types.SimpleNamespace(
        Blocks=FakeBlocks,
        Markdown=lambda *args, **kwargs: None,
        ChatInterface=lambda *args, **kwargs: None,
    )
    spec = importlib.util.spec_from_file_location("wayglass_hf_test_target", APP)
    module = importlib.util.module_from_spec(spec)
    with patch.dict(sys.modules, {"gradio": gradio}):
        spec.loader.exec_module(module)
    return module


def envelope(**changes):
    data = {
        "schema": "wayglass.route-turn/v0.1",
        "route_id": "wayglass:ship",
        "output": "Verified response",
        "receipt": {"character_id": "wayglass", "observation_id": "obs-123"},
    }
    data.update(changes)
    return json.dumps(data).encode("utf-8")


class SpaceContractTests(unittest.TestCase):
    def setUp(self):
        self.app = load_app()
        self.app.GATEWAY = "https://private.example.test/respond"
        self.app.TOKEN = "test-token-not-a-secret"
        self.app.OWNER_USER = "owner"
        self.app.OWNER_PASSWORD = "test-password-not-a-secret"

    def test_python_syntax(self):
        ast.parse(APP.read_text(encoding="utf-8"))

    def test_ready_requires_owner_gate_and_https_exact_path(self):
        self.assertTrue(self.app.ready())
        for url in [
            "http://private.example.test/respond",
            "https://user:password@private.example.test/respond",
            "https://private.example.test/respond?token=bad",
            "https://private.example.test/respond#fragment",
            "https://private.example.test/response",
        ]:
            with self.subTest(url=url):
                self.app.GATEWAY = url
                self.assertFalse(self.app.ready())
        self.app.GATEWAY = "https://private.example.test/respond"
        self.app.TOKEN = ""
        self.assertFalse(self.app.ready())

    def test_valid_attributed_response_and_bearer_request(self):
        captured = {}
        def open_response(req, timeout):
            captured["req"] = req
            captured["timeout"] = timeout
            return FakeResponse(envelope())
        with patch.object(self.app.OPENER, "open", side_effect=open_response):
            result = self.app.call_kernel("Hello", [])
        self.assertIn("Verified response", result)
        self.assertIn("Observation: obs-123", result)
        self.assertEqual(captured["timeout"], 25)
        self.assertEqual(captured["req"].get_method(), "POST")
        self.assertEqual(captured["req"].get_header("Authorization"), "Bearer test-token-not-a-secret")
        payload = json.loads(captured["req"].data)
        self.assertEqual(payload["route_id"], "wayglass:ship")
        self.assertEqual(payload["character_id"], "wayglass")
        self.assertEqual(payload["interaction"]["channel"], "OOC")

    def test_invalid_provenance_never_displays_speech(self):
        invalid = [
            envelope(schema="wrong"),
            envelope(route_id="other"),
            envelope(receipt={"character_id": "other", "observation_id": "obs-123"}),
            envelope(receipt={"character_id": "wayglass"}),
            envelope(receipt=[]),
            envelope(output=""),
            envelope(output=42),
            b"not-json",
        ]
        for raw in invalid:
            with self.subTest(raw=raw[:60]):
                with patch.object(self.app.OPENER, "open", return_value=FakeResponse(raw)):
                    result = self.app.call_kernel("Hello", [])
                self.assertNotIn("Verified response", result)
                self.assertNotIn("Observation: obs-123", result)

    def test_oversize_response_is_rejected(self):
        with patch.object(self.app.OPENER, "open", return_value=FakeResponse(b"x" * (self.app.MAX_BYTES + 1))):
            self.assertIn("oversized", self.app.call_kernel("Hello", []))

    def test_no_network_without_gate_or_valid_input(self):
        with patch.object(self.app.OPENER, "open") as open_mock:
            self.app.TOKEN = ""
            self.assertIn("not connected", self.app.call_kernel("Hello", []))
            self.app.TOKEN = "test-token"
            self.assertIn("8,000", self.app.call_kernel("x" * 8001, []))
            open_mock.assert_not_called()

    def test_redirect_handler_denies_all_redirects(self):
        handler = self.app.NoRedirect()
        for code in (301, 302, 303, 307, 308):
            self.assertIsNone(handler.redirect_request(None, None, code, "", {}, "https://untrusted.test/"))

    def test_gradio_contract_source(self):
        source = APP.read_text(encoding="utf-8")
        self.assertIn('api_name=False', source)
        self.assertIn('demo.launch(auth=(OWNER_USER, OWNER_PASSWORD), show_api=False)', source)
        self.assertIn('class NoRedirect', source)


if __name__ == "__main__":
    unittest.main()
