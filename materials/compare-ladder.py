"""compare-ladder.py - compare the node and Python ladder canon BY VALUE, field by field.

Usage: python3 materials/compare-ladder.py <node.json> <python.json>
Exit 0 only if every rung matches on every field. A self-test plants one wrong count and one
swapped apply-order step and must see both caught, so a comparer that cannot fail is not trusted.
"""
import copy
import json
import sys

FIELDS = ["error", "add", "change", "destroy", "replace", "dataDestroyed", "drift", "moved", "actions", "order", "shuffleInvariant", "driftAfterConsoleEdit"]


def diffs(a, b):
    out = []
    if len(a) != len(b):
        return [f"rung count {len(a)} vs {len(b)}"]
    for x, y in zip(a, b):
        if x["rung"] != y["rung"]:
            out.append(f"rung id {x['rung']} vs {y['rung']}")
        for f in FIELDS:
            if x.get(f) != y.get(f):
                out.append(f"rung {x['rung']} field {f}: {x.get(f)!r} vs {y.get(f)!r}")
    return out


def main():
    node = json.load(open(sys.argv[1]))
    py = json.load(open(sys.argv[2]))
    bad = copy.deepcopy(py)
    bad[3]["add"] += 1
    if len(bad[5]["order"]) > 1:
        bad[5]["order"] = list(reversed(bad[5]["order"]))
    planted = diffs(node, bad)
    if len(planted) < 2:
        print("SELF-TEST FAILED: planted faults not caught", planted)
        sys.exit(2)
    print(f"self-test ok: {len(planted)} planted faults caught")
    d = diffs(node, py)
    for line in d:
        print("MISMATCH", line)
    print(f"{len(node)} rungs compared, {len(d)} mismatches")
    sys.exit(1 if d else 0)


if __name__ == "__main__":
    main()
