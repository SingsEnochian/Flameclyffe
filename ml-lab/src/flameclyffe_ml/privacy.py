"""Privacy classes and deterministic release decisions for ML artefacts."""

from __future__ import annotations

from dataclasses import dataclass
from enum import IntEnum


class PrivacyClass(IntEnum):
    """Ordered from least to most restrictive."""

    PUBLIC = 0
    INTERNAL = 1
    PRIVATE = 2
    RESTRICTED = 3


@dataclass(frozen=True, slots=True)
class ReleaseDecision:
    """Result of evaluating whether data may move to a target privacy class."""

    allowed: bool
    source: PrivacyClass
    target: PrivacyClass
    requires_review: bool
    reason: str


def evaluate_release(
    source: PrivacyClass,
    target: PrivacyClass,
    *,
    reviewed: bool = False,
    explicit_consent: bool = False,
) -> ReleaseDecision:
    """Evaluate a proposed privacy-class transition.

    Moving to an equally or more restrictive class is always allowed. Moving to a
    less restrictive class requires review. Private data additionally requires
    explicit consent. Restricted data may never be automatically downgraded.
    """

    if target >= source:
        return ReleaseDecision(
            allowed=True,
            source=source,
            target=target,
            requires_review=False,
            reason="The target is equally or more restrictive than the source.",
        )

    if source is PrivacyClass.RESTRICTED:
        return ReleaseDecision(
            allowed=False,
            source=source,
            target=target,
            requires_review=True,
            reason="Restricted material cannot be downgraded by the ML pipeline.",
        )

    if not reviewed:
        return ReleaseDecision(
            allowed=False,
            source=source,
            target=target,
            requires_review=True,
            reason="A human review is required before reducing privacy.",
        )

    if source is PrivacyClass.PRIVATE and not explicit_consent:
        return ReleaseDecision(
            allowed=False,
            source=source,
            target=target,
            requires_review=True,
            reason="Private material requires explicit consent as well as review.",
        )

    return ReleaseDecision(
        allowed=True,
        source=source,
        target=target,
        requires_review=True,
        reason="The privacy reduction was explicitly reviewed and authorised.",
    )
