---
name: skeptical-review
description: "Fact-check claims drawn from a document, an inline quote, or a URL (article/video) against primary sources, scoring each one Confirmed / Corroborated / Unverified / Contradicted / Misleading, and always separating whether a claim was reported accurately from whether it's true. Treats media reporting and politicians' own statements as secondary, interested sources requiring independent primary-source corroboration, never as fact on their own say-so. Use when the user asks to fact-check, vet sourcing, be skeptical about, or sanity-check claims in a report, article, or video — not for routine research synthesis."
---

Adversarial claim-by-claim review, run **in conversation** (not a background
agent): judgement calls about source quality belong in the room with the
user, who can push back on any single verdict as it's made.

## Core discipline

A claim has two independent questions, never collapsed into one verdict:

1. **Quoted/reported accurately?** — does the source actually say what's
   attributed to it?
2. **Substantively true?** — is the underlying assertion correct?

A politician's own statement is a **primary source of what they said**, but
a **secondary, interested source as to whether it's true**. The same split
applies to a media report: it may accurately quote someone while the quote
itself is false, or accurately describe a document while drawing the wrong
conclusion from it. Report both questions for every claim; never let an
accurate quotation stand in for a verified fact.

## Process

### 1. Collect the claims

Take input in whatever form the user gave it:

- **A document path** — pull out each discrete factual assertion in order.
- **An inline quote or claim** — treat it as the one claim to check.
- **A URL** (article or video) — fetch and extract the claims it makes. Use
  whatever fetch tooling is available (`web_fetch`, a repo video-research
  CLI if one exists, etc.); note which tool was used so the review is
  reproducible.

List every claim before judging any of them, so the review's scope is fixed
up front rather than discovered claim-by-claim.

### 2. Tag each claim's source type

Label the source behind each claim: `primary-document`, `court-record`,
`official-statistic`, `politician-statement`, `press-release`,
`media-report`, `social-media`, or other as needed. This column makes the
secondary, interested nature of media and political sources visible in the
output itself, not just folded silently into a verdict.

### 3. Chase the primary source

For every claim, follow it back to the source that owns it — the statute,
filing, dataset, recording, or official document, not a write-up of one.
This is the same discipline as the `research` skill, applied adversarially.

- **Primary source reachable and it agrees** → `Confirmed`.
- **Primary source reachable and it disagrees** → `Contradicted`.
- **No primary source reachable, but 3+ independent, unaffiliated outlets
  report the same specific detail** (not syndication of one wire story) →
  `Corroborated (no primary source)`. Do not call this `Confirmed`: nobody
  has seen the underlying document.
- **No primary source, and no independent corroboration** → `Unverified`.
- **Technically accurate but omits context that changes its import** →
  `Misleading` — state the missing context in the notes.

### 4. Write the report

One table, one row per claim:

| # | Claim | Source type | Quoted accurately? | Verdict | Confidence | Source |
|---|-------|-------------|---------------------|---------|------------|--------|

Confidence is a plain 1–10 gut number, same convention as a security
review. Add a one-line note under any row needing more than the table
cells can hold (why `Misleading`, what the 3 corroborating outlets were,
etc).

### 5. Save the report

If reviewing something already under `docs/research/`, save to
`docs/research/reviews/`. Otherwise follow the `research` skill's rule:
save wherever the repo already keeps such notes, or somewhere sensible, and
say where.

### 6. Offer follow-ups

After presenting the table, use `ask_user` (or a numbered list if
unavailable) to offer:

- **List claims by weakest confidence** — rank and discuss the shakiest
  findings first.
- **Draft corrected language** for every `Contradicted` or `Misleading`
  claim.
- **Commit the findings report** to the repo.
