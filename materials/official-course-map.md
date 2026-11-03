# Official course map - learn-terraform-with-phoebe

Built 2026-11-03. Single track, 6 sessions x 45 min, difficulty 2 (Core), bucket `deng`.
Audience: data leaders and data engineers. Role paths on the landing: Leader s1, s5, s6; Builder all 6.
Fast-moving product: **re-verify the changelog before delivery** (Terraform 1.17.x, OpenTofu 1.13.x,
provider majors, exam version, HCP Terraform plans).

Evidence tiers: **[S]** read at source on 2026-11-03 (bracketed number = citation in
`research-notes.md` appendix) · **[R]** reported (secondary source; say "reported" on the page) ·
**[CLI]** printed by a real run of Terraform 1.17.1 (darwin_arm64) in a scratch directory; transcripts
in `materials/build-along-runs/`. Anything not listed here may not be stated as fact on a page.

## Constraint reality (Phoebe-approved)

Local only, zero cost, no cloud account. Every build-along uses the `terraform` (or `tofu`) CLI with
`hashicorp/local` (2.9.1), `hashicorp/random` (3.9.1), `hashicorp/null` (3.3.2) and the built-in
`terraform_data`. Cloud provider code appears only in prompt-boxes labelled **shown, not applied**.

**Build-along outputs were really run** with Terraform v1.17.1 (official binary from
releases.hashicorp.com, SHA256 verified against the published SHA256SUMS). OpenTofu was not installed;
pages say commands work the same with `tofu` only where that is the documented drop-in claim [43].
Run-specific values (random ids, hashes, UUIDs, timestamps, user and host) will differ for learners;
pages say "your ids will differ". The lock-contention transcript had user@host replaced by `<user>@<host>`.

## Running case (constructed)

**Larkspur Freight**: a constructed mid-size logistics company building its first data platform as
code. Grep 2026-11-03: no sibling uses the name. Every page that uses it says "constructed".
s1 first config (random_id + local_file) · s2 lake zones raw / curated / serving per env, variables,
for_each · s3 state broken and fixed · s4 `data-zone` module for dev and prod · s5 reading a plan
(the bench) · s6 shipping it.

## Sessions

| # | File | Level | Title (h1, accent word) |
|---|---|---|---|
| 1 | 01-why-infrastructure-as-code.html | green | Why infrastructure as **code** |
| 2 | 02-the-hcl-language.html | green | The **HCL** language |
| 3 | 03-state-is-the-source-of-truth.html | yellow | State is the source of **truth** |
| 4 | 04-modules-and-versions.html | orange | **Modules** and versions |
| 5 | 05-read-a-plan-like-a-reviewer.html | orange | Read a **plan** like a reviewer (THE BENCH, `#bench`) |
| 6 | 06-plan-on-pr-apply-on-merge.html | orange | Plan on the PR, apply on **merge** |

Title collisions checked 2026-11-03 against every `learn-*/courses/*.html` h1: "Ship it", "Shipping
safely" and "Security + production: ship it safely" exist, so the brief's "Ship it safely" became
"Plan on the PR, apply on merge" (file renamed to match). "State is the source of truth" is close to
"The sensor is the source of truth until it drifts" (IoT) but not identical; kept.

### Session 1 - Why infrastructure as code (Leader + Builder)
Covers exam 1a, 1b, 1c, 2b, 3a, 3b, 3d, 3e, 3f.
- Click-ops vs declarative IaC; desired state vs actual state; idempotence (second plan = No changes).
- Providers and resources; `required_providers` with `~>`.
- Lifecycle init -> plan -> apply -> destroy.
- Build-along [CLI s1.log]: `terraform init` installs hashicorp/local v2.9.1 and hashicorp/random v3.9.1
  and creates `.terraform.lock.hcl`; `plan` = "Plan: 2 to add, 0 to change, 0 to destroy."; apply creates
  random_id first then local_file (the file references the id); second plan "No changes. Your
  infrastructure matches the configuration."; delete the file by hand -> plan "1 to add" (actual drifted
  from desired); destroy removes local_file before random_id. `terraform graph` [CLI s1graph.log] prints
  one edge `"local_file.readme" -> "random_id.platform"`.

### Session 2 - The HCL language (Builder)
Covers exam 2c (partly), 4a, 4b, 4c, 4d, 4e, 4g, 4h (sensitive part), 3c, 3g.
- Blocks, arguments, types (string, number, bool, list, map, object, set); variables with validation and
  `sensitive`; outputs; locals; expressions and interpolation; `for` expressions; data sources.
