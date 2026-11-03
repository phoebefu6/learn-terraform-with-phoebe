/* plan-live.js - the plan simulator for learn-terraform-with-phoebe (session 5)
 *
 * A real, deterministic planning engine in vanilla JS. Nothing here is a lookup table of answers:
 * every rung parses a desired configuration written in a small HCL-lite, diffs it against a
 * current state, and computes the plan and the apply order from the dependency graph.
 *
 *   parse      resource blocks, attributes, implicit references (lake_zone.raw.name), depends_on,
 *              lifecycle { create_before_destroy, prevent_destroy, ignore_changes }, moved blocks.
 *   moved      state addresses are rewritten before the diff, so a moved resource is not destroyed.
 *   diff       per-type schema: force-new attributes replace, the rest update in place;
 *              ignore_changes hides attributes from the diff; a reference to an attribute of a
 *              resource being created or replaced is known only if the config sets it (id is not).
 *   errors     prevent_destroy on a resource the plan would destroy stops the whole plan.
 *   order      a topological sort of action nodes. Creates follow the config graph, destroys run in
 *              reverse of the state graph, a replace is destroy-then-create unless
 *              create_before_destroy flips it. Ties break by address, never by file order.
 *
 * The Python reference (materials/plan-ref.py) runs the same steps and prints the same ladder.
 * Honesty rail, printed on the widget: a teaching engine that follows Terraform's planning rules
 * for these resource types; real providers add more attributes and more rules.
 */
