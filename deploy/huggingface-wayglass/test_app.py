"""Regression checks for the HF entrance's authenticated, attributed response contract."""
import ast
import pathlib
import unittest

APP = pathlib.Path(__file__).with_name("app.py")

class SpaceContractTests(unittest.TestCase):
    def test_python_syntax(self):
        ast.parse(APP.read_text(encoding="utf-8"))
    def test_existing_ship_route(self):
        source = APP.read_text(encoding="utf-8")
        self.assertIn('"route_id": "wayglass:ship"', source)
        self.assertIn('"character_id": "wayglass"', source)
        self.assertIn('"channel": "OOC"', source)
        self.assertIn('parsed.path.endswith("/respond")', source)
    def test_actual_response_contract(self):
        source = APP.read_text(encoding="utf-8")
        self.assertIn('data.get("output", "No reply")', source)
        self.assertIn('data["receipt"]["observation_id"]', source)
        self.assertNotIn('data["receipt_id"]', source)
    def test_owner_gate(self):
        source = APP.read_text(encoding="utf-8")
        self.assertIn('demo.launch(auth=(OWNER_USER, OWNER_PASSWORD), show_api=False)', source)
        self.assertIn('if not ready():', source)

if __name__ == "__main__":
    unittest.main()
