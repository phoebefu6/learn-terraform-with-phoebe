# Research notes - Learn Terraform with Phoebe

Phase 2 source research. Read on 2026-11-03 unless noted.
Tiers: **read-at-source** = page fetched and read this session; **reported** = secondary source or search snippet only; **could not verify** = no source found.
Citation numbers [n] point to the appendix.

---

## 1. HashiCorp Terraform Associate exam

| Claim | URL | Quote | Tier |
|---|---|---|---|
| Current exam is **Terraform Associate (004)** | https://developer.hashicorp.com/certifications/terraform-associate [1] | "Terraform Associate (004)" | read-at-source |
| 004 tests Terraform **1.12** | [1] | "Terraform 1.12" (product version tested) | read-at-source |
| Format: online proctored, multiple choice, one hour | [1] | "Prove your foundational Terraform knowledge and skills in an hour-long multiple-choice exam." | read-at-source |
| Price | [1] | "$70.50 USD, plus locally applicable taxes and fees. Free retake not included." | read-at-source |
| Language English; credential valid 2 years | [1] | "English" / Credential Expiration "2 years" | read-at-source |
| 003 to 004 switch: last day to take 003 was 2026-01-07, first day for 004 was 2026-01-08 (last day to schedule 003: 2026-01-05) | https://developer.hashicorp.com/certifications/infrastructure-automation [2] | Search snippet of the official page; the live page no longer shows the dates (now lists one exam, "Product version tested: Terraform 1.12") | reported |
| Number of questions (57 is commonly cited) | https://computingforgeeks.com/best-terraform-associate-books/ | Not on the official page | could not verify |

**Objective list (Exam Content List - Terraform Associate 004)** [3] https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-review-004 - read-at-source.

1. Infrastructure as Code (IaC) with Terraform
   - 1a Explain what IaC is
   - 1b Describe the advantages of IaC patterns
   - 1c Explain how Terraform manages multi-cloud, hybrid cloud, and service-agnostic workflows
2. Terraform fundamentals
   - 2a Install and version Terraform providers
   - 2b Describe how Terraform uses providers
   - 2c Write Terraform configuration using multiple providers
   - 2d Explain how Terraform uses and manages state
3. Core Terraform workflow
   - 3a Describe the Terraform workflow
   - 3b Initialize a Terraform working directory
   - 3c Validate a Terraform configuration
   - 3d Generate and review an execution plan for Terraform
   - 3e Apply changes to infrastructure with Terraform
   - 3f Destroy Terraform-managed infrastructure
   - 3g Apply formatting and style adjustments to a configuration
4. Terraform configuration
   - 4a Use and differentiate `resource` and `data` blocks
   - 4b Refer to resource attributes and create cross-resource references
   - 4c Use variables and outputs
   - 4d Understand and use complex types
   - 4e Write dynamic configuration using expressions and functions
   - 4f Define resource dependencies in configuration
   - 4g Validate configuration using custom conditions
   - 4h Understand best practices for managing sensitive data, including secrets management with Vault
5. Terraform modules
   - 5a Explain how Terraform sources modules
   - 5b Describe variable scope within modules
   - 5c Use modules in configuration
   - 5d Manage module versions
6. Terraform state management
   - 6a Describe the local backend
   - 6b Describe state locking
   - 6c Configure remote state using the backend block
   - 6d Manage resource drift and Terraform state
7. Maintain infrastructure with Terraform
   - 7a Import existing infrastructure into your Terraform workspace
   - 7b Use the CLI to inspect state
   - 7c Describe when and how to use verbose logging
8. HCP Terraform
   - 8a Use HCP Terraform to create infrastructure
   - 8b Describe HCP Terraform collaboration and governance features
   - 8c Describe how to organize and use HCP Terraform workspaces and projects
   - 8d Configure and use HCP Terraform integration

Study guide [4] confirms: "This exam tests on Terraform 1.12." and "Includes HCP Terraform content" (read-at-source).

---

## 2. Terraform language and CLI docs

### 2a. Plan output symbols

| Claim | URL | Quote | Tier |
|---|---|---|---|
| `+` create, `-` destroy, `~` update in-place, `-/+` replace (destroy then create) | https://developer.hashicorp.com/terraform/cli/commands/plan [5] | `-/+`: "Terraform will destroy this resource and then recreate it." | read-at-source |
| Full legend incl. `+/-` and `<=` | local binary `terraform` v1.17.1 (darwin_arm64), `strings` output | "[cyan]<=[reset] read (data resources)"; "create replacement and then destroy"; "destroy and then create replacement"; "[yellow]~[reset] update in-place" | read-at-source (binary strings, not a web page) |
| `+/-` appears when `create_before_destroy` is set | https://github.com/hashicorp/terraform/issues/14379 | Maintainer: legend defined in plan output, not docs | reported |
| Summary line and `# forces replacement` | [5] | example ends "Plan: 2 to add, 1 to change, 2 to destroy."; annotation "# forces replacement" on an `ami` change | read-at-source |

