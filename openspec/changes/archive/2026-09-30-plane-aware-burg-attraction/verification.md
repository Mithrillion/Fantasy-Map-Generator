# Verification notes

## What shipped

- `getUndergroundPathCost`'s burg term is plane-aware (`src/generators/routes-generator.ts`): a below-level
  burg record keeps `1`, a surface-only, missing or removed one pays `UNDERGROUND_BURG_ATTRACTION` exactly as
  a burgless cell. `getLandPathCost` is byte-identical — its own `3` term is untouched.
- `PlaneReport.contact` reports the split and the hub figure (`src/generators/plane-integrity.ts`):
  `tunnelsOnSurfaceOnlyBurgs`, `tunnelsOnDualIdentityBurgs`, `tunnelCellsWithMultipleRecords`, with
  `surfaceRoutesOnBelowLevelCells` unchanged. `tunnelsOnSurfaceBurgs` is retired (its old value is the sum of
  the first two, so CH5's 132–190 stays comparable). `formatPlaneReport` prints each figure under its own name.
- `docs/architecture/generation-pipeline.md` states the plane-aware condition on the tunnel cost.
- 8 tests: three attraction probes (2.1–2.3, one re-pinned), four audit tests (2.4–2.7) plus 2.8's adaptation,
  and two integration tests (2.9, 2.10).

## Deliberate deviations from the task list (both agreed 2026-09-30)

### The gateway fixture (affects task 6.11's wording)

Two existing boundary-rule tests need a tunnel that **crosses** a surface-only burg's cell without ending
there: *"never begins or ends an underground highway on a surface burg's cell"* and *"keeps a stretch whose
junction sits on a surface burg's cell"*. Their shared fixture made that cell the cheap step — which is the
very behaviour this rung removes. On this grid the settled cell (separation ×3, plain-cell factor) now costs
882 against 663.6 for its plain neighbour, so the tunnel took the two-step plain detour and the assertions
failed with no rule broken.

`surfaceGatewayFixture` therefore makes the plain way around the gateway an uninhabitable glacier
(`biome = 12`, impassable for both costs), so the settled cell is still the only crossing. Both tests keep
their original assertions, and the case they now cover is the test-design's own edge case — *"a below-level
burg that is only reachable through a surface-only burg's cell must still be reached"*. No assertion was
edited; this is the third sanctioned edit beside 2.1's re-pin and 2.8's field rename.

### Adoption against tasks 4.4

Tasks 4.4 requires the surface-only contact **and** the multi-record cells to fall on every seed. The
complaint's contact falls on all 8 seeds, but the *global* multi-record figure rises on 7 of 8 (mean 96.9
against 92.6). The hub split below shows the whole rise sits on plain cells: multi-record cells that are
surface-only burg cells fall on 7 seeds and are equal on the 1st, never worse. Adopted on that reading with
the residual recorded, on the user's ruling of 2026-09-30, and consistent with D13 (any measured overlap
reduction on the paired protocol); repulsion stays pre-authorized (D17) for the plain-cell crossings.

## Paired 8-seed measurement (tasks 4.1, 4.2)

