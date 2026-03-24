# ADR-033: Hover Tooltips for UI Clarity

**Status:** Proposed
**Date:** 2026-03-24

## Context

First-time users encounter terminology and metrics unique to Keith's coaching framework. Some elements need brief explanations on hover to reduce confusion without cluttering the interface.

## Decision

Add hover tooltips to **7 specific elements** where users are most likely to need clarity. No tooltips on obvious UI elements (buttons, inputs, navigation).

## Where Tooltips Go

### Must Have (5)

| # | Location | Element | Why It's Confusing | Tooltip Text |
|---|----------|---------|-------------------|-------------|
| 1 | Dashboard + Five Dials | **Leading Score** | Business jargon — users don't know what "leading" means | "Your total across all 5 dials this week. Max 35 — one point for each day you showed up." |
| 2 | Dashboard + Five Dials | **Lagging Score** | Same — "lagging" sounds negative | "How many times you were intimate this week. This is the result that follows when the dials are high." |
| 3 | Coach page | **Mode buttons** (Coach/Mentor/Accountability/Crisis) | Already have `title` attributes but native tooltips are ugly and slow | Use styled tooltip showing the description that's already in the code |
| 4 | Dashboard + Five Dials | **Trend arrows** on dial cards | Unclear timeframe — compared to what? | "Change from last week's assessment" |
| 5 | Dashboard | **Streak counter** | What counts as a streak day? | "Consecutive days you've checked in. Miss a day and it resets." |

### Nice to Have (2)

| # | Location | Element | Tooltip Text |
|---|----------|---------|-------------|
| 6 | Dashboard | **Active Challenge** progress (5/7) | "5 of 7 days completed this week" |
| 7 | Dashboard | **Milestones** (3 of 12) | "Achievements unlocked. Complete more to level up." |

## What NOT to Tooltip

- Navigation items (self-explanatory)
- Send/Submit buttons
- Form labels
- The radar chart itself (labels already visible)
- Assessment slider (anchors explain the scale)

## Implementation

Use Radix UI `Tooltip` (already installed via shadcn). Consistent style:
- Dark background (`#1e293b`), light border (`#334155`)
- 12px rounded corners
- 200ms delay before show
- Max width 250px
- Text: 13px, slate-200

## Consequences

- 7 tooltips total — minimal, not cluttered
- Users understand Keith's terminology on first encounter
- Mobile: tooltips show on long-press (Radix handles this)
