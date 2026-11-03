# Agent brief - shared by every fan-out page of learn-terraform-with-phoebe

You are writing ONE static HTML session page. No servers, no npm. **If your target file already
exists on disk, do not write it; report that and stop.** Write the file, return its path and one
line of coverage. No HTML in your reply.

## Read first, in this order

1. The template page. Copy its structure, classes, SVG grammar and quiz markup EXACTLY, including
   4 options per quiz question:
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-terraform-with-phoebe/courses/01-why-infrastructure-as-code.html`
   For rhythm only (do not copy its bench): `.../courses/05-read-a-plan-like-a-reviewer.html`
2. The source map: every verified fact, its evidence tier, per-session coverage, the seams, the
   exam objective map. Use ONLY its facts; never invent a statistic, date or version; if a fact is
   missing, leave it out or teach the uncertainty.
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-terraform-with-phoebe/materials/official-course-map.md`
   Deeper detail with quotes: `.../materials/research-notes.md` (facts marked "could not verify" may not
   be stated; "reported" facts must say "reported" on the page).
3. The REAL CLI transcripts for your session in
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-terraform-with-phoebe/materials/build-along-runs/`
   (`*.log` files plus the `.tf` files in the sN folders). **Every command output you print must be
   copied from these logs**, character for character, trimmed only by replacing whole lines with
   `...` and adding "(trimmed)" to the prompt-box label. Never invent or "tidy" an output. If a step
   you want has no log, describe it in prose without printing output. Say once per page that ids,
   hashes and times will differ on the learner's machine.
4. The stylesheet `:root` block for the palette tokens:
   `/Users/phoebe.fu/Documents/Claude_Work/github_repo/learn-terraform-with-phoebe/assets/style.css`

## Page skeleton (keep every component)

toolbar (crumb EXACTLY `<a href="../index.html">learn-terraform-with-phoebe</a> / Session N of 6`,
#toggle-all, #zoom-toggle) · masthead (eyebrow "Learn Terraform with Phoebe · Session N of 6", h1 with
one `<span class="accent">`, .sub, .chip-row with the level chip given in your outline, two
`.chip.audience`, `.chip.time` "45 min", .agenda a1-a4) · main.wrap · section#intro (Part 0: kicker,
.lede that says Larkspur Freight is constructed, .legend pills as in the template, .callout.win
"★ What you walk out with tonight.") · 3 Parts, each `section.section#part-N` with section-kicker
(klabel "Part N · covers ...", h2, `.tag.concept "N min live"`), a `.lede`, ONE figure, `details.card`
accordions (summary: `.mode.live` or `.mode.self`, title, `.mini`, `.caret ▶`), at least one
`.callout.example` with `span.ex-pill` "Real world" on the page · section#demo-1 Build-along (kicker
`.tag.demo "★ 22 min · everyone builds"`, .lede, ONE figure, `.steps > .step`, each with a
`.prompt-box.good` carrying a `span.label`, code boxes BELOW the step's `p`) · section#exercise
Homework (ol, 4 items) · section#quiz (3 x `.quiz-q data-answer="0-based"`, `p.qtext`, 4 x
`button.qopt` "A · ..." to "D · ...", `p.qwhy`; one `p.quiz-score` after the last; vary which letter
is correct) · section#official, h2 EXACTLY "What this session teaches, and where it came from",
`.covered > .covered-row` (pill solid ✓ / light ◐ + name + note; always include a ◐ row for
"Larkspur Freight ..." constructed), then the `.mono` line EXACTLY "Every fact on this page, and its
verification tier, is recorded in the course's source map." · section.cheat#cheatsheet (h3
"Session N cheat sheet <span>· pin this</span>", .grid-2 of six .cheat-item) · `.callout.next` with
`.nx-pill` "Next session" · footer.pagefoot · `<script src="../assets/app.js?v=1"></script>`.

Head: the template's social meta block with this page's own title/description/url;
`<title>Session N · <Title> - learn terraform with phoebe</title>`;
`<link rel="stylesheet" href="../assets/style.css?v=1">`. Nothing else external.

First `details.card` in the FIRST Part is `open`; no other. Sentence case headings. Warm
practitioner voice, concrete, never dry. Inside prompt-boxes escape `&` `<` `>` (`~>` is `~&gt;`,
`<<-EOT` is `&lt;&lt;-EOT`, `->` is `-&gt;`). 450 to 650 lines is guidance about depth, never a
target: never collapse whitespace, dissolve a list into a paragraph, or drop a component to fit.

## Hard rules (a violation is rework)

- NEVER an em dash or en dash, anywhere (prose, code, aria-labels, comments). Hyphen only. The
  box-drawing characters in Terraform's own output (`├`, `│`, `─`, `└`) are fine inside prompt-boxes.
- No meta text: never "this course", "in this course", "the course teaches", "banned here". State
  the professional norm directly with its reason. "session 5" cross-references are fine.
- Attribution "by Phoebe Fu". Never "built with" a tool.
- Every number comes from the map or a run log, or is labelled constructed.
- Contested or missing evidence: teach the disagreement; never resolve what the sources have not.
- NEVER "lottery" or "lotteries".
- Default to the English word. No Chinese terms.
- Titles, widget ids and class names must not collide with siblings. Do not use these headings:
  "Ship it", "Shipping safely", "Infrastructure - the plumbing everything else stands on",
  "Versions and superseded policies". SVG class/id prefix per figure: `w<session><letter>`, e.g.
  `w2a`, `w2b`, `w2c`, `w2d` (session 1 used `w1a`-`w1d`, session 5 `w5a`-`w5e`).
