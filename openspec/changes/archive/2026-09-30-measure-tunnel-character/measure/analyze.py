#!/usr/bin/env python3
"""Reads the harness logs in this directory and prints the tables evidence.md quotes.

    python3 analyze.py <log> [<log> ...]        # summary per variant
    python3 analyze.py --anchor <log> ...       # fidelity anchor + character anchor per seed
    python3 analyze.py --biome <log>            # the per-seed biome tables
    python3 analyze.py --deltas <log>           # per-seed movement against that log's baseline arm

Rows are keyed by (seed, variant); every figure evidence.md quotes must be reproducible here.
"""
import json
import sys
from collections import defaultdict

CHARACTER_COLUMNS = [
    "directness", "directness125", "directness150", "directnessMax", "tunnelH", "corridorH", "landMeanH",
    "crestCrossings", "crestHit", "crestSag", "passUnder", "nearMiss", "anchorMinDist", "tunnelCells"
]
ALIGNMENT_COLUMNS = ["overlap", "overlapLand", "waterShare", "exactEdge", "alongEdge", "length"]


def load(paths):
    rows = {}
    biomes = defaultdict(list)
    char_lines = []
    for path in paths:
        for line in open(path):
            if line.startswith("ROW "):
                row = json.loads(line[4:])
                rows[(row["seed"], row["variant"], path)] = row
            elif line.startswith("BIOME "):
                biomes[path].append(json.loads(line[6:]))
            elif line.startswith("CHAR "):
                char_lines.append(line.rstrip())
    return rows, biomes, char_lines


def seeds_of(rows, path=None):
    return sorted({seed for seed, _, source in rows if path is None or source == path})


def mean(values):
    values = list(values)
    return sum(values) / len(values) if values else 0


def variants_of(rows, path):
    return sorted({variant for _, variant, source in rows if source == path})


def summary(path):
    rows, _, _ = load([path])
    seeds = seeds_of(rows, path)
    print(f"# {path}  ({len(seeds)} seeds, {len(variants_of(rows, path))} variants)")
    header = f"{'variant':<26}{'overlap':>8}{'passUnder':>10}{'nearMiss':>9}{'direct':>8}{'cr125':>7}{'crestHit':>9}{'crestSag':>9}{'tunH':>7}{'corH':>7}{'landH':>7}{'lenRat':>8}{'ms':>7}"
    print(header)
    print("-" * len(header))
    for variant in variants_of(rows, path):
        subset = [rows[(seed, variant, path)] for seed in seeds if (seed, variant, path) in rows]
        if not subset:
            continue
        length = mean(row["length"] for row in subset)
        base = mean(rows[(seed, "baseline-production", path)]["length"] for seed in seeds if (seed, "baseline-production", path) in rows)
        print(
            f"{variant:<26}{mean(r['overlap'] for r in subset):>8.3f}"
            f"{mean(r['passUnder'] for r in subset):>10.1f}"
            f"{mean(r['nearMiss'] for r in subset):>9.1f}"
            f"{mean(r['directness'] for r in subset):>8.3f}"
            f"{mean(r['directness125'] for r in subset):>7.3f}"
            f"{mean(r['crestHit'] for r in subset):>9.3f}"
            f"{mean(r['crestSag'] for r in subset):>9.1f}"
            f"{mean(r['tunnelH'] for r in subset):>7.1f}"
            f"{mean(r['corridorH'] for r in subset):>7.1f}"
            f"{mean(r['landMeanH'] for r in subset):>7.1f}"
            f"{(length / base if base else 0):>8.3f}"
            f"{int(mean(r['ms'] for r in subset)):>7}"
        )


def anchor(path):
    """The standing anchor is about the network: the replica must reproduce production's cells, length
    and overlap. The character columns are reported beside it, because a metric read off drawn geometry
    legitimately differs between the two arms."""
    rows, _, _ = load([path])
    print(f"# fidelity anchor (alignment columns) + character columns beside it, {path}")
    for seed in seeds_of(rows, path):
        base, replica = rows.get((seed, "baseline-production", path)), rows.get((seed, "replica-production", path))
        if not base or not replica:
            continue
        drift = [c for c in ALIGNMENT_COLUMNS if base.get(c) != replica.get(c)]
        char = [c for c in CHARACTER_COLUMNS if base.get(c) != replica.get(c)]
        print(
            f"  {seed}: alignment={'HOLDS' if not drift else 'DRIFT ' + str(drift)}"
            f"  character_differs_on={char or 'nothing'}"
            f"  cells={base['cells']}/{replica['cells']} length={base['length']}/{replica['length']}"
        )
    for line in [line for line in open(path) if line.startswith("FIDELITY ")]:
        print("  " + line.rstrip())


def biome(path):
    _, biomes, _ = load([path])
    for seed_table in biomes.get(path, []):
        entries = [(k, v) for k, v in seed_table.items() if k not in ("seed", "variant")]
        entries.sort(key=lambda item: item[1]["cells"], reverse=True)
        print(f"# {seed_table['seed']} tunnel land cells by biome (share of tunnel land vs share of land)")
        for name, value in entries:
            print(f"  {name:<28} cells={value['cells']:>4}  tunnel={value['tunnel']:.3f}  land={value['land']:.3f}")


def deltas(path):
    rows, _, _ = load([path])
    seeds = seeds_of(rows, path)
    print(f"# per-seed movement against baseline-production, {path}")
    header = f"{'variant':<26}{'seed':<12}{'dOverlap':>10}{'lenRat':>8}{'dPassUnder':>12}{'dNearMiss':>11}{'dDirect':>9}{'dCrestHit':>11}{'dCrestSag':>11}{'dTunH':>8}"
    print(header)
    print("-" * len(header))
    for variant in variants_of(rows, path):
        if variant == "baseline-production":
            continue
        for seed in seeds:
            row, base = rows.get((seed, variant, path)), rows.get((seed, "baseline-production", path))
            if not row or not base:
                continue
            print(
                f"{variant:<26}{seed:<12}{(row['overlap'] - base['overlap']):>+10.3f}"
                f"{(row['length'] / base['length']):>8.3f}"
                f"{(row['passUnder'] - base['passUnder']):>+12.0f}"
                f"{(row['nearMiss'] - base['nearMiss']):>+11.0f}"
                f"{(row['directness'] - base['directness']):>+9.3f}"
                f"{(row['crestHit'] - base['crestHit']):>+11.3f}"
                f"{(row['crestSag'] - base['crestSag']):>+11.1f}"
                f"{(row['tunnelH'] - base['tunnelH']):>+8.1f}"
            )


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return
    mode, paths = "summary", args
    for flag in ("--anchor", "--biome", "--deltas"):
        if flag in args:
            mode, paths = flag[2:], [a for a in args if not a.startswith("--")]
    for path in paths:
        {"summary": summary, "anchor": anchor, "biome": biome, "deltas": deltas}[mode](path)
        print()


main()