- count vs for_each [S 31]: count for "nearly identical instances"; for_each when instances need distinct
  values. [CLI s2count.log] removing "curated" from a 3-item list: count plan = index [1] updated in
  place curated -> serving and index [2] destroyed ("Plan: 0 to add, 1 to change, 2 to destroy." for
  both resources together; for_each alone destroys only ["curated"]).
- Build-along [CLI s2.log]: `validate` = "Success! The configuration is valid."; `-var env=staging` fails
  validation ("env must be dev or prod."); apply creates 3 zones with for_each and reads a data source
  (`<= read (data resources)` symbol appears); outputs print `warehouse_password = <sensitive>`;
  switching to `env=prod` shows `must be replaced` with `# forces replacement` on filename and content,
  "Plan: 3 to add, 0 to change, 3 to destroy.". `sensitive` value is still in the state file
  (`grep -c` = 1) [S 27] - sets up session 3.

### Session 3 - State is the source of truth (Builder)
Covers exam 2d, 6a, 6b, 6c, 6d, 7a, 7b, 4h (state part).
- What state holds; default `terraform.tfstate` + `.backup`; "Do not directly edit this file." [S 24];
  use `terraform state` commands instead [S 23]; backups of state modification cannot be disabled [S 23].
- Secrets in state: "Terraform stores your state in a plaintext file, which includes any secret values" [S 27].
- Backends: local backend stores and locks state on local disk [S 15]; not all backends lock [S 14];
  S3 locking opt-in via `use_lockfile` [S 16], native S3 locking added 1.10.0, GA in 1.11.0, DynamoDB
  locking deprecated (not yet removed) [S 16-18]; force-unlock warning [S 14].
- Drift and `plan -refresh-only` (since v0.15.4) [S 5]. Note the provider decides how drift shows:
  `local_file` reports an edited file as "has been deleted" [CLI s3a.log].
- `moved` block (1.1.0) [S 8, 9]; `import` block (1.5.0) and `-generate-config-out` (experimental) [S 10, 11, 5];
  `removed` block (1.7.0) [S 12, 13]; `state list/show/mv/rm` [S 23, 25].
- Build-alongs [CLI s3a/s3b/s3c/s3d.log]: state list + show; console edit + refresh-only; rename without
  moved = "Plan: 3 to add, 0 to change, 3 to destroy."; with moved = "has moved to" and "Plan: 0 to add,
  0 to change, 0 to destroy."; state mv + state rm -> next plan "1 to add"; lost state -> plan "1 to add"
  for a resource that still exists; import block -> "Plan: 1 to import, 0 to add, 0 to change, 0 to
  destroy." then "Apply complete! Resources: 1 imported, 0 added, 0 changed, 0 destroyed."; second plan
  during a running apply -> "Error: Error acquiring the state lock".

### Session 4 - Modules and versions (Builder)
Covers exam 2a, 5a, 5b, 5c, 5d, 2c.
- Module structure (variables.tf / main.tf / outputs.tf / README), `source`, registry sources and
  `version` (registry modules only), variable scope inside modules, composition over giant modules.
- Version constraints `=`, `!=`, `>`, `>=`, `<`, `<=`, `~>` and the `~>` rule [S 21].
- `.terraform.lock.hcl` records selected provider versions and checksums, providers only, commit it [S 19].
- Build-along [CLI s4.log]: `init` = "Initializing modules..." + constraint union
  `">= 2.4.0, ~> 2.5, < 3.0.0"` -> v2.9.1; `terraform providers` tree; apply "Resources: 6 added";
  state addresses `module.dev_zone["raw"].local_file.marker`. Impossible constraint `~> 3.0`
  [CLI s4bad.log] -> "no available releases match the given constraints ~> 3.0".
- Shown, not applied: the same module wired to `aws_s3_bucket` (provider major 6; `bucket` forces new
  resource; `region` argument added to most resources in 6.0.0) [S 60, 64, 65], `google_storage_bucket`
  (major 8; `name` and `location` ForceNew in schema) [S 61, 66, 67], `snowflake_database`
  (`snowflakedb/snowflake` major 2; moved from Snowflake-Labs, "03-04-2025" date ambiguous, so say
  "in 2025") [S 62, 68, 69], `databricks_catalog` (major 1; `storage_root` change forces a new
  resource) [S 63, 70].

