"""plan-ref.py - Python reference for assets/plan-live.js (learn-terraform-with-phoebe, session 5).

Re-implements the same planning steps independently: HCL-lite parse, moved blocks, diff against a
per-type schema (force-new vs in-place), ignore_changes, prevent_destroy, and the apply order from
a topological sort of action nodes (ties broken by address). Prints the ladder canon as JSON in the
same shape as `node materials/plan-node.js`. Compare the two with materials/compare-ladder.py.

Run:  python3 materials/plan-ref.py > /tmp/py-canon.json
The rung configs and the starting state are re-declared below rather than read from the JS file,
so a typo in either file shows up as a canon mismatch.
"""
from __future__ import annotations

import json
import re
import sys

SCHEMA = {
    "lake_zone": {"data": True, "attrs": {"name": 1, "region": 1, "retention_days": 0, "tags": 0}},
    "catalog": {"data": False, "attrs": {"name": 1, "storage_root": 1}},
    "access_grant": {"data": False, "attrs": {"target": 1, "role": 0}},
}
UNKNOWN = ("<unknown>",)


def strip_comment(line: str) -> str:
    out, in_str = [], False
    i = 0
    while i < len(line):
        c = line[i]
        if c == '"':
            in_str = not in_str
        if not in_str and (c == "#" or (c == "/" and line[i + 1 : i + 2] == "/")):
            break
        out.append(c)
        i += 1
    return "".join(out).strip()


def parse_value(raw: str, where: str) -> dict:
    v = raw.strip()
    if re.fullmatch(r'"[^"]*"', v):
        return {"lit": v[1:-1]}
    if re.fullmatch(r"-?\d+(\.\d+)?", v):
        return {"lit": int(v) if re.fullmatch(r"-?\d+", v) else float(v)}
    if v in ("true", "false"):
        return {"lit": v == "true"}
    if v == "all":
        return {"all": True}
    if v.startswith("[") and v.endswith("]"):
        inner = v[1:-1].strip()
        items = [s.strip() for s in inner.split(",") if s.strip()] if inner else []
        for s in items:
            if not re.fullmatch(r"[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*", s):
                raise ValueError(f"{where}: list items must be references, got {s}")
        return {"list": items}
    if re.fullmatch(r"[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*", v):
        p = v.split(".")
        return {"ref": f"{p[0]}.{p[1]}", "attr": p[2]}
    raise ValueError(f"{where}: cannot read value {v}")


def parse(text: str) -> dict:
    cfg = {"resources": [], "moved": []}
    cur, sub = None, None
    for n, raw in enumerate(text.split("\n")):
        line, where = strip_comment(raw), f"line {n + 1}"
        if not line:
            continue
        if cur is None:
            m = re.fullmatch(r'resource\s+"([a-z_]+)"\s+"([a-z_][a-z0-9_]*)"\s*\{', line)
            if m:
                if m.group(1) not in SCHEMA:
                    raise ValueError(f'{where}: unknown resource type "{m.group(1)}"')
                cur = {"kind": "resource", "type": m.group(1), "address": f"{m.group(1)}.{m.group(2)}",
                       "attrs": {}, "depends_on": [], "cbd": False, "prevent": False, "ignore": []}
            elif re.fullmatch(r"moved\s*\{", line):
                cur = {"kind": "moved", "from": None, "to": None}
            else:
                raise ValueError(f"{where}: expected a resource or moved block")
            continue
        if line == "}":
            if sub:
                sub = None
                continue
            if cur["kind"] == "moved":
                cfg["moved"].append({"from": cur["from"], "to": cur["to"]})
            else:
                if any(r["address"] == cur["address"] for r in cfg["resources"]):
                    raise ValueError(f"{where}: duplicate resource {cur['address']}")
                cfg["resources"].append(cur)
            cur = None
            continue
        if cur["kind"] == "resource" and re.fullmatch(r"lifecycle\s*\{", line):
            sub = "lifecycle"
            continue
        m = re.fullmatch(r"([a-z_][a-z0-9_]*)\s*=\s*(.+)", line)
        if not m:
            raise ValueError(f"{where}: cannot read {line}")
        key = m.group(1)
        if cur["kind"] == "moved":
            if key not in ("from", "to") or not re.fullmatch(r"[a-z_]+\.[a-z_][a-z0-9_]*", m.group(2).strip()):
                raise ValueError(f"{where}: moved takes from = type.name and to = type.name")
            cur[key] = m.group(2).strip()
            continue
        val = parse_value(m.group(2), where)
        if sub == "lifecycle":
            if key == "create_before_destroy":
                cur["cbd"] = val.get("lit") is True
            elif key == "prevent_destroy":
                cur["prevent"] = val.get("lit") is True
            elif key == "ignore_changes":
                cur["ignore"] = "all" if val.get("all") else val.get("list", [])
            else:
                raise ValueError(f"{where}: unknown lifecycle argument {key}")
            continue
        if key == "depends_on":
            cur["depends_on"] = list(val.get("list", []))
            continue
        if key not in SCHEMA[cur["type"]]["attrs"]:
            raise ValueError(f'{where}: "{key}" is not an argument of {cur["type"]}')
        cur["attrs"][key] = val
    if cur is not None:
        raise ValueError("a block is missing its closing }")
    return cfg


