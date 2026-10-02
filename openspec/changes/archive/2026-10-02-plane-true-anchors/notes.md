# Implementation notes

## Spike: interior anchor flips on the harness seed batch (task 5.3)

Informative only, no acceptance gate. Run 2026-10-02 in browser mode (`vitest.browser.config.ts`,
temporary spike test, deleted after recording) over the archived harness's eight `measure-*` seeds
(`options.template = "continents"`, underground generation on, `GenerationPipeline`, `auditPlanes`
clean — 0 violations on every seed).

A "flip" is an interior route point (neither endpoint) on a cell whose live burg record exists, where
the record's stored point is NOT the burg's `x, y` — i.e. exactly the state the plane-blind anchor
would have produced the burg's position for. Counts are per record point, not per cell, so a junction
cell crossed by several records counts several times.

| seed | tunnel flips | surface flips |
| --- | --- | --- |
| measure-a | 22 | 664 |
| measure-b | 24 | 600 |
| measure-c | 29 | 554 |
| measure-d | 24 | 951 |
| measure-e | 41 | 1386 |
| measure-f | 28 | 759 |
| measure-g | 39 | 741 |
| measure-h | 27 | 1121 |

Reading: the two runs of the spike (a broken-classification pass and the corrected one) produced
identical numbers for both counters, so the batch is seed-deterministic. Tunnel flips (24–41 per map)
are the both-state icon collisons this change removes; surface flips (554–1386 per map) are the
buried-burg cells roads now take at the cell centre — the numbers are large because interior route
points at *any* burg cell are counted per record, and the surface network is far denser than the
tunnel one.

## Fixture changes that were forced by the plane-true discount

- `underground-highways.test.ts` "does not move the surface network" pinned the old plane-blind
  burg discount (1 vs 3); rewritten per the amended requirement: a below-level burg's cell prices as
  a plain one before and after the map clears the id, and the dual burg's factor is pinned by the
  new `landQuotient` probes.
- "keeps every cell of a surface path when the boundary moves" relied on the old cheap-burg pull to
  make the surface path cross the classified cell; it now sinks the cell's other neighbours so the
  below-level cell remains the only passage, and the boundary keeps every cell.
- `primeAttractionProbe` was order-leaky (stale `surfaceDistances` and `connections` from earlier
  passes); it now resets the pass's own fields, so the quotients carry the burg term alone.