- **Local only, zero cost:** every build-along uses terraform (or tofu) with hashicorp/local,
  hashicorp/random, hashicorp/null or the built-in terraform_data. Any cloud provider code (AWS,
  Google, Snowflake, Databricks, S3 backend, GitHub Actions YAML) goes in a prompt-box whose label
  contains "shown, not applied" (or "shown, not run" for YAML), and uses only argument names the map
  or research notes confirm.
- Say "works the same with tofu" at most once per page; do not claim tofu output.
- Do not restate session 5's bench numbers except as given in the map's ladder canon table.

## Figure grammar (hand-drawn, every figure)

Palette, ONLY these hexes (no invented greys): `#7B42BC` primary · `#4A2478` deep · `#62329A` mid ·
`#D9C6F0` soft · `#F4EEFB` 50-tint · `#221A2E` ink · `#5E5470` muted · `#D6CEE2` faint · `#ECE7F3`
hairline · `#0F766E` teal contrast · `#0B4F4A` teal ink · `#E3F3F1` teal tint · `#FFFFFF` · universal
reds `#991B1B` `#FEF2F2` `#FCA5A5` only for a wrong-way or destroy panel.

- `<figure class="zoomable">` > `<svg viewBox="0 0 880 H" xmlns="http://www.w3.org/2000/svg" role="img"
  aria-label="the data, not the shape">` > `<defs>` + `<style>` + content, then
  `<figcaption>🔍 Click to zoom - takeaway</figcaption>`. Grow H, never W.
- Copy the template's defs exactly, with your prefix: wobble filter `id="PSk"`
  (`feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="<int>"` +
  `feDisplacementMap scale="2.4" xChannelSelector="R" yChannelSelector="G"`, `x="-3%" y="-3%"
  width="106%" height="106%"`), a hachure pattern `id="PHc"` (7x7 userSpaceOnUse, rotate(-38), one
  `#7B42BC` line, opacity .5), open arrowheads `id="PAr"` (ink) and, if needed, `id="PAt"` (teal).
  ALL shapes sit inside ONE `<g filter="url(#PSk)" fill="none" stroke="#221A2E" stroke-width="2"
  stroke-linecap="round" stroke-linejoin="round">`; rects carry a tiny rotation (-4 to 4 degrees for
  hand-placed items, under 1 for panels). Fills: white, `#F4EEFB`, the hachure for "the data", and teal
  (`#E3F3F1` fill, `#0F766E` stroke) ONLY for the one thing the figure is about; reds for destroy.
  Text classes as in the template: `.PH` 800 12px ink heading · `.PL` 600 12px ink label · `.PS` 400
  11px `#5E5470` · `.PB` 800 11px `#0B4F4A` · `.PR` 800 11px `#991B1B` · `.PV` 800 16-18px `#4A2478` value ·
  `.PA` 700 11px `#4A2478` caption · `.PN` 400 12px `#5E5470` note.
- ALL `<text>` OUTSIDE the filtered group, sans stack, never below 10.5px.
- Fit: max chars ≈ (box width - 20) / 7 at 12px, 6.4px/char at 11px; full-width note under 110 chars;
  40px between neighbouring point labels; bottom note 22px below the last row, H clears it by 8px.
  **No path, arrow or curve may cross a label** (the gate scans it): route curves around text, put
  edge labels beside the line, never on it. When in doubt, shorten.
- Floor: one figure per Part plus one in the build-along. Draw the MECHANISM (what the state file binds
  to what, which address moves where, which version a constraint admits), never a metaphor literally,
  never decoration.

## Voice and honesty

Every Part gets a real-world story; with no sourced case, write a familiar pattern without numbers,
as the template does. Constructed: Larkspur Freight (mid-size logistics company, constructed), Priya
(its data lead). Say "constructed" in Part 0. No invented percentages, no invented incidents with
company names. OpenTofu and licence facts only as the map states them.

## Cross-links (absolute URLs)

- AWS services: https://phoebefu6.github.io/learn-aws-with-phoebe/
- DataOps (CI/CD for pipelines): https://phoebefu6.github.io/learn-dataops-with-phoebe/
- Data Access Control (IAM design): https://phoebefu6.github.io/learn-data-access-control-with-phoebe/
- Databricks: https://phoebefu6.github.io/learn-databricks-with-phoebe/
- Data Warehouse: https://phoebefu6.github.io/learn-data-warehouse-with-phoebe/
- Hub: https://phoebefu6.github.io/learn-with-phoebe/

## Footer chain and session titles

Footer left: `Session N of 6 · learn-terraform-with-phoebe · by Phoebe Fu &nbsp;·&nbsp; 📚 <a href="https://phoebefu6.github.io/learn-with-phoebe/">Learn with Phoebe ↗</a>`
Footer right: `<a href="PREV.html">← Prev: PREV TITLE</a> &nbsp;·&nbsp; <a href="NEXT.html">Next: NEXT TITLE →</a>`

| N | File | h1 (accent word in caps) |
|---|---|---|
| 1 | 01-why-infrastructure-as-code.html | Why infrastructure as CODE |
| 2 | 02-the-hcl-language.html | The HCL language |
| 3 | 03-state-is-the-source-of-truth.html | State is the source of TRUTH |
| 4 | 04-modules-and-versions.html | MODULES and versions |
| 5 | 05-read-a-plan-like-a-reviewer.html | Read a PLAN like a reviewer |
| 6 | 06-plan-on-pr-apply-on-merge.html | Plan on the PR, apply on MERGE |

Footer titles are the h1 text in sentence case without the accent span.