def config_deps(r: dict) -> list[str]:
    d = {v["ref"] for v in r["attrs"].values() if "ref" in v} | set(r["depends_on"])
    return sorted(d)


def ignored(r: dict, k: str) -> bool:
    return r["ignore"] == "all" or k in r["ignore"]


def plan(text: str, state_in: list[dict]) -> dict:
    try:
        cfg = parse(text)
    except ValueError as e:
        return {"error": f"Error: {e}"}
    state = json.loads(json.dumps(state_in))
    moves = []
    for mv in cfg["moved"]:
        frm = next((r for r in state if r["address"] == mv["from"]), None)
        clash = any(r["address"] == mv["to"] for r in state)
        if frm and not clash:
            frm["address"] = mv["to"]
            moves.append(mv)
    idx = {r["address"]: r for r in state}
    res = {r["address"]: r for r in cfg["resources"]}
    addrs = sorted(res)
    for a in addrs:
        for d in config_deps(res[a]):
            if d not in res:
                return {"error": "Error: Reference to undeclared resource"}
    topo, seen, onstack = [], set(), set()

    def visit(a: str) -> bool:
        if a in seen:
            return True
        if a in onstack:
            return False
        onstack.add(a)
        for d in config_deps(res[a]):
            if not visit(d):
                return False
        onstack.discard(a)
        seen.add(a)
        topo.append(a)
        return True

    for a in addrs:
        if not visit(a):
            return {"error": f"Error: Cycle in the dependency graph involving {a}"}

    actions, planned, changes = {}, {}, {}
    for a in topo:
        r, old = res[a], idx.get(a)
        attrs = SCHEMA[r["type"]]["attrs"]
        vals = {}
        for k in sorted(attrs):
            v = r["attrs"].get(k)
            if v is None:
                vals[k] = None
            elif "ref" in v:
                tgt = planned[v["ref"]]
                vals[k] = tgt["id"] if v["attr"] == "id" else tgt["vals"].get(v["attr"])
            else:
                vals[k] = v["lit"]
        if old is not None and old["type"] != r["type"]:
            old = None
        diff = []
        if old is None:
            act = "create"
        else:
            force_new = False
            for k in sorted(attrs):
                if ignored(r, k):
                    continue
                nv, ov = vals[k], old["attrs"].get(k)
                if nv == UNKNOWN or nv != ov:
                    diff.append(k)
                    force_new = force_new or attrs[k] == 1
            act = "replace" if force_new else ("update" if diff else "noop")
        if act in ("create", "replace"):
            planned[a] = {"id": UNKNOWN, "vals": vals}
        else:
            planned[a] = {"id": old["id"], "vals": {k: (old["attrs"].get(k) if ignored(r, k) else vals[k]) for k in vals}}
        actions[a], changes[a] = act, diff
    for r in state:
        if r["address"] not in res:
            actions[r["address"]] = "delete"

    allk = sorted(actions)
    for a in allk:
        if actions[a] in ("delete", "replace") and a in res and res[a]["prevent"]:
            return {"error": "Error: Instance cannot be destroyed", "blocked": a}

    c = {"add": 0, "change": 0, "destroy": 0, "replace": 0}
    data_destroyed = drift = 0
    for a in allk:
        act = actions[a]
        typ = res[a]["type"] if a in res else idx[a]["type"]
        if act == "create":
            c["add"] += 1
        elif act == "update":
            c["change"] += 1
        elif act == "delete":
            c["destroy"] += 1
        elif act == "replace":
            c["add"] += 1
            c["destroy"] += 1
            c["replace"] += 1
        if act in ("delete", "replace") and SCHEMA[typ]["data"]:
            data_destroyed += 1
    for a in addrs:
        r, old = res[a], idx.get(a)
        if old is None or actions[a] == "replace":
            continue
        for k in SCHEMA[r["type"]]["attrs"]:
            v = r["attrs"].get(k)
            if not ignored(r, k) or v is None:
                continue
            want = planned[v["ref"]]["vals"].get(v["attr"]) if "ref" in v else v["lit"]
            if want != old["attrs"].get(k):
                drift += 1
    return {"counts": c, "data": data_destroyed, "drift": drift, "actions": actions, "moves": moves,
            "order": apply_order(actions, res, idx)}