(function (root) {
  "use strict";

  var SCHEMA = {
    lake_zone: { dataBearing: true, attrs: { name: 1, region: 1, retention_days: 0, tags: 0 } },
    catalog: { dataBearing: false, attrs: { name: 1, storage_root: 1 } },
    access_grant: { dataBearing: false, attrs: { target: 1, role: 0 } }
  };
  var UNKNOWN = { unknown: true };

  /* ---------- HCL-lite parser ---------- */
  function stripComment(line) {
    var out = "", inStr = false;
    for (var i = 0; i < line.length; i++) {
      var c = line.charAt(i);
      if (c === '"') inStr = !inStr;
      if (!inStr && (c === "#" || (c === "/" && line.charAt(i + 1) === "/"))) break;
      out += c;
    }
    return out.trim();
  }

  function parseValue(raw, where) {
    var v = raw.trim();
    if (/^"[^"]*"$/.test(v)) return { lit: v.slice(1, -1) };
    if (/^-?\d+(\.\d+)?$/.test(v)) return { lit: Number(v) };
    if (v === "true" || v === "false") return { lit: v === "true" };
    if (v === "all") return { all: true };
    if (/^\[.*\]$/.test(v)) {
      var inner = v.slice(1, -1).trim();
      var items = inner === "" ? [] : inner.split(",").map(function (s) { return s.trim(); }).filter(function (s) { return s !== ""; });
      items.forEach(function (s) {
        if (!/^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)*$/.test(s)) throw new Error(where + ": list items must be references, got " + s);
      });
      return { list: items };
    }
    if (/^[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*\.[a-z_][a-z0-9_]*$/.test(v)) {
      var p = v.split(".");
      return { ref: p[0] + "." + p[1], attr: p[2] };
    }
    throw new Error(where + ": cannot read value " + v);
  }

  function parse(text) {
    var lines = text.split("\n"), cfg = { resources: [], moved: [] };
    var cur = null, sub = null, n;
    for (n = 0; n < lines.length; n++) {
      var line = stripComment(lines[n]), where = "line " + (n + 1), m;
      if (line === "") continue;
      if (!cur) {
        if ((m = line.match(/^resource\s+"([a-z_]+)"\s+"([a-z_][a-z0-9_]*)"\s*\{$/))) {
          if (!SCHEMA[m[1]]) throw new Error(where + ': unknown resource type "' + m[1] + '"');
          cur = { kind: "resource", type: m[1], name: m[2], address: m[1] + "." + m[2], attrs: {}, dependsOn: [],
                  lifecycle: { cbd: false, prevent: false, ignore: [] } };
        } else if (/^moved\s*\{$/.test(line)) {
          cur = { kind: "moved", from: null, to: null };
        } else throw new Error(where + ": expected a resource or moved block");
        continue;
      }
      if (line === "}") {
        if (sub) { sub = null; continue; }
        if (cur.kind === "moved") {
          if (!cur.from || !cur.to) throw new Error(where + ": moved needs from and to");
          cfg.moved.push({ from: cur.from, to: cur.to });
        } else {
          cfg.resources.forEach(function (r) { if (r.address === cur.address) throw new Error(where + ": duplicate resource " + cur.address); });
          cfg.resources.push(cur);
        }
        cur = null; continue;
      }
      if (cur.kind === "resource" && /^lifecycle\s*\{$/.test(line)) { sub = "lifecycle"; continue; }
      m = line.match(/^([a-z_][a-z0-9_]*)\s*=\s*(.+)$/);
      if (!m) throw new Error(where + ": cannot read " + line);
      var key = m[1];
      if (cur.kind === "moved") {
        if ((key !== "from" && key !== "to") || !/^[a-z_]+\.[a-z_][a-z0-9_]*$/.test(m[2].trim()))
          throw new Error(where + ": moved takes from = type.name and to = type.name");
        cur[key] = m[2].trim();
        continue;
      }
      var val = parseValue(m[2], where);
      if (sub === "lifecycle") {
        if (key === "create_before_destroy") cur.lifecycle.cbd = val.lit === true;
        else if (key === "prevent_destroy") cur.lifecycle.prevent = val.lit === true;
        else if (key === "ignore_changes") cur.lifecycle.ignore = val.all ? "all" : (val.list || []);
        else throw new Error(where + ": unknown lifecycle argument " + key);
        continue;
      }
      if (key === "depends_on") { cur.dependsOn = (val.list || []).slice(); continue; }
      if (!(key in SCHEMA[cur.type].attrs)) throw new Error(where + ': "' + key + '" is not an argument of ' + cur.type);
      cur.attrs[key] = val;
    }
    if (cur) throw new Error("a block is missing its closing }");
    return cfg;
  }

  /* ---------- planning ---------- */
  function cloneState(st) { return st.map(function (r) { return { address: r.address, type: r.type, id: r.id, attrs: JSON.parse(JSON.stringify(r.attrs)), deps: r.deps.slice() }; }); }
  function byAddr(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
  function fmt(v) { return v && v.unknown ? "(known after apply)" : (typeof v === "string" ? '"' + v + '"' : v === null || v === undefined ? "null" : String(v)); }

  function configDeps(r) {
    var d = {};
    Object.keys(r.attrs).forEach(function (k) { if (r.attrs[k].ref) d[r.attrs[k].ref] = 1; });
    r.dependsOn.forEach(function (x) { d[x] = 1; });
    return Object.keys(d).sort(byAddr);
  }

  function plan(cfgText, stateIn) {
    var cfg;
    try { cfg = parse(cfgText); } catch (e) { return { error: "Error: " + e.message, parseError: true }; }
    var state = cloneState(stateIn), moves = [], idx = {};
    cfg.moved.forEach(function (mv) {
      var from = null, clash = false;
      state.forEach(function (r) { if (r.address === mv.from) from = r; if (r.address === mv.to) clash = true; });
      if (from && !clash) { from.address = mv.to; moves.push(mv); }
    });
    state.forEach(function (r) { idx[r.address] = r; });
    var res = {}, addrs = cfg.resources.map(function (r) { res[r.address] = r; return r.address; }).sort(byAddr);

    // undeclared references
    for (var i = 0; i < addrs.length; i++) {
      var deps = configDeps(res[addrs[i]]);
      for (var j = 0; j < deps.length; j++)
        if (!res[deps[j]]) return { error: "Error: Reference to undeclared resource\n\n  " + addrs[i] + " refers to " + deps[j] + ", which is not declared." };
    }
    // topological order of config for value resolution (ties by address)
    var topo = [], seen = {}, onstack = {};
    function visit(a) {
      if (seen[a]) return true;
      if (onstack[a]) return false;
      onstack[a] = 1;
      var ds = configDeps(res[a]);
      for (var k = 0; k < ds.length; k++) if (!visit(ds[k])) return false;
      onstack[a] = 0; seen[a] = 1; topo.push(a); return true;
    }
    for (i = 0; i < addrs.length; i++) if (!visit(addrs[i])) return { error: "Error: Cycle in the dependency graph involving " + addrs[i] };

    var actions = {}, planned = {}, changes = {};
    topo.forEach(function (a) {
      var r = res[a], old = idx[a], sch = SCHEMA[r.type], vals = {};
      Object.keys(sch.attrs).sort(byAddr).forEach(function (k) {
        var v = r.attrs[k];
        if (!v) { vals[k] = null; return; }
        if (v.ref) {
          var tgt = planned[v.ref];
          vals[k] = (v.attr === "id") ? tgt.id : (v.attr in tgt.vals ? tgt.vals[v.attr] : null);
        } else vals[k] = v.lit;
      });
      var act, diff = [];
      if (old && old.type !== r.type) old = null;
      if (!old) act = "create";
      else {
        var ign = r.lifecycle.ignore, forceNew = false;
        Object.keys(sch.attrs).sort(byAddr).forEach(function (k) {
          if (ign === "all" || (ign.indexOf && ign.indexOf(k) >= 0)) return;
          var nv = vals[k], ov = old.attrs.hasOwnProperty(k) ? old.attrs[k] : null;
          if (nv && nv.unknown || nv !== ov) {
            diff.push({ attr: k, from: ov, to: nv, forceNew: sch.attrs[k] === 1 });
            if (sch.attrs[k] === 1) forceNew = true;
          }
        });
        act = forceNew ? "replace" : diff.length ? "update" : "noop";
      }
      if (act === "create" || act === "replace") {
        // config-set values are known; anything still unresolved stays unknown
        planned[a] = { id: UNKNOWN, vals: vals };
      } else {
        var kept = {};
        Object.keys(vals).forEach(function (k) { kept[k] = (r.lifecycle.ignore === "all" || r.lifecycle.ignore.indexOf(k) >= 0) ? (old.attrs.hasOwnProperty(k) ? old.attrs[k] : null) : vals[k]; });
        planned[a] = { id: old.id, vals: kept };
      }
      actions[a] = act; changes[a] = diff;
    });
    state.forEach(function (r) { if (!res[r.address]) actions[r.address] = "delete"; });

    var all = Object.keys(actions).sort(byAddr);
    // prevent_destroy
    for (i = 0; i < all.length; i++) {
      var a0 = all[i];
      if ((actions[a0] === "delete" || actions[a0] === "replace") && res[a0] && res[a0].lifecycle.prevent) {
        return { error: "Error: Instance cannot be destroyed\n\nResource " + a0 + " has lifecycle.prevent_destroy set, but the\nplan calls for this resource to be destroyed.", blocked: a0,
                 counts: { add: 0, change: 0, destroy: 0 }, dataDestroyed: 0 };
      }
    }

    var counts = { add: 0, change: 0, destroy: 0, replace: 0 }, dataDestroyed = 0, drift = 0;
    all.forEach(function (a) {
      var act = actions[a], type = res[a] ? res[a].type : idx[a].type;
      if (act === "create") counts.add++;
      if (act === "update") counts.change++;
      if (act === "delete") counts.destroy++;
      if (act === "replace") { counts.add++; counts.destroy++; counts.replace++; }
      if ((act === "delete" || act === "replace") && SCHEMA[type].dataBearing) dataDestroyed++;
    });
    // unmanaged drift: attributes whose real value differs from the config but ignore_changes hides
    addrs.forEach(function (a) {
      var r = res[a], old = idx[a];
      if (!old || actions[a] === "replace") return;
      Object.keys(SCHEMA[r.type].attrs).forEach(function (k) {
        var hidden = r.lifecycle.ignore === "all" || r.lifecycle.ignore.indexOf(k) >= 0;
        if (!hidden || !r.attrs[k]) return;
        var want = r.attrs[k].ref ? planned[r.attrs[k].ref].vals[r.attrs[k].attr] : r.attrs[k].lit;
        var have = old.attrs.hasOwnProperty(k) ? old.attrs[k] : null;
        if (want !== have) drift++;
      });
    });

    return { counts: counts, dataDestroyed: dataDestroyed, drift: drift, actions: actions, changes: changes,
             moves: moves, order: applyOrder(actions, res, idx), resources: res, state: idx, addrs: all };
  }

  function applyOrder(actions, res, idx) {
    var nodes = {}, edges = {}, indeg = {};
    function node(id) { if (!nodes[id]) { nodes[id] = 1; edges[id] = {}; indeg[id] = 0; } }
    function edge(a, b) { if (!nodes[a] || !nodes[b] || edges[a][b]) return; edges[a][b] = 1; indeg[b]++; }
    var all = Object.keys(actions).sort(byAddr);
    all.forEach(function (a) {
      var act = actions[a];
      if (act === "create" || act === "replace") node("create " + a);
      if (act === "update") node("update " + a);
      if (act === "delete" || act === "replace") node("destroy " + a);
    });
    function up(a) { return nodes["create " + a] ? "create " + a : nodes["update " + a] ? "update " + a : null; }
    all.forEach(function (a) {
      var act = actions[a];
      // creates and updates follow the config graph
      if (res[a]) configDeps(res[a]).forEach(function (d) { var u = up(d), me = up(a); if (u && me) edge(u, me); });
      // destroys run in reverse of the state graph
      if (idx[a] && nodes["destroy " + a]) idx[a].deps.forEach(function (d) { if (nodes["destroy " + d]) edge("destroy " + a, "destroy " + d); });
      if (act === "replace") {
        var cbd = res[a].lifecycle.cbd;
        if (cbd) {
          edge("create " + a, "destroy " + a);
          // the deposed object goes only after everything that depends on the new one is in place
          all.forEach(function (b) { if (res[b] && configDeps(res[b]).indexOf(a) >= 0 && up(b)) edge(up(b), "destroy " + a); });
        } else {
          edge("destroy " + a, "create " + a);
          // a dependent being replaced goes before the thing it depends on
          all.forEach(function (b) { if (idx[b] && idx[b].deps.indexOf(a) >= 0 && nodes["destroy " + b]) edge("destroy " + b, "destroy " + a); });
        }
      }
    });
    var order = [], ready = Object.keys(nodes).filter(function (k) { return indeg[k] === 0; });
    function key(k) { var sp = k.indexOf(" "); return k.slice(sp + 1) + " " + k.slice(0, sp); }
    while (ready.length) {
      ready.sort(function (x, y) { return byAddr(key(x), key(y)); });
      var k = ready.shift();
      order.push(k);
      Object.keys(edges[k]).sort(byAddr).forEach(function (b) { if (--indeg[b] === 0) ready.push(b); });
    }
    return order.map(function (k) {
      var sp = k.indexOf(" "), verb = k.slice(0, sp), a = k.slice(sp + 1);
      var tag = actions[a] === "replace" ? (verb === "destroy" ? (res[a].lifecycle.cbd ? " (deposed object)" : " (old object)") : " (replacement)") : "";
      return verb + " " + a + tag;
    });
  }

  /* ---------- Terraform-style text ---------- */
  var SYM = { create: "  +", update: "  ~", delete: "  -", replace: "-/+", noop: "   " };
  function planText(p) {
    if (p.error) return p.error + (p.blocked ? "\n\nNothing was applied." : "");
    var out = [], acts = p.addrs.filter(function (a) { return p.actions[a] !== "noop"; });
    p.moves.forEach(function (m) { out.push("  # " + m.from + " has moved to " + m.to); });
    if (!acts.length) {
      if (p.moves.length) out.push("");
      out.push("No changes. Your infrastructure matches the configuration.");
      return out.join("\n");
    }
    if (p.moves.length) out.push("");
    acts.forEach(function (a) {
      var act = p.actions[a], r = p.resources[a], st = p.state[a], type = r ? r.type : st.type, nm = a.split(".")[1];
      var sym = act === "replace" && r.lifecycle.cbd ? "+/-" : SYM[act];
      var verb = act === "create" ? "will be created" : act === "update" ? "will be updated in-place" : act === "delete" ? "will be destroyed" : "must be replaced";
      out.push("  # " + a + " " + verb);
      if (act === "delete") out.push("  # (because " + a + " is not in configuration)");
      out.push(sym + ' resource "' + type + '" "' + nm + '" {');
      var rows = [], tail = [];
      if (act === "create") {
        Object.keys(SCHEMA[type].attrs).concat(["id"]).sort(byAddr).forEach(function (k) {
          if (k === "id") { rows.push(["+", k, "(known after apply)"]); return; }
          if (!r.attrs[k]) return;
          var a1 = r.attrs[k];
          rows.push(["+", k, a1.ref ? a1.ref + "." + a1.attr : fmt(a1.lit)]);
        });
      } else if (act === "delete") {
        Object.keys(st.attrs).concat(["id"]).sort(byAddr).forEach(function (k) { rows.push(["-", k, (k === "id" ? fmt(st.id) : fmt(st.attrs[k])) + " -> null"]); });
      } else {
        if (act === "replace") rows.push(["~", "id", fmt(st.id) + " -> (known after apply)"]);
        p.changes[a].forEach(function (c) {
          rows.push(["~", c.attr, fmt(c.from) + " -> " + fmt(c.to) + (act === "replace" && c.forceNew ? " # forces replacement" : "")]);
        });
        if (act === "update") rows.unshift([" ", "id", fmt(st.id)]);
        var hidden = Object.keys(SCHEMA[type].attrs).length - p.changes[a].length;
        if (hidden > 0) tail.push("        # (" + hidden + " unchanged attribute" + (hidden === 1 ? "" : "s") + " hidden)");
      }
      var w = 0;
      rows.forEach(function (x) { w = Math.max(w, x[1].length); });
      rows.forEach(function (x) { out.push("      " + x[0] + " " + x[1] + new Array(w - x[1].length + 1).join(" ") + " = " + x[2]); });
      tail.forEach(function (t) { out.push(t); });
      out.push("    }");
      out.push("");
    });
    out.push("Plan: " + p.counts.add + " to add, " + p.counts.change + " to change, " + p.counts.destroy + " to destroy.");
    return out.join("\n");
  }

  /* ---------- the Larkspur Freight starting point (constructed) ---------- */
  var BASE_STATE = [
    { address: "lake_zone.raw", type: "lake_zone", id: "lz-7f24", attrs: { name: "larkspur-prod-raw", region: "eu-west-1", retention_days: 30, tags: "team=data" }, deps: [] },
    { address: "lake_zone.curated", type: "lake_zone", id: "lz-1b71", attrs: { name: "larkspur-prod-curated", region: "eu-west-1", retention_days: 365, tags: "team=data" }, deps: [] },
    { address: "catalog.main", type: "catalog", id: "cat-04d2", attrs: { name: "larkspur_prod", storage_root: "larkspur-prod-curated" }, deps: ["lake_zone.curated", "lake_zone.raw"] },
    { address: "access_grant.analysts", type: "access_grant", id: "ag-9e11", attrs: { role: "analyst_read", target: "larkspur_prod" }, deps: ["catalog.main"] }
  ];
  var B_RAW = ['resource "lake_zone" "raw" {', '  name           = "larkspur-prod-raw"', '  region         = "eu-west-1"', "  retention_days = 30", '  tags           = "team=data"'];
  var B_CUR = ['resource "lake_zone" "curated" {', '  name           = "larkspur-prod-curated"', '  region         = "eu-west-1"', "  retention_days = 365", '  tags           = "team=data"', "}"];
  var B_CAT = ['resource "catalog" "main" {', '  name         = "larkspur_prod"', "  storage_root = lake_zone.curated.name", "  depends_on   = [lake_zone.raw]", "}"];
  var B_GRANT = ['resource "access_grant" "analysts" {', "  target = catalog.main.name", '  role   = "analyst_read"', "}"];
  function cfg(rawLines, extra, curLines) {
    var blocks = [rawLines.concat(["}"]).join("\n"), (curLines || B_CUR).join("\n"), B_CAT.join("\n"), B_GRANT.join("\n")];
    return blocks.concat(extra || []).join("\n\n") + "\n";
  }
  function swap(lines, from, to) { return lines.map(function (l) { return l.split(from).join(to); }); }
  var EU_C = swap(B_RAW, '"eu-west-1"', '"eu-central-1"');
  var RUNGS = [
    null,
    { id: 1, label: "Add one zone", note: "A new serving zone; nothing else moves.",
      cfg: cfg(B_RAW, ['resource "lake_zone" "serving" {\n  name           = "larkspur-prod-serving"\n  region         = "eu-west-1"\n  retention_days = 90\n  tags           = "team=data"\n}']) },
    { id: 2, label: "Rename, no moved block", note: "raw becomes landing in the code. Same bucket, new address.",
      cfg: cfg(swap(B_RAW, '"lake_zone" "raw"', '"lake_zone" "landing"')).replace("depends_on   = [lake_zone.raw]", "depends_on   = [lake_zone.landing]") },
    { id: 3, label: "Rename with a moved block", note: "The same rename, plus moved { from, to }.",
      cfg: cfg(swap(B_RAW, '"lake_zone" "raw"', '"lake_zone" "landing"'), ["moved {\n  from = lake_zone.raw\n  to   = lake_zone.landing\n}"]).replace("depends_on   = [lake_zone.raw]", "depends_on   = [lake_zone.landing]") },
    { id: 4, label: "Change the region", note: "region is force-new: the zone must be rebuilt.", cfg: cfg(EU_C) },
    { id: 5, label: "Region + prevent_destroy", note: "The same change, with the guard rail on.",
      cfg: cfg(EU_C.concat(["", "  lifecycle {", "    prevent_destroy = true", "  }"])) },
    { id: 6, label: "Region + create_before_destroy", note: "The same change; watch the apply order flip.",
      cfg: cfg(EU_C.concat(["", "  lifecycle {", "    create_before_destroy = true", "  }"])) },
    { id: 7, label: "Tags only", note: "tags update in place; nothing is rebuilt.",
      cfg: cfg(swap(B_RAW, '"team=data"', '"team=data,owner=platform"')) },
    { id: 8, label: "Rename the curated bucket", note: "Force-new on a zone the catalog reads from.",
      cfg: cfg(B_RAW, [], swap(B_CUR, '"larkspur-prod-curated"', '"larkspur-prod-curated-v2"')) },
    { id: 9, label: "Console edit, plain config", note: "Someone edited raw's tags in the console; the plan puts them back.", edits: 1, cfg: cfg(B_RAW) },
    { id: 10, label: "ignore_changes = all", note: "The same edit, hidden from every future plan. Then press Console edit.", anti: true, edits: 1,
      cfg: cfg(B_RAW.concat(["", "  lifecycle {", "    ignore_changes = all", "  }"])) }
  ];
  var CONSOLE_EDITS = [
    { address: "lake_zone.raw", attr: "tags", value: "team=data,temp-access=vendor" },
    { address: "lake_zone.raw", attr: "retention_days", value: 7 }
  ];
  function consoleEdit(state, k) {
    var e = CONSOLE_EDITS[k % CONSOLE_EDITS.length], st = cloneState(state);
    st.forEach(function (r) { if (r.address === e.address) r.attrs[e.attr] = e.value; });
    return st;
  }
  function stateForRung(r) {
    var st = cloneState(BASE_STATE);
    for (var k = 0; k < (r.edits || 0); k++) st = consoleEdit(st, k);
    return st;
  }

  /* ---------- the break button: shuffle block order (seeded) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function splitBlocks(text) {
    var blocks = [], cur = [], depth = 0;
    text.split("\n").forEach(function (l) {
      var s = stripComment(l);
      if (depth === 0 && s === "") return;
      cur.push(l);
      if (/\{$/.test(s)) depth++;
      if (s === "}") { depth--; if (depth === 0) { blocks.push(cur.join("\n")); cur = []; } }
    });
    if (cur.length) blocks.push(cur.join("\n"));
    return blocks;
  }
  function shuffleText(text, seed) {
    var b = splitBlocks(text), rnd = mulberry32(seed);
    for (var i = b.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = b[i]; b[i] = b[j]; b[j] = t; }
    return b.join("\n\n") + "\n";
  }
  function summary(p) {
    return { error: p.error ? p.error.split("\n")[0] : null, add: p.counts ? p.counts.add : 0, change: p.counts ? p.counts.change : 0,
             destroy: p.counts ? p.counts.destroy : 0, replace: p.counts && p.counts.replace || 0, dataDestroyed: p.dataDestroyed || 0,
             drift: p.drift || 0, moved: p.moves ? p.moves.length : 0,
             actions: p.actions ? Object.keys(p.actions).sort(byAddr).filter(function (a) { return p.actions[a] !== "noop"; }).map(function (a) { return p.actions[a] + " " + a; }) : [],
             order: p.order || [] };
  }
  function canon() {
    var out = [];
    for (var n = 1; n < RUNGS.length; n++) {
      var r = RUNGS[n], st = stateForRung(r), s = summary(plan(r.cfg, st));
      var inv = true;
      for (var seed = 1; seed <= 5; seed++) if (JSON.stringify(summary(plan(shuffleText(r.cfg, seed * 7919), st))) !== JSON.stringify(s)) inv = false;
      s.rung = n; s.shuffleInvariant = inv;
      s.driftAfterConsoleEdit = plan(r.cfg, consoleEdit(st, r.edits || 0)).drift || 0;
      out.push(s);
    }
    return out;
  }

  /* ---------- UI ---------- */
  var rootEl, els = {}, ui = { rung: 1, text: "", state: null, edits: 0, shuffles: 0, last: null, note: "" };
  function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

  function graphSvg(p) {
    var addrs = {};
    Object.keys(p.resources || {}).forEach(function (a) { addrs[a] = 1; });
    Object.keys(p.state || {}).forEach(function (a) { addrs[a] = 1; });
    var list = Object.keys(addrs).sort(byAddr), depOf = {};
    list.forEach(function (a) { depOf[a] = p.resources[a] ? configDeps(p.resources[a]) : p.state[a].deps.slice(); });
    var level = {};
    function lv(a, guard) { if (level[a] !== undefined) return level[a]; if (guard > 20) return 0; var m = 0; depOf[a].forEach(function (d) { if (addrs[d]) m = Math.max(m, lv(d, guard + 1) + 1); }); level[a] = m; return m; }
    list.forEach(function (a) { lv(a, 0); });
    var cols = {}, maxRow = 0;
    list.forEach(function (a) { (cols[level[a]] = cols[level[a]] || []).push(a); });
    Object.keys(cols).forEach(function (c) { maxRow = Math.max(maxRow, cols[c].length); });
    var W = 14 + 228 * (Object.keys(cols).length || 1), colW = 228, boxW = 190, boxH = 46, rowH = 64, H = 40 + maxRow * rowH + 34, pos = {};
    Object.keys(cols).forEach(function (c) { cols[c].forEach(function (a, i) { pos[a] = { x: 14 + c * colW, y: 34 + i * rowH }; }); });
    var cls = { create: "is-add", update: "is-upd", delete: "is-del", replace: "is-rep", noop: "" };
    var svg = '<svg viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="Dependency graph: arrows point from a resource to what it needs first">';
    svg += '<defs><marker id="plAr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 1 L9 5 L1 9" fill="none" stroke="#5E5470" stroke-width="1.6"/></marker></defs>';
    svg += '<text class="pl-cap" x="14" y="18">needs first &#8592; ... &#8592; depends on it (columns by depth)</text>';
    list.forEach(function (a) {
      depOf[a].forEach(function (d) {
        if (!pos[d]) return;
        var x1 = pos[a].x, y1 = pos[a].y + boxH / 2, x2 = pos[d].x + boxW, y2 = pos[d].y + boxH / 2;
        svg += '<path class="pl-edge" d="M' + x1 + " " + y1 + " C" + (x1 - 20) + " " + y1 + " " + (x2 + 20) + " " + y2 + " " + (x2 + 4) + " " + y2 + '" marker-end="url(#plAr)"/>';
      });
    });
    list.forEach(function (a) {
      var act = p.actions ? p.actions[a] || "noop" : "noop", P = pos[a];
      var dataB = SCHEMA[(p.resources[a] || p.state[a]).type].dataBearing;
      svg += '<rect class="pl-node ' + (cls[act] || "") + '" x="' + P.x + '" y="' + P.y + '" width="' + boxW + '" height="' + boxH + '" rx="8"/>';
      svg += '<text class="pl-nlab" x="' + (P.x + 10) + '" y="' + (P.y + 19) + '">' + esc(a) + "</text>";
      svg += '<text class="pl-nsub" x="' + (P.x + 10) + '" y="' + (P.y + 36) + '">' + (act === "noop" ? "no change" : act === "delete" ? "destroy" : act) + (dataB ? " · holds data" : "") + "</text>";
    });
    svg += "</svg>";
    return svg;
  }

  function metric(label, val, unit, cls) {
    return '<div class="mb-metric"><span class="mb-mlabel">' + esc(label) + '</span><span class="mb-mvalue' + (cls ? " " + cls : "") + '">' + esc(val) + '</span><span class="mb-munit">' + esc(unit) + "</span></div>";
  }

  function render() {
    var p = plan(ui.text, ui.state), s = summary(p);
    ui.last = s;
    Object.keys(els.btns).forEach(function (k) {
      var on = +k === ui.rung;
      els.btns[k].classList.toggle("is-on", on);
      els.btns[k].querySelector("input").checked = on;
    });
    var v, vc;
    if (p.parseError) { v = "The config does not parse. " + p.error.replace(/^Error: /, ""); vc = "is-bad"; }
    else if (p.error && p.blocked) { v = "Plan stopped: " + p.blocked + " has prevent_destroy. Nothing is applied, nothing is destroyed."; vc = "is-good"; }
    else if (p.error) { v = p.error.split("\n")[0]; vc = "is-bad"; }
    else if (s.dataDestroyed > 0) { v = "Plan: " + s.add + " to add, " + s.change + " to change, " + s.destroy + " to destroy. It looks small, and it deletes " + s.dataDestroyed + " zone" + (s.dataDestroyed === 1 ? "" : "s") + " holding data."; vc = "is-bad"; }
    else if (s.drift > 0) { v = "No changes, says the plan. " + s.drift + " console edit" + (s.drift === 1 ? " is" : "s are") + " still live on the zone, and no future plan will show " + (s.drift === 1 ? "it" : "them") + "."; vc = "is-bad"; }
    else if (!s.actions.length) { v = s.moved ? "No changes: the moved block re-addressed the zone in state, so nothing is rebuilt." : "No changes. Your infrastructure matches the configuration."; vc = "is-good"; }
    else { v = "Plan: " + s.add + " to add, " + s.change + " to change, " + s.destroy + " to destroy. No data-bearing zone is destroyed."; vc = "is-ok"; }
    if (ui.note) { v = ui.note + " " + v; }
    els.verdict.className = "mb-verdict " + vc;
    els.verdict.textContent = v;
    els.metrics.innerHTML =
      metric("To add / change / destroy", p.error ? "0 / 0 / 0" : s.add + " / " + s.change + " / " + s.destroy, p.error ? "plan errored, nothing applied" : (s.replace ? s.replace + " of these are replacements" : "computed from the diff"), "") +
      metric("Data-bearing zones destroyed", String(s.dataDestroyed), "lake_zone holds files; catalog and grant do not", s.dataDestroyed ? "is-bad" : "") +
      metric("Unmanaged drift", String(s.drift), "real values the config no longer sees", s.drift ? "is-bad" : "");
    els.plan.textContent = "$ terraform plan\n\n" + planText(p);
    els.order.innerHTML = p.error ? '<li class="pl-none">Nothing runs: the plan did not pass.</li>' :
      (s.order.length ? s.order.map(function (o) { return "<li>" + esc(o) + "</li>"; }).join("") : '<li class="pl-none">Nothing to apply.</li>');
    els.graph.innerHTML = p.resources ? graphSvg(p) : '<p class="mb-hint">Fix the config to draw the graph.</p>';
    var rows = ui.state.map(function (r) {
      return "<tr><th>" + esc(r.address) + "</th><td>" + Object.keys(r.attrs).sort(byAddr).map(function (k) { return esc(k + " = " + fmt(r.attrs[k])); }).join("<br>") + "</td></tr>";
    }).join("");
    els.state.innerHTML = '<table class="dt-table pl-state"><thead><tr><th>Address</th><th>Real values now (state after refresh)</th></tr></thead><tbody>' + rows + "</tbody></table>";
    els.edits.textContent = ui.edits + " console edit" + (ui.edits === 1 ? "" : "s") + " so far";
  }

  function setRung(n) {
    var r = RUNGS[n];
    if (!r) return null;
    ui.rung = n; ui.text = r.cfg; ui.state = stateForRung(r); ui.edits = r.edits || 0; ui.shuffles = 0; ui.note = "";
    els.text.value = ui.text;
    render();
    return ui.last;
  }

  function buildUI() {
    rootEl.innerHTML = "";
    var panel = document.createElement("div"); panel.className = "mb-presets";
    els.btns = {};
    for (var n = 1; n < RUNGS.length; n++) (function (r) {
      var l = document.createElement("label");
      l.className = "mb-preset" + (r.anti ? " is-anti" : "");
      l.innerHTML = '<input type="radio" name="pl-rung" value="' + r.id + '">' +
        '<span class="mb-pname">' + r.id + " · " + esc(r.label) + (r.anti ? ' <em class="mb-anti">anti-lever</em>' : "") + "</span>" +
        '<span class="mb-pnote">' + esc(r.note) + "</span>";
      l.querySelector("input").addEventListener("change", function () { setRung(r.id); });
      panel.appendChild(l); els.btns[r.id] = l;
    })(RUNGS[n]);
    rootEl.appendChild(panel);

    var bar = document.createElement("div"); bar.className = "pl-bar";
    bar.innerHTML = '<button type="button" class="btn pl-shuffle">Shuffle declaration order <em class="mb-anti">break</em></button>' +
      '<button type="button" class="btn pl-console">Console edit</button><span class="pl-edits"></span>' +
      '<button type="button" class="btn pl-reset">Reset this rung</button>';
    rootEl.appendChild(bar);
    els.edits = bar.querySelector(".pl-edits");
    bar.querySelector(".pl-shuffle").addEventListener("click", function () {
      var before = JSON.stringify(summary(plan(ui.text, ui.state)));
      ui.shuffles++;
      ui.text = shuffleText(ui.text, 7919 * ui.shuffles);
      els.text.value = ui.text;
      var after = JSON.stringify(summary(plan(ui.text, ui.state)));
      ui.note = before === after ? "Blocks shuffled (" + ui.shuffles + "x): plan and apply order are identical to before, because order comes from the graph, not the file." : "Blocks shuffled: the plan CHANGED, which a real planner would never do.";
      render();
    });
    bar.querySelector(".pl-console").addEventListener("click", function () {
      ui.state = consoleEdit(ui.state, ui.edits); ui.edits++; ui.note = "Someone edited lake_zone.raw in the console.";
      render();
    });
    bar.querySelector(".pl-reset").addEventListener("click", function () { setRung(ui.rung); });

    els.verdict = document.createElement("p"); rootEl.appendChild(els.verdict);
    els.metrics = document.createElement("div"); els.metrics.className = "mb-metrics"; rootEl.appendChild(els.metrics);

    var grid = document.createElement("div"); grid.className = "pl-grid";
    var c1 = document.createElement("div"); c1.className = "pl-card";
    c1.innerHTML = '<h4>Desired config (edit it)</h4>';
    els.text = document.createElement("textarea"); els.text.className = "pl-text"; els.text.spellcheck = false; els.text.rows = 22;
    els.text.setAttribute("aria-label", "Desired configuration in HCL-lite");
    var timer = null;
    els.text.addEventListener("input", function () { clearTimeout(timer); timer = setTimeout(function () { ui.text = els.text.value; ui.note = ""; render(); }, 250); });
    c1.appendChild(els.text);
    var c2 = document.createElement("div"); c2.className = "pl-card";
    c2.innerHTML = "<h4>The plan</h4>";
    els.plan = document.createElement("pre"); els.plan.className = "pl-plan"; c2.appendChild(els.plan);
    grid.appendChild(c1); grid.appendChild(c2); rootEl.appendChild(grid);

    var grid2 = document.createElement("div"); grid2.className = "pl-grid";
    var c3 = document.createElement("div"); c3.className = "pl-card";
    c3.innerHTML = "<h4>Apply order (topological sort of the graph)</h4>";
    els.order = document.createElement("ol"); els.order.className = "pl-order"; c3.appendChild(els.order);
    var c4 = document.createElement("div"); c4.className = "pl-card";
    c4.innerHTML = "<h4>Dependency graph</h4>";
    els.graph = document.createElement("div"); els.graph.className = "pl-stage"; c4.appendChild(els.graph);
    grid2.appendChild(c3); rootEl.appendChild(grid2); rootEl.appendChild(c4);

    var c5 = document.createElement("div"); c5.className = "pl-card";
    c5.innerHTML = "<h4>Current state</h4>";
    els.state = document.createElement("div"); els.state.className = "dt-tablewrap"; c5.appendChild(els.state);
    rootEl.appendChild(c5);

    var hint = document.createElement("p"); hint.className = "mb-hint";
    hint.textContent = "A teaching engine that follows Terraform's planning rules for these resource types; real providers add more attributes and more rules. " +
      "Larkspur Freight, its zones and its ids are constructed. lake_zone stands in for a storage bucket: name and region force replacement, tags and retention_days update in place. " +
      "ignore_changes has real uses: an attribute another system manages on purpose, such as tags written by a cost tool. ignore_changes = all on a zone that holds data means the config no longer describes it. " +
      "Where two steps do not depend on each other, real Terraform runs them in parallel (10 at a time by default); this list breaks ties by address.";
    rootEl.appendChild(hint);
  }

  function init() {
    rootEl = document.getElementById("plan-bench");
    if (!rootEl) return;
    buildUI();
    var def = parseInt(rootEl.getAttribute("data-rung") || "1", 10);
    setRung(RUNGS[def] ? def : 1);
    root.TF_BENCH = {
      setRung: setRung,
      consoleEdit: function () { rootEl.querySelector(".pl-console").click(); return ui.last; },
      shuffle: function () { rootEl.querySelector(".pl-shuffle").click(); return ui.last; },
      setConfig: function (t) { ui.text = t; els.text.value = t; ui.note = ""; render(); return ui.last; },
      last: function () { return ui.last; },
      canon: canon
    };
  }

  var api = { SCHEMA: SCHEMA, parse: parse, plan: plan, planText: planText, summary: summary, canon: canon, RUNGS: RUNGS,
              BASE_STATE: BASE_STATE, stateForRung: stateForRung, shuffleText: shuffleText, consoleEdit: consoleEdit };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
  }
})(typeof window !== "undefined" ? window : this);
