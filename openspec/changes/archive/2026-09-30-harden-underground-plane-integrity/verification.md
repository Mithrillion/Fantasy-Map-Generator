# Verification notes

## Real-map audit, 8 seeds (task 7.1)

Command (needs a writable `HOME`/`XDG_*`, otherwise Playwright fails at `createContext`):

```
mkdir -p /tmp/dsh-home
HOME=/tmp/dsh-home XDG_CONFIG_HOME=/tmp/dsh-home/.config XDG_CACHE_HOME=/tmp/dsh-home/.cache \
  CHROMIUM_PATH=/usr/bin/chromium \
  npx vitest run --config vitest.browser.config.ts generators/plane-integrity
```

Result: `1 passed`, `violations=0` on every seed. Per-seed report (one `PLANES …` line per seed in the
run output):

| seed      | census (surface/sub/ug) | surface boundaries | ug boundaries | connected (surface/ug) | unconnectable | repairs | tunnels on surface burgs | surface routes on below-level cells | violations |
| --------- | ----------------------- | ------------------ | ------------- | ---------------------- | ------------- | ------- | ------------------------ | ----------------------------------- | ---------- |
| measure-a | 782 / 44 / 44           | 1146 (1115j/31t)   | 118 (100j/18t) | 854 / 258              | 0             | 0       | 214                      | 28 (lower bound)                    | 0          |
| measure-b | 721 / 40 / 40           | 1154 (1118j/36t)   | 110 (98j/12t)  | 788 / 226              | 0             | 0       | 186                      | 27                                  | 0          |
| measure-c | 733 / 41 / 41           | 1130 (1104j/26t)   | 112 (106j/6t)  | 800 / 248              | 1             | 0       | 208                      | 26                                  | 0          |
| measure-d | 800 / 44 / 44           | 1188 (1150j/38t)   | 124 (109j/15t) | 865 / 249              | 0             | 0       | 205                      | 21                                  | 0          |
| measure-e | 812 / 45 / 45           | 1322 (1287j/35t)   | 122 (109j/13t) | 880 / 251              | 0             | 0       | 206                      | 23                                  | 0          |
| measure-f | 786 / 44 / 44           | 1220 (1178j/42t)   | 196 (183j/13t) | 863 / 235              | 1             | 0       | 191                      | 33                                  | 0          |
| measure-g | 729 / 41 / 41           | 1184 (1153j/31t)   | 134 (127j/7t)  | 792 / 258              | 0             | 0       | 217                      | 22                                  | 0          |
| measure-h | 751 / 42 / 42           | 1108 (1087j/21t)   | 108 (98j/10t)  | 819 / 201              | 0             | 0       | 159                      | 26                                  | 0          |

The `unconnectable=1` entries are lone below-level burgs on their landmass, which the service rule
leaves unconnected by design and which raise no violation.

### Against the 2026-09-29 baseline

| measure                       | baseline (pre-fix)        | now                                  |
| ----------------------------- | ------------------------- | ------------------------------------ |
| boundaries on below-level cells | 41 (34 junctions, 7 termini) | 0 violations; the termini are gone |
| below-level burgs unserved    | 50 of 682                 | 0 service violations                 |
| **contact**                   |                           |                                      |
| tunnels on surface burg cells | 1059 of 6114              | 159–217 per seed (exact)             |
| surface routes on below-level cells | 178 of 682 (26%)    | 21–33 per seed (lower bound)         |
| repairs                       | n/a (no pass existed)     | 0 on all 8 seeds                     |

The contact baseline is an aggregate over different seed sets and denominators; the comparison here is
per seed. The surface-route contact falls by roughly 6× because a surface record may still cross a
below-level burg's cell but may no longer begin or end there. `repairs=0` on every seed is the
expected result: the boundary rule and the junction-aware prune keep every connectable burg on the
network, so the service pass has nothing to add on a healthy map.

### What "contact" is made of

`tunnelsOnSurfaceBurgs` counts cells, so it does not say whether a tunnel *connects* to the burg or
merely passes under it. A follow-up measurement over `measure-a`, `measure-d` and `measure-g`
(636 surface-burg cells touched by tunnels) separates the two:

