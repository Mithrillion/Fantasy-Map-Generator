# Decisions: add-underground-settlements

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

- **Run `/openspec-verify-change add-underground-settlements`, then re-verify its findings via `/opsxa-reverify`.** — Source: user (paraphrased) — the user invoked both skills in sequence; no additional written intent was given in this session.

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

### V-1: Re-assessment 2026-09-29
- **Source:** agent-inferred (unconfirmed)
- **Input report:** conversation verification report for add-underground-settlements (1 CRITICAL, 3 WARNING, 1 SUGGESTION); fresh line re-reads and greps, no decisions.md existed before this entry
- **Verdicts:**
  | Original | Issue | Fresh Verdict | Why |
  |----------|-------|---------------|-----|
  | CRITICAL 1 | Task 6.2 scenario-walk record missing | **CONFIRMED (CRITICAL)** | Fresh `find` + `ls` on 2026-09-29: no verification record file anywhere; `git status` clean; tasks.md:50 still claims the recording; diff is checkbox-only |
  | WARNING 1 | Scenario "Economy treats an underground burg as a market participant" untested | **CONFIRMED (WARNING)** | Fresh grep across market/production/goods test files for `subterranean|underground`: zero hits; `burg-classification` import inventory still excludes all economy code, so holds by construction but unpinned |
  | WARNING 2 | Keep/risk restore paths untested for underground content | **CONFIRMED (WARNING)** | Fresh grep for `restoreRiskedData|restoreKeptData|regenerateErasedData` in `*.test.ts`: zero hits; erase stays covered via underground-highways.test.ts:413 |
  | WARNING 3 | Display persistence scenarios browser-verified only | **DOWNGRADED (NOT AN ISSUE as coverage gap; folds into CRITICAL 1's record gap)** | layers.test.ts:508-524 pins the automated half: "restores off from a stored state that predates them" = an older map opens with both layers off; `restore(...active: [undergroundRoutes, undergroundBurgs])` = reopen restores the view; remaining gap is only that task 5.7's manual browser check is unrecorded |
  | SUGGESTION 1 | design.md D9 children `chambers`/`undergroundAnchors` vs shipped `["tunnels"]`/`["undergroundIcons"]` | **CONFIRMED (SUGGESTION)** | layers.ts:330-334 children `[{ id: "tunnels", tag: "g" }]`, layers.ts:400-402 `[{ id: "undergroundIcons", tag: "g" }]`; D10 makes `undergroundAnchors` contradictory; distinct-id requirement is met |
- **New findings:** none (skeptical re-verification widened the searches; nothing new surfaced)
- **No longer issues:** WARNING 3's assertion half ("Reopening restores the view" / "An older map opens in the surface state") is pinned by layers.test.ts:508-524, refuting the original "no automated coverage" claim; only the unrecorded manual check remains, which is CRITICAL 1's scope
- **Outcome:** 1 CRITICAL (task 6.2 record missing — add the scenario walk before archiving), 2 WARNING (pin economy participation and keep/risk restore with tests), 1 SUGGESTION (revise design.md D9 children to match reality). Implementation and full suite are green; after the record and (ideally) the two tests land: ready for archive.
- **Addressed 2026-09-29 via tasks.md section 7:** CRITICAL 1 → verification.md walkthrough (task 7.1); WARNING 1 → markets test pin (task 7.2); WARNING 2 → restore-path test pin exporting `restoreKeptData`/`restoreRiskedData` (task 7.3); SUGGESTION 1 → design.md D9 reconciled to `tunnels`/`undergroundIcons` (task 7.4). Full suite 1266 tests green, lint and type-check clean.

