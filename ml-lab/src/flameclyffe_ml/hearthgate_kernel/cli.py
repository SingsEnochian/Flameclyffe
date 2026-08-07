"""Command-line entry point for the Hearthgate Kernel."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

from flameclyffe_ml.provenance import content_hash

from .engine import HearthgateKernel
from .models import (
    DualAspectPacket,
    ExperientialAspect,
    ObservableAspect,
    PREMAQ,
    ProvenanceRecord,
)
from .registry import house_registry


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="hearthgate-kernel")
    subcommands = parser.add_subparsers(dest="command", required=True)
    subcommands.add_parser("awaken", help="Awaken the kernel and print module status.")

    demo = subcommands.add_parser("demo", help="Render one deterministic dual-aspect packet.")
    demo.add_argument("--house", choices=sorted(house_registry()), default="templehouse")
    demo.add_argument("--waiting", action="store_true", help="Leave the answer witness dormant.")

    validate = subcommands.add_parser("validate", help="Validate and audit a packet JSON file.")
    validate.add_argument("packet", type=Path)
    return parser


def _demo_packet(house_id: str, *, waiting: bool) -> DualAspectPacket:
    kernel = HearthgateKernel()
    observed_at = datetime.now(timezone.utc).replace(microsecond=0)
    source_payload = {
        "kind": "hearthgate-cli-demo",
        "house": house_id,
        "observed_at": observed_at.isoformat(),
    }
    return kernel.create_packet(
        identity=f"demo:{house_id}",
        house_id=house_id,
        observable=ObservableAspect(
            measurements={"presence": 1.0, "source_count": 1},
            chronology=(observed_at.isoformat(),),
            telemetry={"mode": "manual"},
            canon_sources=("hearthgate-cli-demo",),
            confidence=1.0,
            causal_history=("manual activation",),
        ),
        experiential=ExperientialAspect(
            story=("A traveller arrives and finds a glyph waiting.",),
            symbols=("waiting-glyph", "hearthweave"),
            tone_tags=("anchor-voice", "living-voice"),
            image_tags=("structure", "atmosphere"),
            haptic_tags=("call", "answer"),
            relationships=("traveller", "host"),
            cultural_meaning=("hospitality", "mutual recognition"),
            lived_continuity=("the House remembers the meeting",),
        ),
        premaq=PREMAQ(P=0.82, C=0.88, R=0.79, E=0.22, M=0.76, A=0.84, Q=0.73),
        provenance=(
            ProvenanceRecord(
                source_id="hearthgate-cli-demo",
                source_kind="synthetic-demonstration",
                uri="urn:hearthgate:demo",
                content_hash=content_hash(source_payload),
                classification="synthetic",
                retrieved_at=observed_at,
            ),
        ),
        origin_house="terra-prime" if house_id != "terra-prime" else "templehouse",
        origin_witness="traveller",
        reception_witness=None if waiting else "resident-host",
        observed_at=observed_at,
        history=("kernel-demo",),
    )


def main() -> None:
    args = _parser().parse_args()
    kernel = HearthgateKernel()

    if args.command == "awaken":
        print(json.dumps(kernel.awaken(), indent=2, ensure_ascii=False))
        return

    if args.command == "demo":
        packet = _demo_packet(args.house, waiting=args.waiting)
        print(json.dumps(packet.model_dump(mode="json"), indent=2, ensure_ascii=False))
        return

    packet = DualAspectPacket.model_validate_json(args.packet.read_text(encoding="utf-8"))
    result = {
        "schema": packet.schema,
        "identity": packet.identity,
        "house_id": packet.house_id,
        "audit": kernel.audit(packet),
        "replay_verified": kernel.replay_verified(packet),
    }
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