### 2b. lifecycle meta-argument [6] https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle

| Argument | Quote | Tier |
|---|---|---|
| create_before_destroy | "Use the create_before_destroy rule to instruct Terraform to create a replacement resource" (before destroying the old one) | read-at-source |
| prevent_destroy | "When `prevent_destroy` is set to `true`, Terraform rejects plans that would destroy the infrastructure object" | read-at-source |
| prevent_destroy caveat | removing the resource block can still destroy it (see also resource docs: "This rule doesn't prevent Terraform from destroying the resource if you remove the resource configuration.") | read-at-source |
| ignore_changes `all` | "you can use the `all` keyword to instruct Terraform to ignore all attributes." | read-at-source |
| replace_triggered_by | "Terraform replaces the resource when any of the referenced resources or specified attributes change." | read-at-source |
| replace_triggered_by added in **1.2.0** (2022-05-18) | [7] CHANGELOG v1.2: "`replace_triggered_by` is a new `lifecycle` argument for managed resources" | read-at-source |
| precondition/postcondition also 1.2.0 | [7] "`precondition` and `postcondition` check blocks for resources, data sources, and module output values" | read-at-source |

### 2c. moved block
- Docs [8] https://developer.hashicorp.com/terraform/language/moved : "Use this block to programmatically change the address of a resource." / "Terraform does not destroy the resource during the Terraform run." - read-at-source.
- Introduced **1.1.0 (2021-12-08)** [9]: "`moved` blocks for refactoring within modules: Module authors can now record in module source code" - read-at-source.

### 2d. import block
- Docs [10] https://developer.hashicorp.com/terraform/language/import : "requires an `import` block that specifies the unique infrastructure resource ID to import." Config generation: "write only the `import` block and run the `terraform plan` command with the `generate-config-out` flag" - read-at-source.
- Introduced **1.5.0 (2023-06-12)** [11]: "Root module authors can now use the `import` block to declare their intent that Terraform adopt an existing resource." and "A new flag `-generate-config-out=PATH` is added to `terraform plan`." - read-at-source.
- `-generate-config-out` still marked experimental in plan docs [5]: "(Experimental)"; "instructs Terraform to generate HCL for any imported resources not already present" - read-at-source.
- `for_each` in import blocks added **1.7.0** [12]: "`for_each` can now be used to expand the `import` block to handle multiple resource instances" - read-at-source.
- 1.12.0 [20]: "`import` blocks: Now support importing a resource via a new identity attribute." - read-at-source.

### 2e. removed block
- Introduced **1.7.0 (2024-01-17)** [12]: "Module authors can now record in source code when a resource or module call has been removed from configuration" - read-at-source.
- Docs [13] https://developer.hashicorp.com/terraform/language/block/removed : default removes from state and destroys; `lifecycle { destroy = false }` "to remove the resource from state without destroying the actual resource." `destroy` is the only supported lifecycle argument in `removed` - read-at-source.

### 2f. Backends and state locking
| Claim | URL | Quote | Tier |
|---|---|---|---|
| Locking is automatic where supported; not all backends lock | https://developer.hashicorp.com/terraform/language/state/locking [14] | "If supported by your backend, Terraform will lock your state for all operations that could write state." / "Not all backends support locking." | read-at-source |
| Page does NOT list which backends lock; check each backend page | [14] | "The documentation for each backend includes details on whether it supports locking or not." | read-at-source |
| force-unlock warning | [14] | "If you unlock the state when someone else is holding the lock it could cause multiple writers." | read-at-source |
| local backend stores and locks on local disk; default `terraform.tfstate` | https://developer.hashicorp.com/terraform/language/backend/local [15] | "The local backend stores state on the local filesystem, locks that state using system APIs, and performs operations locally." | read-at-source |
| S3 locking is opt-in via `use_lockfile` (default false) | https://developer.hashicorp.com/terraform/language/backend/s3 [16] | "State locking is an opt-in feature of the S3 backend." / "Defaults to `false`." | read-at-source |
| DynamoDB locking deprecated | [16] | "DynamoDB-based locking is deprecated and will be removed in a future minor version." | read-at-source |
| S3 native locking introduced 1.10.0 (2024-11-27) | [17] CHANGELOG v1.10 | "The s3 backend now supports S3 native state locking." | read-at-source |
| GA and DynamoDB args deprecated in 1.11.0 (2025-02-27) | [18] CHANGELOG v1.11 | "S3 native state locking is now generally available." / "we've deprecated the DynamoDB-related arguments" | read-at-source |
| Not yet removed as of 1.17 docs | [16] | still says "will be removed in a future minor version" | read-at-source |

