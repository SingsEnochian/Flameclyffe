"""Local development entry point for the Flameclyffe Living Engine."""

from __future__ import annotations


def main() -> None:
    try:
        import uvicorn
    except ImportError as exc:
        raise SystemExit(
            "Install the service extras first: python -m pip install -e '.[service]'"
        ) from exc

    uvicorn.run(
        "flameclyffe_ml.living_engine.api:app",
        host="127.0.0.1",
        port=8765,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
