# Support routing 0.3.1

Five hundred fictional English-language support tickets test queue selection, priority and escalation for a B2B software company. The set expands coverage of policy boundaries and gives builders specific errors to investigate. It does not measure production prevalence or establish that a model is safe to release.

## Composition

The set preserves 32 earlier draft inputs and reference answers, then adds 78 authored scenarios with six variants each: base, premium tier, one prior contact, repeated contact, instruction pressure and unrelated resolved contacts. There are **91 scenario families**, not 500 independent situations. Family sizes differ because the inherited families have fewer variants.

| Coverage | Development | Evaluation | Total |
| --- | ---: | ---: | ---: |
| Cases | 400 | 100 | 500 |
| Scenario families | 71 | 20 | 91 |
| Account access | 72 | 18 | 90 |
| Billing | 101 | 22 | 123 |
| General | 42 | 8 | 50 |
| Security | 90 | 25 | 115 |
| Technical | 95 | 27 | 122 |
| Escalation-positive references | 119 | 32 | 151 |

There are 300 normal, 117 high and 83 urgent references. Of the 151 escalation-positive cases, **68 are not urgent**. Contact counts include 0, 1, 2, 3 and 5. There are 83 premium and 417 standard-tier inputs. Each new family has a pair that changes only customer tier.

The expansion covers active versus resolved or hypothetical incidents, access/security overlaps, multi-issue precedence, duplicate versus separate payments, optional defects versus blocked workflows, missing details, historical logs, quoted conversations and conflicting instructions. The 390 explicit base/variant links allow paired consistency checks. Tags overlap; their counts should not be added to produce a case total.

Tickets range from 11 to 194 words, with a median of 49. The `long_context` tag identifies 48 variants of eight longer tickets; these are longer than the other tickets, not a test of a model's long context window.

## Policy and partitions

The policy retains the earlier security/how-to tie-breaker and same-unresolved-issue contact rule. Version 0.3.0 also states where routine membership and access administration belongs. This avoids leaving invitation, ownership and role questions to an unstated interpretation. All original 32 inputs and proposed labels are unchanged; the earlier policy files are preserved in their own versions.

All members of a family stay in one partition. New evaluation families were selected deterministically within queue quotas; the inherited regression partition becomes `evaluation`, with its old split recorded in provenance. Both partitions are visible, and topics overlap. Treat evaluation as a family-separated check, not a secret test set. Tune on development, freeze the setup, then use evaluation. Repeated inspection reduces its value as a fresh check.

## Authorship and quality checks

Codex authored the scenario briefs, rationales and proposed labels. A deterministic generator applied the six variant types. The same authoring process produced the labels and their explanations, so these are not independent judgments. The exact authoring model snapshot was not independently recorded. Dataset preparation used no separate provider generation calls or human reviews. Model studies are published separately from the frozen dataset.

[Generation metadata](generation.json) records source hashes, parent identity and generator identity. [Coverage results](coverage-report.json) record counts and automated checks. Checks cover the input/output shape, unique normalized inputs, required coverage tags, family separation, tier-only pairs, escalation invariants and declared counterfactual relationships. A word five-gram similarity screen found no pairs from different families at or above 0.65 Jaccard similarity. That lexical screen does not establish semantic independence or label correctness.

## Interpretation and limits

Report exact matches together with schema failures, escalation misses and false alarms, queue metrics, priority loss, family averages and slice counts. There are 32 positive escalation references in evaluation, drawn from related families. That supports a more useful diagnostic than the original five positive cases, but still cannot establish a precise production recall estimate. The scorer reports descriptive rates without confidence intervals that would assume independent rows.

All labels remain unreviewed. Many tickets make the relevant facts unusually explicit. The set lacks real customer ambiguity, multilingual traffic, attachments, production frequency estimates and broad paraphrase diversity. Eight instruction-pressure patterns are reused across the new families; these do not constitute a comprehensive adversarial benchmark. It is useful for finding specified policy failures, not for claiming general resilience to prompt injection.

Version 0.3.1 licenses the 0.3.0 cases without changing their bytes, policy, scoring or partitions. Study results are separate artifacts. The 0.1.0 study's 19-of-20 outcomes must not be presented as results for this version. The proposed priority-loss weights are relative severity assumptions, not money. Independent human review remains outstanding. Data and documentation are CC BY 4.0; tools are MIT licensed.
