"""Flameclyffe ML laboratory.

This package contains review-gated analytical helpers. It intentionally exposes no
function that writes directly to canon or publication tables.
"""

from .privacy import PrivacyClass, ReleaseDecision, evaluate_release
from .provenance import canonical_json, content_hash, run_fingerprint

__all__ = [
    "PrivacyClass",
    "ReleaseDecision",
    "canonical_json",
    "content_hash",
    "evaluate_release",
    "run_fingerprint",
]

__version__ = "0.1.0"