### Session 5 - Read a plan like a reviewer (Leader + Builder, THE BENCH)
Covers exam 3d, 4f, 8b (policy concepts).
- Symbols: `+` create, `~` update in-place, `-/+` destroy then create replacement, `+/-` create
  replacement then destroy, `-` destroy, `<=` read data source [S 5; `+/-` and `<=` legend text read in
  the 1.17.1 binary and printed in CLI runs s2.log, s5b.log]; `# forces replacement` [S 5, CLI s2.log];
  summary line "Plan: X to add, Y to change, Z to destroy." [S 5].
- lifecycle: create_before_destroy, prevent_destroy ("rejects plans that would destroy"), ignore_changes
  incl. `all`, replace_triggered_by (1.2.0) [S 6, 7]. Caveat: prevent_destroy does not stop a destroy if
  the resource block is removed [S 6].
- Dependency graph: implicit references vs `depends_on` "as a last resort" [S 33]; `terraform graph`
  emits DOT [S 32]; parallelism defaults to 10 [S 34].
- Policy as code concepts: HCP Terraform supports Sentinel and OPA [S 71]. Cost and blast radius,
  least privilege for the Terraform runner (seam with data-access-control: runner identity only).
- Real CLI runs [CLI s5a/s5b/s5c.log]: `-/+` replacement on a region change via `triggers_replace`;
  prevent_destroy -> "Error: Instance cannot be destroyed"; create_before_destroy -> `+/-` symbol and
  apply log "Creating..." before "(deposed object ...): Destroying..."; tags only -> `~ update in-place`,
  "Plan: 0 to add, 1 to change, 0 to destroy.".

### Session 6 - Plan on the PR, apply on merge (Leader + Builder)
Covers exam 3g, 3c, 3d, 8a, 8b, 8c, 8d (concepts), 7c (TF_LOG mention).
- Workspaces: every directory starts with `default`; workspaces share a backend and "are not a suitable
  tool for system decomposition"; HashiCorp recommends reusable modules + separate root configs [S 28].
- Plan on PR, apply on merge in GitHub Actions: `hashicorp/setup-terraform` v4, `opentofu/setup-opentofu`
  v2 [S 72, 73]. Workflow YAML is shown, not run. Saved plan files (`plan -out`, `apply <file>`).
- HCP Terraform: renamed from Terraform Cloud effective 2024-04-22 [S 54]; Free tier up to 500 managed
  resources (2023-05-16) [S 55]; legacy Free plan end of life 2026-03-31 [S 56]; current paid prices
  not verified (do not quote).
- Licence: BSL 1.1 announced 2023-08-10 [S 37]; first BSL version 1.6.0, last MPL release 1.5.7 [S 38, 39];
  Additional Use Grant forbids hosted or embedded offerings that compete with IBM's paid versions; each
  version converts to MPL 2.0 four years after publication [S 38]. HashiCorp says end users can keep
  copying, modifying and redistributing [S 37]. Licence FAQ answers could not be read: do not quote it.
- OpenTofu: OpenTF manifesto [S 41]; formed by the Linux Foundation 2023-09-20 [S 42]; GA 1.6.0 on
  2024-01-10 as a drop-in replacement [S 43]; MPL 2.0 [S 44]; CNCF Sandbox since 2025-04-23 [S 45];
  current v1.13.2 [S 47]; state encryption 1.7.0 [S 48, 49]; early variable evaluation 1.8.0 [S 50];
  provider for_each and `-exclude` 1.9.0 [S 51]. "CNCF needed a licence exception" is [R] only.
- IBM: acquisition announced 2024-04-24 ($35 per share) [S 52], completed 2025-02-27 [S 53]; the
  Terraform LICENSE now names IBM as licensor [S 38].
- Build-along [CLI s6.log, s6b.log]: `fmt -check -diff` exits 3 on unformatted code; `fmt` fixes it;
  `validate`; `workspace new dev/prod`, `workspace list`; `plan -out=dev.tfplan` + `apply dev.tfplan`;
  a saved plan applied after someone else changed state -> "Error: Saved plan is stale".
- Associate (004) objective map (below).

## Terraform Associate (004) objective map

004 is the current exam: tests Terraform 1.12, one hour, multiple choice, online proctored,
$70.50 USD plus taxes, credential valid 2 years [S 1, 4]. 003 -> 004 switch in January 2026 is [R] only
(dates no longer on the live page). Question count NOT verified: do not quote one.