### 2g. Dependency lock file `.terraform.lock.hcl` [19] https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Records "the exact version that Terraform selected based on the version constraints in the configuration" plus checksums - read-at-source.
- Providers only: "At present, the dependency lock file tracks only provider dependencies." and "Terraform does not remember version selections for remote modules." - read-at-source.
- Commit it: "You should include this file in your version control repository" - read-at-source.

### 2h. Version constraints [21] https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- `=`: "Allows only one exact version number. Cannot be combined with other conditions."
- `!=`: "Excludes an exact version number."
- `>`, `>=`: "The `>` and `>=` operators request newer versions."
- `<`, `<=`: "The `<` and `<=` operators request older versions."
- `~>`: "Allows only the right-most version component to increment." Example: "`~> 1.0.4`: Allows Terraform to install `1.0.5` and `1.0.10` but not `1.1.0`." (`~> 1.1` allows 1.2 and 1.10, not 2.0.)
- All read-at-source.

### 2i. Refresh-only, state commands, no hand edits
- `-refresh-only` [5]: "creates a plan whose goal is only to update the Terraform state and any root module output values"; "available only in Terraform v0.15.4 and later." - read-at-source.
- 1.17.0 adds `-minimal-refresh` [22]: "will only refresh resources that have proposed changes." - read-at-source.
- `terraform state` subcommands [23] https://developer.hashicorp.com/terraform/cli/commands/state : identities, list, mv, pull, replace-provider, rm, show (push not shown in the extract read) - read-at-source.
- [23] "You can use the terraform state commands to modify the Terraform state instead modifying the state directly." and "backups for state modification _can not be disabled_." - read-at-source.
- State page [24] https://developer.hashicorp.com/terraform/language/state : "Do not directly edit this file." Default "local file named `terraform.tfstate`", backup in `terraform.tfstate.backup` - read-at-source.
- `terraform state mv` [25]: "changes bindings in Terraform state so that existing remote objects bind to new resource instances." - read-at-source.
- State-in-CLI page [26]: "Modifying state data outside of normal `terraform plan` or `terraform apply` operations can cause Terraform to lose track" - read-at-source.

### 2j. Sensitive values are in state in plain text [27] https://developer.hashicorp.com/terraform/language/state/sensitive-data
- "Terraform stores your state in a plaintext file, which includes any secret values you defined in your configuration." - read-at-source.
- "Terraform stores values with the `sensitive` argument in both state and plan files." - read-at-source.
- Encryption at rest depends on backend: "the encryption method depends on your specific backend." - read-at-source.

### 2k. Workspaces [28] https://developer.hashicorp.com/terraform/cli/workspaces
- "Every initialized working directory starts with one workspace named `default`." - read-at-source.
- Not for strong environment separation: "CLI workspaces within a working directory use the same backend"; "Workspaces alone are not a suitable tool for system decomposition" - read-at-source.
- Recommended alternative: reusable modules with a separate root config and backend per deployment ("use one or more re-usable modules to represent the common elements") - read-at-source.

### 2l. terraform_data, count vs for_each
- `terraform_data` [29]: "implements the standard resource lifecycle, but does not directly take any other actions"; usable "without requiring or configuring a provider"; `triggers_replace`: "Terraform replaces the resource when the value changes." - read-at-source.
- Introduced **1.4.0 (2023-03-08)** [30]: "`terraform_data` is a new builtin managed resource type, which can replace the use of `null_resource`" - read-at-source.
- count vs for_each [31]: "Use the count argument when you want to create nearly identical instances." / "Use for_each when some instance arguments must have distinct values that can't be directly derived from an integer index." - read-at-source.

