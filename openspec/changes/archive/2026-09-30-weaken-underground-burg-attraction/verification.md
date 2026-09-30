# Verification notes

## What shipped

`getUndergroundPathCost`'s burg attraction went from an inline `3` to `UNDERGROUND_BURG_ATTRACTION = 2`
([routes-generator.ts](../../../../src/generators/routes-generator.ts)). `getLandPathCost`'s own term is
untouched. No requirement text changed, so the change declares `skip_specs`.

## Paired 8-seed measurement (tasks 4.1, 4.2)

Command (harness restored from
`openspec/changes/diverge-underground-network/harness/underground-measure.dom.test.ts.txt`):

```
HOME=/tmp/dsh-home XDG_CONFIG_HOME=/tmp/dsh-home/.config XDG_CACHE_HOME=/tmp/dsh-home/.cache \
  CHROMIUM_PATH=/usr/bin/chromium \
  npx vitest run --config vitest.browser.config.ts generators/underground-measure
```

Raw output: `measure/rung2-production.log`. `replica-production` equals `baseline-production` exactly on
every field, so the run is valid.

| seed      | production (attraction 2) | reverse control (attraction 3) | Δ overlap | length ratio | served (prod/ctrl) |
| --------- | ------------------------- | ------------------------------ | --------- | ------------ | ------------------ |
| measure-a | 0.531                     | 0.566                          | −0.035    | 0.977        | 68 / 68            |
| measure-b | 0.554                     | 0.577                          | −0.023    | 0.924        | 54 / 53            |
| measure-c | 0.502                     | 0.562                          | −0.060    | 0.983        | 53 / 56            |
| measure-d | 0.490                     | 0.536                          | −0.046    | 1.002        | 73 / 73            |
| measure-e | 0.516                     | 0.540                          | −0.024    | 0.986        | 66 / 67            |
| measure-f | 0.505                     | 0.561                          | −0.056    | 0.882        | 67 / 69            |
| measure-g | 0.535                     | 0.594                          | −0.059    | 0.916        | 60 / 59            |
| measure-h | 0.497                     | 0.548                          | −0.051    | 0.982        | 60 / 59            |
| **mean**  | **0.516**                 | **0.561**                      | **−0.045** | **0.956**   | 0.733 / 0.737      |

Secondary readings (aggregate): exact-edge share 0.297 → **0.243**, median corridor distance 0.56 →
**0.62**, along-edge 0.570 → 0.532.

**Overlap falls on all 8 seeds**, so D13's bar (any measured improvement on the paired protocol) is met.
Length is *recorded*, not gated: the mean ratio is 0.956 and the worst seed is 1.002, so the network did
not grow on this build.

### The delta is attributable to this rung

`force-production-back-to-3` reproduces the pre-change production baseline **exactly** — 0.561 / 0.297 /
6386 length — on the same build, same seeds, same harness. Both arms were measured in one run, so the
−0.045 overlap is the rung's own effect and not build drift.

### Against the archived ladder (the prediction was wrong on length)

The archived sweep predicted factor 2 on top of rung 1 at ~0.512 overlap and ×1.142 length. The overlap
reproduced almost exactly (**0.516** against 0.512), but the **length direction reversed**: ×0.956 mean
here against ×1.142 there. `harden-underground-plane-integrity` landed between the two measurements and
changed which cells the segment builders cover, which changed the network that factor 2 then shapes. The
paired control is what makes this visible; the archived number was an expectation, not a baseline.

## Plane audit on the new geometry (task 4.3)

Command: the audit from the hardening change, `measure/plane-audit.log`.

- **Zero violations on all 8 seeds**, `repairs=0` on all 8 — the service repair is not carrying the rung,
  which is the specific worry a network that avoids settlements raises.
- Contact **fell**: tunnels on surface burg cells 132–190 per seed, against 159–217 before the rung. The
  weaker attraction really is routing tunnels under fewer settlement cells.
- `unconnectable=1` on `measure-c` and `measure-f` — lone below-level burgs on their landmass, unchanged
  in kind from the pre-rung audit and a legal state.

## Adoption (task 4.4)

Adopted under D13. The rung reduces overlap on every seed, costs no length on this build, drops the
exact-edge share and raises the corridor distance, keeps the network's own service guarantee without
leaning on the repair, and leaves the surface network untouched. Rung 3 (endpoint gates) stays available
in the metaplan; it was not needed to clear this rung's bar.

## Suite and static checks (tasks 5.1, 5.2)

- `npm run test` — **112 files, 1300 tests passed**, with no existing test modified except the deliberate
  strengthening of *"does not move the surface network"*.
- `npx biome check src` — clean (the temporary harness is not part of the build).
- `npx tsc --noEmit` — clean.
- Two tests added: *"prices a tunnel step off a burg cell at the weakened attraction"* (2) and *"leaves the
  surface network's own burg attraction at three"* (3). Both make two destination cells identical in every
  respect but the burg map, so the quotient is the term alone.
