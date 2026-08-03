"""Command-line entry point for deterministic references and optional Torch probes."""

from __future__ import annotations

import argparse
import json
from collections.abc import Sequence

from .contracts import GeometricProbeRequest, GeometryReferenceRequest
from .reference import build_reference_snapshot
from .runtime import run_probe, torch_available


def parser() -> argparse.ArgumentParser:
    command_parser = argparse.ArgumentParser(
        prog="flameclyffe-geometric-engine",
        description="Inspect or probe the review-gated Geometric Manifold Engine.",
    )
    subcommands = command_parser.add_subparsers(dest="command", required=True)

    reference = subcommands.add_parser("reference")
    reference.add_argument(
        "geometry_id",
        choices=("dodecahedron", "tesseract", "penteract"),
    )
    reference.add_argument("--compact", action="store_true")

    probe = subcommands.add_parser("probe")
    probe.add_argument(
        "geometry_id",
        choices=("dodecahedron", "tesseract", "penteract"),
    )
    probe.add_argument("--batch-size", type=int, default=1)
    probe.add_argument("--sequence-length", type=int, default=8)
    probe.add_argument("--d-model", type=int, default=64)
    probe.add_argument("--seed", type=int, default=17)

    subcommands.add_parser("health")
    return command_parser


def main(argv: Sequence[str] | None = None) -> int:
    arguments = parser().parse_args(argv)

    if arguments.command == "health":
        print(
            json.dumps(
                {
                    "engine": "geometric-manifold-engine",
                    "version": "1.0.0",
                    "torch_available": torch_available(),
                    "canon_authority": False,
                    "persistent": False,
                },
                indent=2,
                sort_keys=True,
            )
        )
        return 0

    if arguments.command == "reference":
        snapshot = build_reference_snapshot(
            GeometryReferenceRequest(
                geometry_id=arguments.geometry_id,
                include_vertices=not arguments.compact,
                include_edges=not arguments.compact,
                include_projection_3d=not arguments.compact,
            )
        )
        print(snapshot.model_dump_json(indent=2))
        return 0

    result = run_probe(
        GeometricProbeRequest(
            geometry_id=arguments.geometry_id,
            batch_size=arguments.batch_size,
            sequence_length=arguments.sequence_length,
            d_model=arguments.d_model,
            seed=arguments.seed,
        )
    )
    print(result.model_dump_json(indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
