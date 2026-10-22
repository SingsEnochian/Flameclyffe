# House Commons Funding Ingest v0.1

Sources:
- https://github.com/adrianhajdin/project_crowdfunding
- https://github.com/ncase/crowdfunding-tuts
- https://github.com/preshpi/SupportHive

Status: architecture/UI/payment-flow ingest only  
Scope: House Workspace / School / public project support surfaces

## Why these sources are useful together

The three sources illuminate different layers of the same problem.

`project_crowdfunding` gives us a compact campaign interaction grammar: discovery, campaign detail, creator attribution, progress, deadline, backers and a contribution action.

`crowdfunding-tuts` is an old but unusually clear end-to-end tutorial showing the seam between the public campaign surface, a payment-provider tokenisation flow, server-side charging and aggregate campaign progress. Its strongest lesson for House is architectural simplicity: a useful funding surface does not need to begin as an enormous platform. It is also explicitly released under the Unlicense.

`SupportHive` is a more contemporary community-funding application with authentication, campaign creation, campaign detail, donations, transactions, profile/settings surfaces, Sanity-backed campaign data, Firebase authentication and Paystack payments. It is MIT licensed.

House translation:

```text
PROJECT / QUEST
  ↓
public story + provenance
  ↓
funding target / resource need
  ↓
progress + deadline / milestone state
  ↓
support choice
  ↓
provider handoff
  ↓
verified contribution receipt
  ↓
transparent use / milestone updates / build receipts
```

Possible House surface names should remain provisional. This is a funding capability for projects, research, School scholarships, art/worldbuilding work, infrastructure, agent compute or community-supported releases. It is not an agent identity subsystem.

---

## Source 1: project_crowdfunding

### UI patterns worth adapting

The source client separates reusable display components from page-level flows and includes:

- campaign cards / discovery grid
- creator/profile association
- project story surface
- raised / target / days-left / backer counters
- progress bar
- funding input and action
- campaign creation form
- campaign detail page
- donation/backer history

House adaptation should make this richer:

```text
Project card
├─ what are we building?
├─ why does it matter?
├─ current state
├─ target / resource request
├─ milestone ledger
├─ evidence / receipts
├─ named steward / next owner
├─ supporter options
└─ public update stream
```

Use Universal Skin Engine and living-glass materials rather than copying source styling.

### Implementation warning

Do **not** deploy the source Solidity contract as-is.

The contract's `createCampaign` deadline guard checks the new storage slot's existing `campaign.deadline` rather than validating `_deadline`, so the stated future-deadline condition is not actually enforced correctly.

The donation path also forwards funds directly to the campaign owner immediately. It does not implement a Kickstarter-style escrow model, target success gate, refund path, milestone release, dispute process or deadline enforcement.

Therefore:

```text
source contract = tutorial/reference
source contract != House production payment primitive
```

Any real House funding flow needs a fresh security and legal/payment architecture.

### Licensing boundary

No repository-level `LICENSE` file was found in the inspected root, and `CrowdFunding.sol` declares `SPDX-License-Identifier: UNLICENSED`.

Treat the implementation as **study-only unless permission/licensing is clarified**. Learn the patterns and build original House components rather than copying source code.

---

## Source 2: crowdfunding-tuts

Mechanism class: **minimal end-to-end funding flow with explicit provider boundary**.

The source's strongest contribution is not modern code. It dates to 2013 and uses technologies and APIs that should not be treated as current implementation recommendations. The useful thing is the shape of the transaction boundary.

Its tutorial separates:

```text
public campaign page
→ support form
→ payment data tokenised by provider-side JavaScript
→ opaque payment token sent to server
→ server communicates with payment provider
→ campaign total updated
```

That separation is still conceptually valuable. Sensitive payment material should not become ordinary House application state, agent memory, logs, canon or browser-local project data.

House rule:

```text
payment credential / card data
        !=
House project state
```

The House support surface should know only what it needs to know: contribution intent, provider, currency, external transaction reference, verification state and the minimum supporter metadata required by policy.

### Simplicity lesson

The tutorial intentionally builds a small complete crowdfunding flow rather than beginning with a huge platform. This reinforces the House vertical-slice doctrine:

```text
one project
→ one support option
→ one provider adapter
→ one verified receipt
→ one progress update
```

before multi-provider routing, recurring support, grants, memberships, rewards or on-chain rails.

### Licensing

The repository and tutorial are released under the Unlicense. That gives us more implementation freedom than the tutorial-grade Web3 source, though age and dependency obsolescence still mean we should adapt concepts rather than resurrect the old stack unchanged.

---

## Source 3: SupportHive

Mechanism class: **community funding application with authenticated campaign and transaction surfaces**.

Useful product architecture:

```text
Landing
Auth
Dashboard
├─ Overview
├─ Campaigns
├─ Campaign Detail
├─ Create Campaign
├─ Donate
├─ Transactions
├─ Profile
└─ Settings
```

That route structure is useful because it distinguishes public discovery from authenticated mutation and transaction history.

House adaptation:

```text
Public Commons
├─ Discover Projects
└─ Project Detail

Authenticated House Workspace
├─ My Support
├─ Project Stewardship
├─ Funding Receipts
├─ Milestones
├─ Updates
└─ Provider / payout settings
```

