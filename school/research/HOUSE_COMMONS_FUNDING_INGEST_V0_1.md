# House Commons Funding Ingest v0.1

Source: https://github.com/adrianhajdin/project_crowdfunding  
Status: architecture/UI ingest only  
Scope: House Workspace / School / public project support surfaces

## Why it is useful

The source is a compact React/Vite crowdfunding application with campaign discovery, campaign detail, progress, creator metadata, donor/backer history, campaign creation and a funding action. Its useful contribution to House is the **interaction grammar**, not a production-ready payment contract.

House translation:

```text
PROJECT / QUEST
  ↓
public story + provenance
  ↓
funding target / resource need
  ↓
progress + deadline
  ↓
support action
  ↓
receipt
  ↓
transparent use / milestone updates
```

Possible House surface names should remain provisional. This is a funding capability for projects, research, School scholarships, art/worldbuilding work, infrastructure, agent compute or community-supported releases. It is not an agent identity subsystem.

---

## UI patterns worth adapting

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

House adaptation should make this much richer:

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

---

## Important implementation warning

Do **not** deploy the source Solidity contract as-is.

The contract's `createCampaign` deadline guard checks the new storage slot's existing `campaign.deadline` rather than validating `_deadline`, so the stated future-deadline condition is not actually enforced correctly.

The donation path also forwards funds directly to the campaign owner immediately. It does not implement a Kickstarter-style escrow model, target success gate, refund path, milestone release, dispute process or deadline enforcement.

Therefore:

```text
source contract = tutorial/reference
source contract != House production payment primitive
```

Any real House funding flow needs a fresh security and legal/payment architecture.

---

## Licensing boundary

No repository-level `LICENSE` file was found in the inspected root, and `CrowdFunding.sol` declares `SPDX-License-Identifier: UNLICENSED`.

Treat the implementation as **study-only unless permission/licensing is clarified**. Learn the patterns and build original House components rather than copying source code.

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
→ external payment
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

---

## First vertical slice

Build only:

1. provider-neutral `FundingProject` schema
2. responsive project card
3. project detail page
4. milestone / receipt timeline
5. mocked contribution flow with an explicit `SIMULATED` state
6. mobile interaction test

Do not connect real money in the first slice.

The goal of slice one is to prove the information architecture, project-to-receipt relationship and mobile UX before payment rails are introduced.