### 2m. Dependency graph, depends_on, parallelism
- `terraform graph` [32]: "This command uses the DOT language to generate graphs." Example "terraform graph -type=plan | dot -Tpng >graph.png" - read-at-source.
- Implicit deps [33]: "Terraform automatically infers that the role must be created first." (from a reference) - read-at-source.
- Explicit `depends_on` [33]: for "hidden resource or module dependencies that Terraform cannot automatically infer"; "You should only use `depends_on` as a last resort" - read-at-source.
- Parallelism [34] https://developer.hashicorp.com/terraform/cli/commands/apply : "Limit the number of concurrent operations as Terraform walks the graph. Defaults to 10." - read-at-source.

### 2n. Ephemeral values / write-only args (one line)
- Ephemeral resources and ephemeral variables/outputs arrived in **1.10.0** ("Ephemeral resources are read anew during each phase of Terraform evaluation, and cannot be persisted to state storage." [17]); write-only attributes in **1.11.0** ("They are not persisted in state." [18]) - read-at-source.

---

## 3. Current Terraform version

| Claim | URL | Quote | Tier |
|---|---|---|---|
| Latest is **1.17.1**, released 2026-10-28 18:03:57 UTC (matches local binary) | https://checkpoint-api.hashicorp.com/v1/check/terraform [35] | `"current_version":"1.17.1","current_release":1793210637` | read-at-source |
| 1.17.0 released 2026-10-21 | [22] | "1.17.0 (October 21, 2026)" | read-at-source |

Relevant changes 1.10 to 1.17 (all read-at-source from CHANGELOGs):
- 1.10.0 (2024-11-27): S3 native locking; ephemeral resources, ephemeral variables/outputs [17].
- 1.11.0 (2025-02-27): S3 `use_lockfile` GA, DynamoDB args deprecated; write-only attributes [18].
- 1.12.0 (2025-05-14): import by identity; logical operators "can now short-circuit"; OCI Object Storage backend [20]. Exam 004 targets this version.
- 1.14.0 (2025-11-19): list resources + "A new Terraform command `terraform query`"; "New top-level Actions block" [36].
- 1.17.0 (2026-10-21): `-minimal-refresh` planning option [22].
- 1.13, 1.15, 1.16 changelogs not read this session.

---

## 4. Licence (MPL 2.0 to BSL 1.1)

| Claim | URL | Quote | Tier |
|---|---|---|---|
| Announced **2023-08-10** | https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license [37] | "changing its source code license from Mozilla Public License v2.0 (MPL 2.0) to the Business Source License" | read-at-source |
| Applies to future releases | [37] | "on all future releases of HashiCorp products" | read-at-source |
| End users unaffected except competitive offerings | [37] | "End users can continue to copy, modify, and redistribute the code" | read-at-source |
| First BSL version is **1.6.0**; licensor now IBM | https://github.com/hashicorp/terraform/blob/main/LICENSE [38] | "Terraform Version 1.6.0 or later." / Licensor "International Business Machines Corporation (IBM)" | read-at-source |
| Additional Use Grant | [38] | "offering the Licensed Work to third parties on a hosted or embedded basis in order to compete with IBM Corp.'s paid version(s)" | read-at-source |
| "Competitive offering" definition | [38] | "offered to third parties on a paid basis ... that significantly overlaps with the capabilities" of IBM's paid versions | read-at-source |
| Change Date: converts to MPL 2.0 after four years | [38] | "Four years from the date the Licensed Work is published." Change License "MPL 2.0" | read-at-source |
| Last MPL release is **1.5.7** (2023-09-07) | https://raw.githubusercontent.com/hashicorp/terraform/v1.5.7/LICENSE [39] + v1.5 CHANGELOG [11] | LICENSE at v1.5.7: "Mozilla Public License, version 2.0"; 1.5.7 is the last released 1.5.x | read-at-source (derived from two sources) |
| License FAQ answers (Q7 final MPL versions, Q12 competitive offering) | https://www.hashicorp.com/en/license-faq [40] | Fetch returned question headings only | could not verify |

---

## 5. OpenTofu