A supporter should not need stewardship permissions merely to read project evidence, while creation, payout configuration and project mutation should require explicit authority.

### Payment-provider pattern

SupportHive uses Paystack subaccounts and redirects supporters to a provider authorisation URL after payment initialisation. That is closer to the provider-neutral adapter shape we want than embedding financial logic directly into the project domain.

Useful abstraction:

```text
ContributionIntent
→ FundingProvider.initialize()
→ external hosted payment surface
→ provider callback / webhook
→ server-side verification
→ ContributionReceipt
→ aggregate project progress
```

### Critical security lesson

The inspected SupportHive client initialises Paystack directly from browser code using `process.env.VITE_PAYSTACK_SECRET_KEY` in an `Authorization: Bearer ...` header.

That is **not** an acceptable House pattern. Vite-prefixed variables are browser-exposed build-time values, so a secret payment key must never be shipped through that route.

House invariant:

```text
browser may create contribution intent
browser must not possess payment-provider secret
```

Production House flow should instead be:

```text
browser
→ House server endpoint
→ server-side provider secret
→ provider initialisation
→ hosted provider checkout
→ provider webhook/callback
→ server-side transaction verification
→ signed/verified House receipt
```

Never update a project funding total solely because the browser returned from a provider page. Provider verification or equivalent trusted evidence must establish the contribution state.

### Licensing

SupportHive is MIT licensed. Direct reuse is legally easier than with the unlicensed Solidity tutorial, but any reused implementation still needs technical review, dependency review and House adaptation.

---

## Cross-source synthesis

Together these sources suggest a clean separation of concerns:

```text
PROJECT DOMAIN
story / steward / milestones / target / receipts / updates

SUPPORT DOMAIN
intent / amount / currency / supporter visibility / recurring state

PAYMENT ADAPTER
provider initialisation / hosted checkout / callback / verification / reversal

PUBLIC LEDGER SURFACE
verified aggregates / milestone use / build receipts
```

Do not let payment-provider objects leak through the whole application. The project model should survive changing Stripe to another provider, adding grants, accepting sponsorships or supporting an optional on-chain rail.

Likewise:

```text
contribution != ownership
supporter != governor
payment success != milestone completion
funding progress != project truth
public receipt != private financial record
```

---

## House-native funding model

The first implementation should not require Web3.

Build the interface and funding domain as provider-neutral contracts:

```text
FundingProject
FundingGoal
Milestone
SupportOption
ContributionIntent
ContributionReceipt
DisbursementReceipt
ProjectUpdate
RefundOrReversal
FundingProvider
```

Recommended receipt states:

```text
DRAFT
INITIALIZED
AWAITING_PROVIDER
PROVIDER_RETURNED
VERIFYING
VERIFIED
FAILED
REVERSED
REFUNDED
```

Only `VERIFIED` contributions affect authoritative funding totals.

Then adapters can support whichever rails are appropriate later:

```text
provider-neutral House contract
        ↓
Stripe / Ko-fi / GitHub Sponsors / other conventional rail
        ↓
optional wallet / on-chain adapter
```

No payment provider becomes canon, identity, or project ownership.

---

## Better House flow

### Discovery

A supporter should be able to browse active House work by project, world, research programme, School initiative or infrastructure need.

### Project detail

Show:

- plain-language purpose
- current build evidence
- target and what it buys
- funding progress
- timeline
- milestones
- risks / dependencies
- latest receipts
- who is stewarding the work
- what happens if the target is not met
- what supporters receive, if anything

### Contribution

Before external payment:

```text
amount / support choice
→ provider + currency shown
→ fees / recurring state shown
→ confirmation
→ server creates provider session
→ external payment
→ server verifies provider result
→ verified receipt
```

Never let a visually completed progress bar substitute for payment-provider truth.

### After contribution

Contribution and project progress are separate records. The public surface may display verified aggregate funding without exposing private supporter details.

### Milestones

Project funding should be able to map to build receipts:

```text
funding milestone
→ implementation work
→ verification
→ release receipt
→ public update
```

That makes support traceable to actual becoming rather than a dead donation counter.

---

## Workspace integration

House Workspace can gain a `Support` or `Projects` room with:

```text
Discover | Active | Milestones | Updates | Receipts
```

An individual project page can connect directly to its existing House artifacts, PRs, release receipts and named owners.

The School can use the same primitives for scholarships, compute pools, sponsored research exercises or shared infrastructure without creating a separate funding architecture.

A steward view can add:

```text
Campaign editor
Funding goals
Milestone mapping
Provider status
Verified contributions
Payout / disbursement receipts
Public update composer
```

---

## First vertical slice

Build only:

1. provider-neutral `FundingProject` schema
2. responsive project card
3. project detail page
4. milestone / receipt timeline
5. mocked contribution flow with an explicit `SIMULATED` state
6. authenticated steward-only edit surface
7. mobile interaction test

Do not connect real money in the first slice.

The goal of slice one is to prove the information architecture, project-to-receipt relationship, permission boundaries and mobile UX before payment rails are introduced.

Second slice, only after the first is verified:

```text
one server-side payment adapter
→ sandbox/test mode only
→ provider webhook verification
→ VERIFIED receipt
→ aggregate progress update
→ reversal/refund test
```

No provider secret belongs in client JavaScript.