| Objective | Session(s) | Taught? |
|---|---|---|
| 1a Explain what IaC is | 1 | yes |
| 1b Advantages of IaC patterns | 1 | yes |
| 1c Multi-cloud, hybrid, service-agnostic workflows | 1, 4 (shown) | yes |
| 2a Install and version providers | 1, 4 | yes |
| 2b How Terraform uses providers | 1 | yes |
| 2c Configuration with multiple providers | 1, 4 | partly (local + random; aliases not taught) |
| 2d How Terraform uses and manages state | 3 | yes |
| 3a The Terraform workflow | 1, 6 | yes |
| 3b init | 1 | yes |
| 3c validate | 2, 6 | yes |
| 3d Generate and review a plan | 1, 5 | yes |
| 3e apply | 1 | yes |
| 3f destroy | 1 | yes |
| 3g fmt | 6 | yes |
| 4a resource vs data blocks | 2 | yes |
| 4b Attributes and cross-resource references | 2, 5 | yes |
| 4c Variables and outputs | 2 | yes |
| 4d Complex types | 2 | yes |
| 4e Expressions and functions | 2 | yes |
| 4f Resource dependencies | 5 | yes |
| 4g Custom conditions | 2 | partly (variable validation; pre/postconditions named only) |
| 4h Sensitive data, Vault | 2, 3 | partly (sensitive + state; Vault named only) |
| 5a How modules are sourced | 4 | yes |
| 5b Variable scope in modules | 4 | yes |
| 5c Use modules | 4 | yes |
| 5d Module versions | 4 | yes |
| 6a Local backend | 3 | yes |
| 6b State locking | 3 | yes |
| 6c Remote state via backend block | 3 | yes (S3 shown, not applied) |
| 6d Drift and state | 3 | yes |
| 7a Import | 3 | yes |
| 7b Inspect state with the CLI | 3 | yes |
| 7c Verbose logging | 6 | mention only (TF_LOG) |
| 8a Use HCP Terraform | 6 | concept only (no account) |
| 8b HCP collaboration and governance | 5, 6 | concept only |
| 8c HCP workspaces and projects | 6 | concept only |
| 8d HCP integration | 6 | concept only |

**Not taught hands-on:** 8a-8d (needs an HCP account; zero-cost constraint), provider aliases, Vault.

## Bench: the plan simulator (session 5, `assets/plan-live.js`)

A real computed engine (no dataset): HCL-lite parser, moved blocks, per-type schema diff, ignore_changes,
prevent_destroy, topological apply order. Python reference `materials/plan-ref.py` re-implements it;
`materials/plan-node.js` prints the node canon; `materials/compare-ladder.py` compares by value and
self-tests on two planted faults. Run 2026-11-03: **10 rungs compared, 0 mismatches** (self-test caught 2/2).
Shuffle invariance (5 seeded shuffles per rung): true on all 10 rungs in both engines.

Schema (teaching): `lake_zone` (holds data; name and region force-new; tags and retention_days in place),
`catalog` (name and storage_root force-new), `access_grant` (target force-new, role in place).
Starting state: lake_zone.raw, lake_zone.curated, catalog.main (storage_root = curated name, depends_on raw),
access_grant.analysts (target = catalog name). Ids lz-7f24, lz-1b71, cat-04d2, ag-9e11 are constructed.

### Ladder canon (node = python)

| Rung | Change | add / change / destroy | Replaced | Data destroyed | Drift | Apply order |
|---|---|---|---|---|---|---|
| 1 | add lake_zone.serving | 1 / 0 / 0 | 0 | 0 | 0 | create lake_zone.serving |
| 2 | rename raw -> landing, no moved | 1 / 0 / 1 | 0 | 1 | 0 | create lake_zone.landing; destroy lake_zone.raw |
| 3 | same rename + moved block | 0 / 0 / 0 (No changes, 1 moved) | 0 | 0 | 0 | nothing |
| 4 | raw region eu-west-1 -> eu-central-1 | 1 / 0 / 1 | 1 | 1 | 0 | destroy lake_zone.raw (old object); create lake_zone.raw (replacement) |
| 5 | rung 4 + prevent_destroy | Error: Instance cannot be destroyed (counters 0 / 0 / 0) | 0 | 0 | 0 | nothing runs |
| 6 | rung 4 + create_before_destroy | 1 / 0 / 1, symbol `+/-` | 1 | 1 | 0 | create lake_zone.raw (replacement); destroy lake_zone.raw (deposed object) |
| 7 | raw tags only | 0 / 1 / 0 | 0 | 0 | 0 | update lake_zone.raw |
| 8 | curated name -> larkspur-prod-curated-v2 | 2 / 0 / 2 | 2 (curated + catalog) | 1 | 0 | destroy catalog.main (old object); destroy lake_zone.curated (old object); create lake_zone.curated (replacement); create catalog.main (replacement) |
| 9 | 1 console edit on raw (tags gain temp-access=vendor), plain config | 0 / 1 / 0 | 0 | 0 | 0 | update lake_zone.raw |
| 10 | same edit, `ignore_changes = all` (ANTI-LEVER) | 0 / 0 / 0, "No changes" | 0 | 0 | 1 (2 after one more Console edit: retention_days 30 -> 7) | nothing |