| Claim | URL | Quote | Tier |
|---|---|---|---|
| OpenTF manifesto: goal and fork after 2023-08-25 deadline | https://opentofu.org/manifesto/ [41] | "Our aim with this manifesto is to return Terraform to a fully open-source license." | read-at-source |
| Linux Foundation formed OpenTofu, **2023-09-20** | https://www.linuxfoundation.org/press/announcing-opentofu [42] | "Today, the Linux Foundation announced the formation of OpenTofu, an open source alternative to Terraform's" | read-at-source |
| GA 1.6.0 on **2024-01-10** | https://opentofu.org/blog/opentofu-is-going-ga/ [43] | "the first stable release of OpenTofu"; "a drop-in replacement for Terraform" | read-at-source |
| Licence MPL 2.0 | https://raw.githubusercontent.com/opentofu/opentofu/main/LICENSE [44] | "Mozilla Public License, version 2.0" | read-at-source |
| CNCF **Sandbox** since **2025-04-23** | https://www.cncf.io/projects/opentofu/ [45] | "OpenTofu was accepted to CNCF on April 23, 2025 at the Sandbox maturity level." | read-at-source |
| Still also "a Series of LF Projects, LLC" (site footer) | https://opentofu.org/blog/ [46] | "a Series of LF Projects, LLC" | read-at-source |
| CNCF needed a licence exception (MPL not Apache 2.0) | https://thenewstack.io/opentofu-joins-cncf-new-home-for-open-source-iac-project/ | search summary only | reported |
| Current version **v1.13.2** (2026-10-21); 1.13.0 blog 2026-09-29 | https://api.github.com/repos/opentofu/opentofu/releases/latest [47], [46] | `"tag_name": "v1.13.2"` / "OpenTofu v1.13.0" | read-at-source |
| State encryption, **1.7.0** | https://raw.githubusercontent.com/opentofu/opentofu/v1.7/CHANGELOG.md [48] | "We're introducing optional end-to-end encryption for state files." | read-at-source |
| State encryption scope | https://opentofu.org/docs/language/state/encryption/ [49] | "OpenTofu supports encrypting state and plan files at rest, both for local storage and when using a backend." | read-at-source |
| Early evaluation, **1.8.0** | https://raw.githubusercontent.com/opentofu/opentofu/v1.8/CHANGELOG.md [50] | "Variables and Locals allowed in module sources and backend configurations (with limitations)" | read-at-source |
| Provider `for_each` and `-exclude`, **1.9.0** | https://raw.githubusercontent.com/opentofu/opentofu/v1.9/CHANGELOG.md [51] | "`provider` blocks now support `for_each`." / "The new `-exclude` planning option complements `-target`" | read-at-source |
| Release dates of 1.7/1.8/1.9 | CHANGELOG headings carry no dates | - | could not verify |

---

## 6. IBM acquisition of HashiCorp

| Claim | URL | Quote | Tier |
|---|---|---|---|
| Announced **2024-04-24**, $35/share cash, $6.4B enterprise value | https://newsroom.ibm.com/2024-04-24-IBM-to-Acquire-HashiCorp-Inc-Creating-a-Comprehensive-End-to-End-Hybrid-Cloud-Platform [52] | "IBM will acquire HashiCorp for $35 per share in cash" | read-at-source |
| Completed **2025-02-27** | https://newsroom.ibm.com/2025-02-27-ibm-completes-acquisition-of-hashicorp,-creates-comprehensive,-end-to-end-hybrid-cloud-platform [53] | "today announced it has completed its acquisition of HashiCorp" | read-at-source |

---

## 7. HCP Terraform (formerly Terraform Cloud) and pricing

| Claim | URL | Quote | Tier |
|---|---|---|---|
| Renamed **2024-04-22** | https://developer.hashicorp.com/terraform/docs/cloud [54] | "Effective April 22, 2024, Terraform Cloud is now HCP Terraform." | read-at-source |
| Original rename blog post | hashicorp.com/blog (URL guessed, 404) | - | could not verify |
| Resource-based pricing, Free tier to 500 managed resources, **2023-05-16** | https://www.hashicorp.com/en/blog/terraform-cloud-updates-plans-with-an-enhanced-free-tier-and-more-flexibility [55] | "The updated Free tier covers up to 500 managed resources." | read-at-source |
| Legacy Free plan EOL **2026-03-31**; orgs auto-moved (post dated 2025-12-17) | https://www.hashicorp.com/en/blog/continuing-hcp-terraform-s-enhanced-free-tier-experience [56] | "the legacy Free plan will reach end of life on March 31, 2026." | read-at-source |
| RUM definition | [56] | "a resource in an HCP Terraform-managed state file where mode = "managed"" (null resources excluded) | read-at-source |
| Current paid per-resource rates | hashicorp.com/products/terraform/pricing | third-party figures conflict | could not verify |

---

## 8. Providers (registry API, read 2026-11-03)

