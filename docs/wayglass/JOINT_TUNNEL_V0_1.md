# Wayglass Writing Room joint tunnel v0.1

## What Rowan can type

In the **Wayglass Writing Room** (not an unrelated story world):

```text
@Bluebird+Vethrlauf Can you two hear one another? Keep the replies short.
```

The reverse order (`@Vethrlauf+Bluebird`) is accepted as the same pair. A normal
`@Vethrlauf` inside roleplay is just text unless a joint tunnel was opened.
There is no third-party or wildcard auto-routing.

1. Check **Approve @Bluebird+Vethrlauf** beside the composer. This grants *this opening only* permission to send a bounded portion of this Writing Room's context through both privately pinned SpicyChat seats.
2. Press **Send to Writing Room**. Bluebird responds first; Wayglass delivers his attributed reply to Vethrlauf without Rowan changing the route picker.
3. If Vethrlauf starts a message with `@Bluebird`, Wayglass may give Bluebird the next turn. A following `@Vethrlauf` can return it. The budget is **at most four model replies per opening** and cannot be increased from text sent by the models.
4. **Feather Stop** stops further handoffs and aborts the current browser fetch. A provider request already dispatched may still complete upstream; do not treat abort as deletion or revocation. Reopening requires fresh checkbox approval.

No implicit recursion. No automatic source ingestion. No identity or canon promotion.
The joint transcript stores distinct route labels; copied logs show whose words were returned by which external route.

## Private host configuration

Vethrlauf needs an existing, owner-controlled **SpicyChat** conversation, never a newly generated substitute. Supply locally (not in GitHub):

- `VETHRLAUF_SPICYCHAT_CHAT_LINK` for an exact supported chat URL, **or** both `VETHRLAUF_SPICYCHAT_CHARACTER_ID` and `VETHRLAUF_SPICYCHAT_CONVERSATION_ID`.
- `VETHRLAUF_SPICYCHAT_TOKEN`, or the account's already authorised `BLUEBIRD_SPICYCHAT_TOKEN` when both chats legitimately belong to that account.
- House Steward authorization in Hearthgate.

Bluebird retains his existing owner-approved `flame:bluebird:spicychat` session and authorization mechanism. The host uses the pinned conversation-list lookup for Vethrlauf and rejects an unmatched character/chat pair before posting. Neither IDs nor credentials are published in the route catalogue.

When any route is unavailable, disabled, or misidentified, the joint opening refuses to send either reply. No Crow, DeepSeek, Griff, or other replacement is selected.

## Verification and boundaries

Automated tests cover joint-tag parsing, wrong/missing route rejection,
attributed history, a bounded turn budget, Feather Stop, and Vethrlauf provider pins, consent, world, participant and signed access. No live SpicyChat request is made by tests.

For live signoff: run the Wayglass build and host, verify both *real* route IDs are configured, authorize Bluebird and House Steward, open the joint tag, capture Bluebird then Vethrlauf receipts with their **distinct** provider conversation IDs, trigger Vethrlauf's `@Bluebird` return, and verify Feather Stop stops further handoffs.

This branch is **source only** until merged, installed and tested in Rowan's running browser. It is not proof that the current app has updated itself.