def apply_order(actions: dict, res: dict, idx: dict) -> list[str]:
    nodes: dict[str, set] = {}
    indeg: dict[str, int] = {}

    def node(i: str) -> None:
        if i not in nodes:
            nodes[i] = set()
            indeg[i] = 0

    def edge(a: str, b: str) -> None:
        if a not in nodes or b not in nodes or b in nodes[a]:
            return
        nodes[a].add(b)
        indeg[b] += 1

    allk = sorted(actions)
    for a in allk:
        act = actions[a]
        if act in ("create", "replace"):
            node("create " + a)
        if act == "update":
            node("update " + a)
        if act in ("delete", "replace"):
            node("destroy " + a)

    def up(a: str):
        if "create " + a in nodes:
            return "create " + a
        if "update " + a in nodes:
            return "update " + a
        return None

    for a in allk:
        act = actions[a]
        if a in res:
            for d in config_deps(res[a]):
                u, me = up(d), up(a)
                if u and me:
                    edge(u, me)
        if a in idx and "destroy " + a in nodes:
            for d in idx[a]["deps"]:
                if "destroy " + d in nodes:
                    edge("destroy " + a, "destroy " + d)
        if act == "replace":
            if res[a]["cbd"]:
                edge("create " + a, "destroy " + a)
                for b in allk:
                    if b in res and a in config_deps(res[b]) and up(b):
                        edge(up(b), "destroy " + a)
            else:
                edge("destroy " + a, "create " + a)
                for b in allk:
                    if b in idx and a in idx[b]["deps"] and "destroy " + b in nodes:
                        edge("destroy " + b, "destroy " + a)

    def key(k: str) -> str:
        verb, a = k.split(" ", 1)
        return f"{a} {verb}"

    order, ready = [], [k for k in nodes if indeg[k] == 0]
    while ready:
        ready.sort(key=key)
        k = ready.pop(0)
        order.append(k)
        for b in sorted(nodes[k]):
            indeg[b] -= 1
            if indeg[b] == 0:
                ready.append(b)
    out = []
    for k in order:
        verb, a = k.split(" ", 1)
        tag = ""
        if actions[a] == "replace":
            tag = (" (deposed object)" if res[a]["cbd"] else " (old object)") if verb == "destroy" else " (replacement)"
        out.append(f"{verb} {a}{tag}")
    return out


# ---------- the Larkspur Freight rungs (constructed), re-declared ----------
BASE_STATE = [
    {"address": "lake_zone.raw", "type": "lake_zone", "id": "lz-7f24",
     "attrs": {"name": "larkspur-prod-raw", "region": "eu-west-1", "retention_days": 30, "tags": "team=data"}, "deps": []},
    {"address": "lake_zone.curated", "type": "lake_zone", "id": "lz-1b71",
     "attrs": {"name": "larkspur-prod-curated", "region": "eu-west-1", "retention_days": 365, "tags": "team=data"}, "deps": []},
    {"address": "catalog.main", "type": "catalog", "id": "cat-04d2",
     "attrs": {"name": "larkspur_prod", "storage_root": "larkspur-prod-curated"}, "deps": ["lake_zone.curated", "lake_zone.raw"]},
    {"address": "access_grant.analysts", "type": "access_grant", "id": "ag-9e11",
     "attrs": {"role": "analyst_read", "target": "larkspur_prod"}, "deps": ["catalog.main"]},
]
RAW = ['resource "lake_zone" "raw" {', '  name           = "larkspur-prod-raw"', '  region         = "eu-west-1"',
       "  retention_days = 30", '  tags           = "team=data"']
CUR = ['resource "lake_zone" "curated" {', '  name           = "larkspur-prod-curated"', '  region         = "eu-west-1"',
       "  retention_days = 365", '  tags           = "team=data"', "}"]
CAT = ['resource "catalog" "main" {', '  name         = "larkspur_prod"', "  storage_root = lake_zone.curated.name",
       "  depends_on   = [lake_zone.raw]", "}"]
GRANT = ['resource "access_grant" "analysts" {', "  target = catalog.main.name", '  role   = "analyst_read"', "}"]


def cfg(raw, extra=(), cur=None) -> str:
    blocks = ["\n".join(raw + ["}"]), "\n".join(cur or CUR), "\n".join(CAT), "\n".join(GRANT)] + list(extra)
    return "\n\n".join(blocks) + "\n"


def swap(lines, a, b):
    return [ln.replace(a, b) for ln in lines]


