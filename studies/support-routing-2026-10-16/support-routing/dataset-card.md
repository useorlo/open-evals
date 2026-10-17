# Support ticket routing and escalation

Use these 20 fictional tickets to exercise a written routing policy and inspect disagreements with candidate reference answers. This is a **historical study with provisional AI-authored labels**. No case has received independent human review. A disagreement can expose a policy or label gap as well as a model error.

The recorded contract is in `dataset.json`, `policy.md`, `output-schema.json` and `cases.jsonl`. Those four files preserve the bytes used for the original study. Only `input` is sent as ticket data. Expected answers, rationale, tags, split and family identifiers must stay out of the candidate prompt. The [methods appendix](study-methods.md) supplies checksums and run details.

## Splits and coverage

The 14 development records cover seven families. The six records labelled `regression` cover three families absent from development: unclear, integration and subscription. Related variants stay together. This is a family-separated check that can be reused for regression testing, not an unseen test set: all labels were visible and the recorded run evaluated all 20 cases together.

| Coverage limit | What the original 20 cases support |
|---|---|
| Prior contacts | Counts 0 and 2 only. No one-contact boundary or unrelated-contact history case. |
| Customer tier | One premium ticket, `support-002`, also changes urgency wording. Tier is not isolated as a variable. |
| Escalation recall | Only five positive references: `support-004`, `005`, `007`, `014`, `018`. Both models matched 5/5; this is too sparse for a reliable estimate of production recall. One missed positive would change the observed recall by 20 percentage points. |
| Security/how-to overlap | `support-008` is provisionally Security, but the policy also assigns API how-to questions to Technical without an explicit tie-breaker. Its original rationale explains severity, not queue precedence. |
| Access/security overlap | No ticket combines a lockout with suspected unauthorized password changes. |
| Urgency and escalation | All three urgent references escalate because the policy requires it. Two high-priority repeated-contact cases also escalate. An urgent-only escalation shortcut therefore misses two of the five positives. There is no normal-priority escalation case. |
| Scenario diversity | Ten related families, not 20 independent production scenarios. No claim about real ticket prevalence or general accuracy. |

The provisional queue rationale for `support-008` is that routine credential-rotation guidance falls under security questions. The original policy does not explicitly give that category precedence over an API how-to. A domain owner must confirm or revise that interpretation. The original case rationale and label are preserved; the next draft strengthens the rationale and clarifies precedence before any new run.

## Scoring and use

The primary grade is exact JSON-value equality. Object-key order and formatting whitespace do not matter; types, values and extra fields do. Invalid JSON and Markdown fences fail. A missing label invalidates the dataset; a missing model answer stays in the denominator. Per-field counts, escalation recall and priority confusion are descriptive diagnostics, not release criteria or production estimates.

Run `node cli.mjs baseline` from the starter root for the deliberately trivial always-general baseline. The independent scorer runs without Orlo. The saved study's 40 grades can be reproduced offline. Fresh model generations are not guaranteed to reproduce those answers; see [methods](study-methods.md).

Adapt the policy and expected answers together in a new version. Have a qualified domain reviewer adjudicate labels before relying on them for an operational decision, with additional independent review for an audited release. Model agreement is not human review. The original study is preserved as evidence about version 0.1.0, not transferred to the revised draft.

A successful exercise produces an inspectable result and a next testing decision. It does not qualify a model for production or automatically change a task's release policy.

The repository now grants CC BY 4.0 for this data and documentation and MIT for tools. The original manifest retains its pre-publication license/status fields so its experiment hash remains reproducible. See the repository license for current reuse terms.
