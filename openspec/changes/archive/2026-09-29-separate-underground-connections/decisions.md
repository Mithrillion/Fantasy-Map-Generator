# Decisions: separate-underground-connections

<!--
This file is the durable record of user intent and decisions for this change.
It is created and maintained by opsxa-* workflows via
openspec/.opsxa/opsxa-decisions.sh — do not hand-edit entry IDs.

Entry source tags (mandatory, one per entry):
- user (verbatim)              — direct quote of the user's words
- user (paraphrased)           — agent-summarized user input, approved in session
- agent-inferred (unconfirmed) — agent conclusion, not yet ratified by the user
- agent-inferred (confirmed)   — agent conclusion the user explicitly ratified
-->

## User Intent

<!-- The user's original problem statement / framing, tagged by source. -->

## Resolved Findings

<!--
### D-1: <concept>
- **Source:** user (verbatim)
- **Decision:** "<user's answer, quoted>"
- **Rationale:** <why, in the user's words where possible>
- **Action:** <file — what to change>
- **Status:** pending | applied <date> | deferred
-->

## Deferred Findings (needs user intent)

<!--
### F-1: <concept>
- **Source:** agent-inferred (unconfirmed)
- **Question:** <targeted question for the user>
- **Recommendation:** <agent's evidence-based default, for ratification or override>
- **Evidence:** <key facts the user needs to decide>
-->

## Verification Reports

<!--
### V-1: Re-assessment <date>
- **Source:** agent-inferred (unconfirmed)
- **Input report:** <what was re-verified>
- **Verdicts:** <CONFIRMED / DOWNGRADED / NOT AN ISSUE / NEW FINDING per issue>
- **Outcome:** <updated counts, ready-for-archive assessment>
-->

### V-1: Re-assessment 2026-09-29
- **Source:** agent-inferred (unconfirmed)
- **Input report:** In-session `/openspec-verify-change separate-underground-connections` report (1 WARNING, 3 SUGGESTIONs)
- **Verdicts:**

  | Original | Issue | Fresh Verdict | Why |
  |----------|-------|---------------|-----|
  | WARNING | `design.md:42` — "nothing after it consults the map" | **DOWNGRADED → SUGGESTION** | D2's decision is implemented exactly. The clause holds if scoped to `generate()` (the pass is last there); globally it is false (see below), but nothing breaks: both readers only re-price paths, they never disconnect one. Wording fix, not a defect. |
  | SUGGESTION | `design.md:37` — rejected alternative "cannot be seeded" | **CONFIRMED** | `undergroundEdges` *is* seeded from `routes` at `routes-generator.ts:563-571`, and the change diff shows that seeding predates this change. The decision stands; the stated reason does not. |
  | SUGGESTION | Two edge sets tracked in lockstep (`routes-generator.ts:584-585`) | **NOT AN ISSUE** | `design.md:37` already accepts the role separation on purpose: `undergroundEdges` = which underground edges exist, `undergroundConnections` = the discount. Each keeps one purpose. Re-flagging adds no action. |
  | SUGGESTION | generate-vs-load asymmetry via `sync()` | **CONFIRMED, scope narrowed** | `sync()` (`routes-generator.ts:1091-1102`, called from `load.ts:392`) writes every saved route, underground included. Narrowed: locked tunnels reach the shared map on *both* paths (`routes-generator.ts:220-221`), so the asymmetry is specific to **generated** underground segments. |

- **New findings:**
  - SUGGESTION — `verification.md`'s "One caveat" says the water cost is "the one reader of the shared `connections` map that still runs after the underground pass". A second post-pass reader exists: `Burgs.add()` (`burgs-generator.ts:820`) → `Routes.connect()` (`routes-generator.ts:926-930`) → `getLandPathCost` (`routes-generator.ts:308`), reachable from the Add-burg tool (`burg-creator.ts:41`) and the states editor (`states-editor.ts:1479`). Its direction is *toward* the spec's second scenario — a surface path no longer sees tunnel edges — so no code change; correct the sentence. In-pipeline precision: `Burgs.specify()` runs after `routes` but does not call `connect()`, so within generation the water cost remains the only post-pass reader.
- **No longer issues:** the lockstep-duplication suggestion (dropped as D1-justified).
- **Outcome:** No critical issues; warnings 1 → 0. Four SUGGESTIONs remain (2 confirmed, 1 downgraded in, 1 new), all documentation/comment corrections with no code change. Implementation untouched and still green: 380/380 tests, `tsc`/`biome` clean, `openspec validate --strict` valid, `measure-a` reproduction exact. Ready for archive.