| Provider | Latest | Published | Source | Tier |
|---|---|---|---|---|
| hashicorp/local | 2.9.1 | 2026-09-10 | https://registry.terraform.io/v1/providers/hashicorp/local [57] | read-at-source |
| hashicorp/random | 3.9.1 | 2026-09-11 | https://registry.terraform.io/v1/providers/hashicorp/random [58] | read-at-source |
| hashicorp/null | 3.3.2 | 2026-09-10 | https://registry.terraform.io/v1/providers/hashicorp/null [59] | read-at-source |
| hashicorp/aws | 6.71.0 (major 6) | 2026-10-28 | https://registry.terraform.io/v1/providers/hashicorp/aws [60] | read-at-source |
| hashicorp/google | 8.9.0 (major 8) | 2026-10-27 | https://registry.terraform.io/v1/providers/hashicorp/google [61] | read-at-source |
| snowflakedb/snowflake | 2.22.1 (major 2) | 2026-10-29 | https://registry.terraform.io/v1/providers/snowflakedb/snowflake [62] | read-at-source |
| databricks/databricks | 1.141.0 (major 1) | 2026-11-02 | https://registry.terraform.io/v1/providers/databricks/databricks [63] | read-at-source |

Resource details:
- `aws_s3_bucket` [64] https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown : `bucket` "(Optional, Forces new resource) Name of the bucket."; `bucket_prefix` also "Forces new resource"; `region` "(Optional) Region where this resource will be" managed - read-at-source.
- AWS provider 6.0.0 (2025-06-18) [65]: "provider: Add enhanced `region` support to most resources, data sources, and ephemeral resources." - read-at-source.
- `google_storage_bucket`: docs [66] say "Once a bucket has been created, its location can't be changed." but do not label `name`/`location` ForceNew; source schema [67] sets "ForceNew: true," on both `name` and `location` - read-at-source.
- Snowflake namespace move [68] https://raw.githubusercontent.com/snowflakedb/terraform-provider-snowflake/main/SNOWFLAKEDB_MIGRATION.md : "As of (03-04-2025) the provider has been transferred from the Snowflake-Labs GitHub organization to snowflakedb." Versions "v0.28.6 - v1.0.5" available in both. Migrate with `terraform state replace-provider Snowflake-Labs/snowflake snowflakedb/snowflake` - read-at-source. Date format ambiguous (3 April or 4 March 2025): could not verify which.
- `snowflake_database` [69]: `name` "Specifies the identifier for the database; must be unique for your account." Subcategory "Stable" - read-at-source.
- `databricks_catalog` [70]: Unity Catalog "a 3-level namespace for organizing data"; `name` "Name of Catalog relative to parent metastore." (not marked force-new); `storage_root` "Change forces creation of a new resource." - read-at-source.

---

## 9. Policy as code

- HCP Terraform supports both [71] https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement : "Sentinel: HashiCorp's policy-as-code framework" and "OPA: Open Policy Agent with Rego language." - read-at-source.

---

## 10. GitHub Actions

- `hashicorp/setup-terraform` latest **v4.0.1** (2026-05-12), so current major is v4 [72] https://api.github.com/repos/hashicorp/setup-terraform/releases/latest - read-at-source.
- `opentofu/setup-opentofu` latest **v2.0.2** (2026-06-29), current major v2 [73] https://api.github.com/repos/opentofu/setup-opentofu/releases/latest - read-at-source.

---

## Commonly misstated claims (with the correct version)

1. "OpenTofu is a Linux Foundation project" vs "OpenTofu is CNCF": both are true now. LF formed it 2023-09-20 [42]; CNCF Sandbox since 2025-04-23 [45]. Not Incubating or Graduated.
2. "`sensitive = true` keeps secrets out of state": false. Sensitive values are stored in state and plan files [27].
3. "The lock file pins module versions": false. Providers only [19].
4. "Use CLI workspaces for dev/staging/prod": HashiCorp docs say workspaces share a backend and are not strong separation [28].
5. "Terraform went BSL in 1.5": first BSL version is 1.6.0 [38]; 1.5.7 is still MPL [39].
6. "S3 backend needs DynamoDB for locking": not since 1.11 (`use_lockfile` GA); DynamoDB args deprecated [16][18].
7. "Associate 003 is the current exam": 004 replaced it in January 2026 [1].
8. "Terraform Cloud": renamed HCP Terraform 2024-04-22 [54].
9. "Snowflake-Labs/snowflake": registry source is now `snowflakedb/snowflake` [68].
10. "Every changed bucket attribute forces replacement": only specific arguments (S3 `bucket`/`bucket_prefix`; GCS `name`/`location`) [64][67].

---

## Citation appendix (all read 2026-11-03)