EU_C = swap(RAW, '"eu-west-1"', '"eu-central-1"')
LANDING = swap(RAW, '"lake_zone" "raw"', '"lake_zone" "landing"')
LIFE = lambda arg: ["", "  lifecycle {", f"    {arg}", "  }"]  # noqa: E731
RUNGS = {
    1: {"cfg": cfg(RAW, ['resource "lake_zone" "serving" {\n  name           = "larkspur-prod-serving"\n  region         = "eu-west-1"\n'
                         '  retention_days = 90\n  tags           = "team=data"\n}'])},
    2: {"cfg": cfg(LANDING).replace("depends_on   = [lake_zone.raw]", "depends_on   = [lake_zone.landing]")},
    3: {"cfg": cfg(LANDING, ["moved {\n  from = lake_zone.raw\n  to   = lake_zone.landing\n}"]).replace(
        "depends_on   = [lake_zone.raw]", "depends_on   = [lake_zone.landing]")},
    4: {"cfg": cfg(EU_C)},
    5: {"cfg": cfg(EU_C + LIFE("prevent_destroy = true"))},
    6: {"cfg": cfg(EU_C + LIFE("create_before_destroy = true"))},
    7: {"cfg": cfg(swap(RAW, '"team=data"', '"team=data,owner=platform"'))},
    8: {"cfg": cfg(RAW, [], swap(CUR, '"larkspur-prod-curated"', '"larkspur-prod-curated-v2"'))},
    9: {"cfg": cfg(RAW), "edits": 1},
    10: {"cfg": cfg(RAW + LIFE("ignore_changes = all")), "edits": 1},
}
CONSOLE_EDITS = [("lake_zone.raw", "tags", "team=data,temp-access=vendor"), ("lake_zone.raw", "retention_days", 7)]


def state_for(rung: dict) -> list[dict]:
    st = json.loads(json.dumps(BASE_STATE))
    for k in range(rung.get("edits", 0)):
        addr, attr, val = CONSOLE_EDITS[k % len(CONSOLE_EDITS)]
        for r in st:
            if r["address"] == addr:
                r["attrs"][attr] = val
    return st


def mulberry32(a: int):
    state = [a & 0xFFFFFFFF]

    def imul(x, y):
        return (x * y) & 0xFFFFFFFF

    def rnd():
        state[0] = (state[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = state[0]
        t = imul(t ^ (t >> 15), 1 | t)
        t = ((t + imul(t ^ (t >> 7), 61 | t)) & 0xFFFFFFFF) ^ t
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

    return rnd


def split_blocks(text: str) -> list[str]:
    blocks, cur, depth = [], [], 0
    for ln in text.split("\n"):
        s = strip_comment(ln)
        if depth == 0 and not s:
            continue
        cur.append(ln)
        if s.endswith("{"):
            depth += 1
        if s == "}":
            depth -= 1
            if depth == 0:
                blocks.append("\n".join(cur))
                cur = []
    if cur:
        blocks.append("\n".join(cur))
    return blocks


def shuffle_text(text: str, seed: int) -> str:
    b, rnd = split_blocks(text), mulberry32(seed)
    for i in range(len(b) - 1, 0, -1):
        j = int(rnd() * (i + 1))
        b[i], b[j] = b[j], b[i]
    return "\n\n".join(b) + "\n"


def summary(p: dict) -> dict:
    c = p.get("counts", {"add": 0, "change": 0, "destroy": 0, "replace": 0})
    acts = p.get("actions", {})
    return {"error": p["error"].split("\n")[0] if p.get("error") else None, "add": c["add"], "change": c["change"],
            "destroy": c["destroy"], "replace": c["replace"], "dataDestroyed": p.get("data", 0), "drift": p.get("drift", 0),
            "moved": len(p.get("moves", [])),
            "actions": [f"{acts[a]} {a}" for a in sorted(acts) if acts[a] != "noop"], "order": p.get("order", [])}


def canon() -> list[dict]:
    out = []
    for n in sorted(RUNGS):
        r, st = RUNGS[n], state_for(RUNGS[n])
        s = summary(plan(r["cfg"], st))
        inv = all(summary(plan(shuffle_text(r["cfg"], seed * 7919), st)) == s for seed in range(1, 6))
        s["rung"], s["shuffleInvariant"] = n, inv
        k = r.get("edits", 0)
        addr, attr, val = CONSOLE_EDITS[k % len(CONSOLE_EDITS)]
        st2 = json.loads(json.dumps(st))
        for x in st2:
            if x["address"] == addr:
                x["attrs"][attr] = val
        s["driftAfterConsoleEdit"] = plan(r["cfg"], st2).get("drift", 0)
        out.append(s)
    return out


if __name__ == "__main__":
    json.dump(canon(), sys.stdout, indent=1)
    sys.stdout.write("\n")
