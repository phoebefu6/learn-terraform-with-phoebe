<!-- learn-with-phoebe hub banner -->
> ### 📚 Part of [**Learn with Phoebe**](https://phoebefu6.github.io/learn-with-phoebe/)
> The shelf of 182 free, hands-on courses on AI, data, and the craft around them. **[Browse every course ↗](https://phoebefu6.github.io/learn-with-phoebe/)**
<!-- /learn-with-phoebe hub banner -->

# Learn Terraform with Phoebe

Six 45-minute sessions on infrastructure as code for data leaders and data engineers, by Phoebe Fu.
A constructed logistics company, Larkspur Freight, writes its first data platform as code: lake zones
per environment, state, a reusable module, a reviewed plan and a pull-request gate.

Local only and zero cost: every build-along runs with the `terraform` or `tofu` CLI and the
`hashicorp/local`, `hashicorp/random` and `hashicorp/null` providers. Cloud provider code is shown, not
applied. Every command output on the pages was really run with Terraform 1.17.1.

| # | Session |
|---|---|
| 1 | [Why infrastructure as code](courses/01-why-infrastructure-as-code.html) |
| 2 | [The HCL language](courses/02-the-hcl-language.html) |
| 3 | [State is the source of truth](courses/03-state-is-the-source-of-truth.html) |
| 4 | [Modules and versions](courses/04-modules-and-versions.html) |
| 5 | [Read a plan like a reviewer](courses/05-read-a-plan-like-a-reviewer.html) (the plan simulator) |
| 6 | [Plan on the PR, apply on merge](courses/06-plan-on-pr-apply-on-merge.html) |

The plan simulator (`assets/plan-live.js`) is a real planning engine: it parses an HCL-lite config,
diffs it against a state with per-type force-new rules, applies lifecycle settings and moved blocks,
and computes the apply order from the dependency graph. An independent Python version reproduces
every ladder rung to the action and the order.

Open `index.html` in a browser, or serve the folder with any static server.