| observation                                                                     | measure-a | measure-d | measure-g |
| ------------------------------------------------------------------------------- | --------- | --------- | --------- |
| surface-burg cells a tunnel touches                                             | 214       | 205       | 217       |
| of those, cells that are also on a surface route                                | 214       | 205       | 217       |
| cells touched by more than one tunnel                                           | 42        | 36        | 56        |
| tunnel points drawn exactly on the burg's coordinates while not its endpoint     | 197       | 180       | 198       |
| tunnel endpoints that land on a burg                                            | 64        | 66        | 57        |
| … of those, on a cell another tunnel continues through (a junction)              | 56        | 61        | 53        |
| … of those, on a **dual-identity** burg (`subterranean`, so a legal endpoint)    | 8         | 5         | 4         |
| tunnel endpoints on a burg with ground-level presence *only*                     | 0         | 0         | 0         |

So the dominant pattern is a pass-under, not a connection: 90% of the crossings are a tunnel drawn
through a burg's own coordinates while the burg is not that record's endpoint. That is the intended
contact — `getCellAnchor` anchors every route point at the burg's position, so a tunnel crossing a
burg cell is *drawn* through the burg dot and `buildLinks` does record a tunnel step at that cell,
because it links every consecutive pair of the record rather than its ends. The reported
`connected underground` figure is stricter than that: it counts only burg cells on an underground
record, and the service rule is stricter still — it requires the burg to be the record's endpoint or a
junction. No tunnel ends at a surface-only burg: every endpoint that lands on a burg is either a
junction (another tunnel continues through the cell) or a dual-identity burg, which carries
below-level presence and is a legal endpoint by design.

## Mutation check (task 7.2)

**Mutation: the prune junction test disabled** (the prune treats "a burg is at the boundary cell" as
proof of an endpoint, so a mismatched stub it used to clean up survives).

Command: edit `pruneUndergroundHighways` so `isTerminal` returns `true`, run the audit command above.

Observed failure (truncated; 48 violations over the 8 seeds):

```
PLANES measure-a … connected surface=854 underground=219 unconnectable=0 repairs=0 … violations=10

AssertionError: expected [ …(48) ] to deeply equal []

+   "measure-a: Dichino (burg 10, cell 5346, feature 2) has no underground connection",
+   "measure-a: Tseun (burg 248, cell 2840, feature 2) has no underground connection",
+   "measure-a: Kolurelen (burg 424, cell 1896, feature 2) has no underground connection",
+   "measure-a: Kalbekin (burg 675, cell 1661, feature 2) has no underground connection",
+   "measure-a: Yiupingdak (burg 718, cell 2970, feature 2) has no underground connection",
+   "measure-a: Corisipoma (burg 794, cell 4427, feature 2) has no underground connection",
+   "measure-a: Mokh (burg 59, cell 4040, feature 4) has no underground connection",
+   "measure-a: Friexausen (burg 254, cell 2050, feature 4) has no underground connection",
+   "measure-a: Sujaihawi (burg 400, cell 4485, feature 4) has no underground connection",
+   "measure-a: Alrad (burg 435, cell 3332, feature 4) has no underground connection",
```

So the run fails and names the seed, the burg and its cell. Restored, the same command is green again.

**Mutation: the underground boundary resolution disabled.** Observed: the audit stays green. This is
the expected outcome and not a gap in the check. The prune is defence in depth for the same rule: an
underground record whose boundary lands on a surface burg's cell is a *terminus* on a mismatched cell,
which is exactly what `pruneUndergroundHighways` removes, so the generator never emits a record the
audit would flag. Disabling the resolution alone only removes records that the prune already rejects;
the resulting network is smaller, fully connected, and violation-free (measured: `underground=104`
boundaries instead of `118`, `violations=0`). The boundary rule itself is pinned by the node tests
(`plane-integrity.test.ts`, and the `boundary rule` block in `underground-highways.test.ts`), which
place the violation directly rather than relying on the generator to produce one.
