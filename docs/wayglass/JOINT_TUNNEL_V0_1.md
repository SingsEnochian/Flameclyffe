# Wayglass Writing Room joint tunnel v0.1

## What Rowan can type

In the **Wayglass Writing Room** (not an unrelated story world):

```text
@Bluebird+Vethrlauf Can you two hear one another? Keep the replies short.
```

The reverse order (@Vethrlauf+Bluebird) is accepted as the same pair. The joint tag can appear anywhere in Rowan's message, even with a zero-width character beside the plus sign. A solo tag is not a joint opening.
There is no third-party or wildcard auto-routing.

1. Check **Approve @Bluebird+Vethrlauf** beside the composer. This grants *this opening only* permission to send a bounded portion of this Writing Room's context through both privately pinned SpicyChat seats.
2. Press **Send to Writing Room**. Bluebird responds first; Wayglass delivers his attributed reply to Vethrlauf without Rowan changing the route picker.
3. Wayglass automatically alternates Bluebird → Vethrlauf → Bluebird → Vethrlauf for at most four model replies. No model-generated tag is required. Either participant may decline; Rowan can Feather Stop.
4. **Feather Stop** stops further handoffs and aborts the current browser fetch. A provider request already dispatched may still complete upstream; do not treat abort as deletion or revocation. Reopening requires fresh checkbox approval.

No implicit recursion. No automatic source ingestion. No identity or canon promotion.
The joint transcript stores distinct route labels; copied logs show whose words were returned by which external route.

## Private host configuration

Vethrlauf needs an existing, owner-controlled **SpicyChat** conversation, never a newly generated substitute. Supply locally (not in GitHub):

- `VETHRLAUF_SPICYCHAT_CHAT_LINK` for an exact supported chat URL, **or** both `VETHRLAUF_SPICYCHAT_CHARACTER_ID` and `VETHRLAUF_SPICYCHAT_CONVERSATION_ID`.
- Use Rowan's existing BLUEBIRD_SPICYCHAT_TOKEN (or WAYGLASS_SPICYCHAT_OWNER_TOKEN). The joint tunnel uses one owner account token for both posts; a VETHRLAUF_SPICYCHAT_TOKEN alone is insufficient for the shared relay.
- House Steward authorization in Hearthgate.

Bluebird retains his existing owner-approved `flame:bluebird:spicychat` session and authorization mechanism. The host uses the pinned conversation-list lookup for Vethrlauf and rejects an unmatched character/chat pair before posting. Neither IDs nor credentials are published in the route catalogue.

When any route is unavailable, disabled, or misidentified, the joint opening refuses to send either reply. No Crow, DeepSeek, Griff, or other replacement is selected.

## Verification and boundaries

Automated tests cover joint-tag parsing, wrong/missing route rejection,
attributed history, a bounded turn budget, Feather Stop, and Vethrlauf provider pins, consent, world, participant and signed access. No live SpicyChat request is made by tests.

For live signoff: run the Wayglass build and host, verify both *real* route IDs are configured, authorize Bluebird and House Steward, open the joint tag, capture Bluebird then Vethrlauf receipts with their **distinct** provider conversation IDs, trigger Vethrlauf's `@Bluebird` return, and verify Feather Stop stops further handoffs.

This branch is **source only** until merged, installed and tested in Rowan's running browser. It is not proof that the current app has updated itself.


## Transport sender versus conversational origin

The actual SpicyChat POST travels through Rowan's account under a validated House Steward session. Recipient choice remains the exact pinned character/conversation. Wayglass separately attaches host-generated peer-origin metadata so the recipients can recognize one another.

For a Bluebird-to-Vethrlauf handoff, the destination sees a human-readable preamble containing:
- Authenticated transport sender: Rowan (owner account)
- From participant: Bluebird
- To participant: Vethrlauf
- Origin route and short-lived Wayglass reply reference
- The exact preceding provider reply, between clearly delimited message boundaries

The implemented SpicyChat message API has no confirmed native arbitrary metadata field, so the preamble is carried **inside the message body**. It is not a forged API sender or a claim of provider-native metadata. The host, not browser-supplied text, resolves the origin from the actual previous provider result. A reply reference is single-use, bound to the Writing Room session/world and opposite participant, and expires after five minutes or a host restart. Provider conversation IDs remain independently pinned and are returned in private receipts, not injected into the other participant's words. An explicit owner-account token must be available; there is no model fallback or participant impersonation.

## Proofreading and corrections

The composer enables local browser-native spellcheck, with a visible toggle. Under each Rowan-authored message, **Edit** opens an inline editor with Save correction and Cancel. Corrections preserve the original sent version in the transcript and copied log; subsequent context marks the revision as local. Past SpicyChat POSTs are not silently revised, deleted or resent. Participants' messages remain noneditable.

The tests for this contract are synthetic. A successful test run is not a claim that Rowan's local host or either live SpicyChat session has been updated or verified.