1. Terraform Associate (004) - https://developer.hashicorp.com/certifications/terraform-associate
2. Infrastructure automation certifications - https://developer.hashicorp.com/certifications/infrastructure-automation
3. Exam Content List - Terraform Associate 004 - https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-review-004
4. Associate study guide 004 - https://developer.hashicorp.com/terraform/tutorials/certification-004/associate-study-004
5. Command: plan - https://developer.hashicorp.com/terraform/cli/commands/plan
6. lifecycle meta-argument - https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
7. Terraform CHANGELOG v1.2 - https://raw.githubusercontent.com/hashicorp/terraform/v1.2/CHANGELOG.md
8. moved block - https://developer.hashicorp.com/terraform/language/moved
9. Terraform CHANGELOG v1.1 - https://raw.githubusercontent.com/hashicorp/terraform/v1.1/CHANGELOG.md
10. import block - https://developer.hashicorp.com/terraform/language/import
11. Terraform CHANGELOG v1.5 - https://raw.githubusercontent.com/hashicorp/terraform/v1.5/CHANGELOG.md
12. Terraform CHANGELOG v1.7 - https://raw.githubusercontent.com/hashicorp/terraform/v1.7/CHANGELOG.md
13. removed block - https://developer.hashicorp.com/terraform/language/block/removed
14. State locking - https://developer.hashicorp.com/terraform/language/state/locking
15. Backend: local - https://developer.hashicorp.com/terraform/language/backend/local
16. Backend: s3 - https://developer.hashicorp.com/terraform/language/backend/s3
17. Terraform CHANGELOG v1.10 - https://raw.githubusercontent.com/hashicorp/terraform/v1.10/CHANGELOG.md
18. Terraform CHANGELOG v1.11 - https://raw.githubusercontent.com/hashicorp/terraform/v1.11/CHANGELOG.md
19. Dependency lock file - https://developer.hashicorp.com/terraform/language/files/dependency-lock
20. Terraform CHANGELOG v1.12 - https://raw.githubusercontent.com/hashicorp/terraform/v1.12/CHANGELOG.md
21. Version constraints - https://developer.hashicorp.com/terraform/language/expressions/version-constraints
22. Terraform CHANGELOG v1.17 - https://raw.githubusercontent.com/hashicorp/terraform/v1.17/CHANGELOG.md
23. Command: state - https://developer.hashicorp.com/terraform/cli/commands/state
24. State - https://developer.hashicorp.com/terraform/language/state
25. Command: state mv - https://developer.hashicorp.com/terraform/cli/commands/state/mv
26. Manage state (CLI) - https://developer.hashicorp.com/terraform/cli/state
27. Sensitive data in state - https://developer.hashicorp.com/terraform/language/state/sensitive-data
28. CLI workspaces - https://developer.hashicorp.com/terraform/cli/workspaces
29. terraform_data - https://developer.hashicorp.com/terraform/language/resources/terraform-data
30. Terraform CHANGELOG v1.4 - https://raw.githubusercontent.com/hashicorp/terraform/v1.4/CHANGELOG.md
31. count meta-argument - https://developer.hashicorp.com/terraform/language/meta-arguments/count
32. Command: graph - https://developer.hashicorp.com/terraform/cli/commands/graph
33. depends_on meta-argument - https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
34. Command: apply - https://developer.hashicorp.com/terraform/cli/commands/apply
35. Checkpoint API - https://checkpoint-api.hashicorp.com/v1/check/terraform
36. Terraform CHANGELOG v1.14 - https://raw.githubusercontent.com/hashicorp/terraform/v1.14/CHANGELOG.md
37. HashiCorp adopts BSL (2023-08-10) - https://www.hashicorp.com/en/blog/hashicorp-adopts-business-source-license
38. Terraform LICENSE (main) - https://github.com/hashicorp/terraform/blob/main/LICENSE (and raw.githubusercontent.com/hashicorp/terraform/main/LICENSE)
39. Terraform LICENSE at v1.5.7 - https://raw.githubusercontent.com/hashicorp/terraform/v1.5.7/LICENSE
40. HashiCorp license FAQ - https://www.hashicorp.com/en/license-faq
41. OpenTofu manifesto - https://opentofu.org/manifesto/
42. Linux Foundation launches OpenTofu (2023-09-20) - https://www.linuxfoundation.org/press/announcing-opentofu
43. OpenTofu is going GA (2024-01-10) - https://opentofu.org/blog/opentofu-is-going-ga/
44. OpenTofu LICENSE - https://raw.githubusercontent.com/opentofu/opentofu/main/LICENSE
45. CNCF project page: OpenTofu - https://www.cncf.io/projects/opentofu/
46. OpenTofu blog index - https://opentofu.org/blog/
47. OpenTofu latest release (API) - https://api.github.com/repos/opentofu/opentofu/releases/latest
48. OpenTofu CHANGELOG v1.7 - https://raw.githubusercontent.com/opentofu/opentofu/v1.7/CHANGELOG.md
49. OpenTofu state encryption docs - https://opentofu.org/docs/language/state/encryption/
50. OpenTofu CHANGELOG v1.8 - https://raw.githubusercontent.com/opentofu/opentofu/v1.8/CHANGELOG.md
51. OpenTofu CHANGELOG v1.9 - https://raw.githubusercontent.com/opentofu/opentofu/v1.9/CHANGELOG.md
52. IBM to acquire HashiCorp (2024-04-24) - https://newsroom.ibm.com/2024-04-24-IBM-to-Acquire-HashiCorp-Inc-Creating-a-Comprehensive-End-to-End-Hybrid-Cloud-Platform
53. IBM completes acquisition (2025-02-27) - https://newsroom.ibm.com/2025-02-27-ibm-completes-acquisition-of-hashicorp,-creates-comprehensive,-end-to-end-hybrid-cloud-platform
54. What is HCP Terraform? - https://developer.hashicorp.com/terraform/docs/cloud
55. Terraform Cloud enhanced Free tier (2023-05-16) - https://www.hashicorp.com/en/blog/terraform-cloud-updates-plans-with-an-enhanced-free-tier-and-more-flexibility
56. Continuing HCP Terraform's enhanced Free tier (2025-12-17) - https://www.hashicorp.com/en/blog/continuing-hcp-terraform-s-enhanced-free-tier-experience
57. Registry API hashicorp/local - https://registry.terraform.io/v1/providers/hashicorp/local
58. Registry API hashicorp/random - https://registry.terraform.io/v1/providers/hashicorp/random
59. Registry API hashicorp/null - https://registry.terraform.io/v1/providers/hashicorp/null
60. Registry API hashicorp/aws - https://registry.terraform.io/v1/providers/hashicorp/aws
61. Registry API hashicorp/google - https://registry.terraform.io/v1/providers/hashicorp/google
62. Registry API snowflakedb/snowflake - https://registry.terraform.io/v1/providers/snowflakedb/snowflake
63. Registry API databricks/databricks - https://registry.terraform.io/v1/providers/databricks/databricks
64. aws_s3_bucket docs source - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket.html.markdown
65. AWS provider CHANGELOG - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/CHANGELOG.md
66. google_storage_bucket docs source - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/storage_bucket.html.markdown
67. google_storage_bucket schema - https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/google/services/storage/resource_storage_bucket.go
68. Snowflake namespace migration guide - https://raw.githubusercontent.com/snowflakedb/terraform-provider-snowflake/main/SNOWFLAKEDB_MIGRATION.md
69. snowflake_database docs - https://raw.githubusercontent.com/snowflakedb/terraform-provider-snowflake/main/docs/resources/database.md
70. databricks_catalog docs - https://raw.githubusercontent.com/databricks/terraform-provider-databricks/main/docs/resources/catalog.md
71. HCP Terraform policy enforcement - https://developer.hashicorp.com/terraform/cloud-docs/policy-enforcement
72. setup-terraform latest release (API) - https://api.github.com/repos/hashicorp/setup-terraform/releases/latest
73. setup-opentofu latest release (API) - https://api.github.com/repos/opentofu/setup-opentofu/releases/latest

---

## Could not verify

- Exact 003 to 004 switchover dates (2026-01-05 / 01-07 / 01-08): seen only in a search snippet of the official page; the live page no longer shows them.
- Number of questions on the 004 exam (57 cited by third parties only).
- `+/-` legend wording on a HashiCorp web page: confirmed only from the 1.17.1 binary strings and a GitHub issue, not from developer.hashicorp.com.
- HashiCorp License FAQ answers (Q7 final MPL versions per product, Q12 competitive offering): fetch returned headings only. Licence facts above come from the LICENSE files instead.
- Original HashiCorp blog post announcing the Terraform Cloud to HCP Terraform rename (docs page used instead).
- Current HCP Terraform paid per-resource prices.
- OpenTofu 1.7 / 1.8 / 1.9 release dates (changelog headings undated).
- Snowflake namespace move date: "03-04-2025" is ambiguous (4 March or 3 April 2025).
- CNCF licence exception for OpenTofu (secondary reports only).
- Terraform 1.13, 1.15, 1.16 changelogs not reviewed.