Break button "Shuffle declaration order": plan and apply order unchanged on every rung (proved in canon).
"Console edit" button: each click edits raw in state (tags, then retention_days, cycling); under rung 10
unmanaged drift rises 1 -> 2 after one click (canon field driftAfterConsoleEdit, both engines); on rungs 1-9 one
click leaves drift at 0 and adds an in-place update to the plan. Pages may quote ONLY these numbers for the bench.

Honesty rail on the widget: "A teaching engine that follows Terraform's planning rules for these resource
types; real providers add more attributes and more rules." Ties in the apply order break by address;
real Terraform runs independent steps in parallel (10 by default) [S 34].

## Seams (teach only our side)

| Sibling | They own | We own |
|---|---|---|
| learn-aws-with-phoebe | AWS services themselves | expressing any service as code |
| learn-dataops-with-phoebe | CI/CD for data pipelines generally (its b7 touches IaC in 4 min) | the plan/apply gate for infrastructure |
| learn-data-access-control-with-phoebe | IAM / access design | least privilege for the Terraform runner only |
| learn-databricks-with-phoebe, learn-data-warehouse-with-phoebe | the platforms | provisioning them as code |
| learn-data-orchestration-with-phoebe | scheduling pipelines | not covered |

## Not covered (honest list)

CDKTF, Pulumi, Crossplane, writing Sentinel or OPA policies in depth, writing a provider, Terragrunt
beyond one mention, HCP Terraform hands-on (no account), provider aliases, Vault, ephemeral values and
write-only arguments (one line in s3 only: 1.10.0 and 1.11.0 [S 17, 18]), Terraform `query` and Actions
(1.14.0) [S 36], stacks, testing with `terraform test`.

## Commonly misstated claims (teach the correct version)

1. OpenTofu is LF-formed AND a CNCF Sandbox project (both true) [S 42, 45].
2. `sensitive = true` does not keep secrets out of state [S 27].
3. The lock file pins providers only, not modules [S 19].
4. CLI workspaces are not strong environment separation [S 28].
5. BSL starts at 1.6.0, not 1.5 [S 38, 39].
6. S3 backend no longer needs DynamoDB for locking (use_lockfile GA 1.11) [S 16, 18].
7. Associate 004, not 003, is current [S 1].
8. Terraform Cloud is HCP Terraform since 2024-04-22 [S 54].
9. Snowflake provider source is `snowflakedb/snowflake` [S 68].
10. Not every bucket attribute forces replacement [S 64, 67].

## Palette

Phoebe named it: Terraform brand violet. Primary `#7B42BC`, deep `#4A2478`, mid `#62329A`, soft `#D9C6F0`,
50-tint `#F4EEFB`, ink `#221A2E`, muted `#5E5470`, faint `#D6CEE2`, hairline `#ECE7F3`, warm contrast deep
teal `#0F766E` (ink `#0B4F4A`, tint `#E3F3F1`), paper `#FDFCFF`. Contrast (WCAG): white on primary 6.27,
white on teal 5.47, primary on 50-tint 5.52, muted on paper 6.90, teal on teal-tint 4.78, muted on hairline 5.81.
Nearest sibling `--indigo` (CIEDE2000, 179 siblings): learn-obsidian #6741C4 = 4.06, learn-gitlab #6B4FBB = 4.62,
learn-unsupervised #7E22CE = 5.53. Below the 10 target; kept because Phoebe named the hue (retheme-recipe rule).

## Citation appendix

The full numbered list (1-73) with URLs, read 2026-11-03, is the appendix of `research-notes.md` in this
folder. Pages cite by source name in their coverage rows, not by number.