Harness (the new `force-production-back-to-plane-blind` arm + the audit's contact figures) restored from
`openspec/changes/diverge-underground-network/harness/underground-measure.dom.test.ts.txt`; raw output
`measure/rung3-paired.log`.

```
HOME=/tmp/dsh-home XDG_CONFIG_HOME=/tmp/dsh-home/.config XDG_CACHE_HOME=/tmp/dsh-home/.cache \
  CHROMIUM_PATH=/usr/bin/chromium \
  npx vitest run --config vitest.browser.config.ts generators/underground-measure
```

`replica-production` equals `baseline-production` on **every** field of every seed, including the new contact
figures, so the run is valid. The reverse control also reproduces CH5's shipped rung-2 production column
**exactly** (0.531 / 0.554 / 0.502 / 0.490 / 0.516 / 0.505 / 0.535 / 0.497), so the deltas below are the
rung's own and not build drift.

| seed      | production (plane-aware) | control (plane-blind) | Δ overlap | surface-only contact (prod/ctrl) | multi-record cells (prod/ctrl) | length ratio | served (prod/ctrl) |
| --------- | ------------------------ | --------------------- | --------- | -------------------------------- | ------------------------------ | ------------ | ------------------ |
| measure-a | 0.440                    | 0.531                 | −0.091    | 75 / 146                         | 99 / 91                        | 1.003        | 68 / 68            |
| measure-b | 0.447                    | 0.554                 | −0.107    | 61 / 122                         | 91 / 82                        | 0.988        | 53 / 54            |
| measure-c | 0.420                    | 0.502                 | −0.082    | 77 / 129                         | 102 / 90                       | 0.999        | 53 / 53            |
| measure-d | 0.406                    | 0.490                 | −0.084    | 80 / 132                         | 83 / 83                        | 1.020        | 73 / 73            |
| measure-e | 0.444                    | 0.516                 | −0.072    | 90 / 136                         | 82 / 79                        | 1.020        | 66 / 66            |
| measure-f | 0.432                    | 0.505                 | −0.073    | 63 / 117                         | 148 / 145                      | 0.956        | 66 / 67            |
| measure-g | 0.431                    | 0.535                 | −0.104    | 89 / 144                         | 92 / 95                        | 1.003        | 59 / 60            |
| measure-h | 0.423                    | 0.497                 | −0.074    | 41 / 90                          | 78 / 76                        | 0.992        | 60 / 60            |
| **mean**  | **0.430**                | **0.516**             | **−0.086**| **72.0 / 127.0**                 | **96.9 / 92.6**                | **0.997**    | 0.994 / 0.996      |

- **Overlap falls on all 8 seeds** by 7.2–10.7 points, against a floor of **0.516** (CH5) — the largest rung
  so far, and the new floor for rung 4.
- **The complaint falls on all 8 seeds**: tunnels crossing a surface-only burg's cell 127 → 72 on the mean
  (−43%), 41–90 per seed against 90–146.
- Length is recorded, not gated (D13): ×0.997 mean, worst seed ×1.020.
- Secondary readings (means): exact-edge 0.243 → **0.149**, median corridor distance 0.61 → **0.72**,
  service (burgs ending a highway) 0.996 → 0.994.

### Why the multi-record figure did not fall (supporting detail, harness only)

The production audit's multi-record figure is global, so the harness also splits those cells by what sits on
them (`surfaceOnlyHubs` / `dualIdentityHubs` / `otherHubs` in `measure/rung3-paired.log`; the three sum to
`tunnelCellsWithMultipleRecords` on every row).

| multi-record cells, mean over 8 seeds | production | control |
| ------------------------------------- | ---------- | ------- |
| surface-only burg cells (the complaint's crossroads) | **8.9** (4–22) | 13.1 (5–30) |
| dual-identity burg cells (legal endpoints)           | 26.5           | 26.6        |
| plain and fully subterranean cells                   | 61.5           | 52.1        |

The settlement crossroads thin out and the crossings that remain move onto plain cells — the residual this
rung records rather than hides. Surface-only hubs are never higher in the production arm on any seed
(7 down, 1 equal).

## Plane audit on the new geometry (task 4.3)

`measure/plane-audit.log` (browser, seeds `measure-a`…`measure-h`, underground generation on):

- **Zero violations on all 8 seeds**, `repairs=0` on all 8 — the service pass is not carrying the rung.
- `unconnectable=1` on `measure-c` and `measure-f` (lone below-level burgs on their landmass, the legal state
  CH5's audit already reported), 0 elsewhere.
- The `PLANES` lines carry the split: `tunnelsOnSurfaceOnlyBurgs` 41–90, `tunnelsOnDualIdentityBurgs` 40–45,
  `tunnelCellsWithMultipleRecords` 78–148, `surfaceRoutesOnBelowLevelCells` 21–33 (unchanged direction).
- Cross-check: the harness's `baseline-production` contact figures equal the audit's per seed on every field
  (75/44/99, 61/40/91, 77/41/102, 80/44/83, 90/45/82, 63/43/148, 89/41/92, 41/42/78), so the paired arms and
  the standing gate are measuring the same map.

## Suite and static checks (tasks 6.11–6.13)

- `npm run test` — **112 files, 1308 tests passed** (1300 before; the 8 new tests). No existing test modified
  except the two sanctioned edits above and 2.1's re-pin.
- `npx vitest run --config vitest.browser.config.ts generators/plane-integrity` — zero violations, the task
  4.3 run repeated on the final tree.
- `npx biome check src` and `npx tsc --noEmit` — clean, with the temporary harness removed from `src/`.

## Test-to-spec map

| test | spec |
| ---- | ---- |
| prices a tunnel step onto a below-level burg cell at the attraction | `underground-highways` / A below-level settlement still attracts a tunnel |
| prices a surface-only burg cell exactly as a plain cell | `underground-highways` / A surface-only settlement does not attract a tunnel |
| prices a record-less burg id as a plain cell | `underground-highways` / A missing or removed burg record prices as no burg |
| leaves the surface network's own burg attraction at three | `underground-highways` / The surface network's own cost is unchanged |
| reports surface-only and dual-identity tunnel contact apart | `plane-integrity-audit` / Contact on a surface-only burg is reported apart from a dual-identity burg |
| counts a cell carrying more than one record | `plane-integrity-audit` / A cell carrying more than one record is counted |
| counts contact without failing it | `plane-integrity-audit` / A road crossing above a subterranean burg is counted, not failed |
| a tunnel between two below-level burgs prefers a plain detour to a surface-only burg's cell | `underground-highways` / A surface-only settlement does not attract a tunnel (end-to-end) |
| a generated map's audit reports the split without a violation | `plane-integrity-audit` / the split, end to end |
| never begins or ends an underground highway on a surface burg's cell | `underground-highways` / No highway begins or ends on a surface burg's cell |
| keeps a stretch whose junction sits on a surface burg's cell | `underground-highways` / A junction on a surface burg's cell keeps the stretch |
