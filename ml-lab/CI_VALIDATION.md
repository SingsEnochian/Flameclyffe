# ML Lab CI Validation

This temporary validation record exists to exercise the full `ML Lab` GitHub Actions matrix after the initial direct-push failures.

Validation target:

- Python 3.11
- Python 3.13
- editable install with `dev` and `service` extras
- Ruff over the complete `ml-lab` tree
- strict mypy over `ml-lab/src`
- pytest with coverage

This file may be removed after the workflow is verified.
