# Diagnose routing errors without changing the answer contract

The scorer checks the same three-field JSON answer against a provisional reference, then shows which decisions differ. Exact matching remains the primary score. The extra metrics explain failure patterns; none proves that the reference policy or labels are correct.

## Valid answers and denominators

An answer must be an object with exactly `queue`, `priority` and `escalate`, using the declared enums and a Boolean escalation value. JSON whitespace and key order do not matter. Markdown fences, extra fields, missing fields and wrong types fail the contract. Missing responses stay in the planned-case denominator.

Invalid answers receive no classification credit, even if individual values match. `field_matches_diagnostic` records those value matches separately; do not use it as an acceptance score. Invalid answers receive the maximum priority loss. The report retains case IDs and error details but does not repeat raw model text.

## Metrics

| Metric | Calculation | What it tells you |
| --- | --- | --- |
| Exact match | All three fields correct, with valid schema, divided by planned cases | Whether the whole answer met the reference |
| Schema validity | Valid answers divided by planned cases | Whether answers can be consumed as specified |
| Queue precision | TP / (TP + FP), for each queue | How often a predicted queue was correct |
| Queue recall | TP / (TP + FN), for each queue | How often each reference queue was found |
| Queue F1 | 2TP / (2TP + FP + FN) | The balance between queue precision and recall |
| Queue macro F1 | Mean of defined per-queue F1 scores | Gives each represented queue equal weight |
| Queue weighted F1 | Sum of F1 × reference support, divided by total support | Reflects this dataset's queue mix |
| Escalation precision | Correct escalations / valid predicted escalations | How much escalation traffic was necessary under the reference |
| Escalation recall | Correct escalations / positive references | How many required escalations were captured |
| Escalation false-alarm rate | False escalations / negative references | How often non-escalating tickets were escalated |
| Escalation specificity | Correct non-escalations / negative references | How often non-escalating tickets were handled correctly |
| Under/over-prioritization | Valid lower/higher priority answers / all planned cases | The direction of priority errors |
| Family macro exact rate | Mean of each family's exact-match fraction | Reduces the influence of families with more variants |
| All variants match rate | Families whose every case matches / all families | How consistently a scenario survives its variations |

TP, FP and FN mean true positives, false positives and false negatives relative to the proposed references. A valid prediction is required for any true positive. An invalid answer for a positive escalation reference counts as a missed escalation. An invalid answer for a negative reference is reported as `invalid_negative`; it is neither a successful non-escalation nor a false alarm. This can lower specificity without raising false-alarm rate. Always read those rates with schema validity. Precision, recall and F1 use `null` when their denominator is zero, rather than claiming perfect performance without evidence.

The report includes full queue and priority confusion matrices with an `invalid` column; IDs of missed and unnecessary escalations; the number of missed urgent cases; and breakdowns by partition, family, queue, priority, tier, contact-count group and scenario tag. Slices with fewer than 20 rows are marked `small_support`. That is a reading aid, not a statistical adequacy threshold; even large slices may contain correlated variants.

## Relative priority loss

The matrix below assigns proposed relative error points to priority mistakes. It makes under-prioritizing an urgent ticket more costly than over-prioritizing a normal one. These are explicit assumptions in `scoring.json`, not learned operational costs or dollar amounts.

| Reference / Answer | Normal answer | High answer | Urgent answer |
| --- | ---: | ---: | ---: |
| Normal reference | 0 | 1 | 3 |
| High reference | 4 | 0 | 1 |
| Urgent reference | 8 | 5 | 0 |

An invalid or absent answer costs 8 points. Total loss is the sum over all planned cases; mean loss divides by the number of cases. Normalized loss divides by `8 × planned cases`. Lower is better. It measures priority handling only; a wrong queue with the correct priority can have zero priority loss and still fail exact matching. It is not a composite business-value score.

Choose and version weights before inspecting a candidate's results. A different organization's costs may justify different weights. Report the matrix with the result.

## Counterfactual consistency

The 390 links compare each new variant with its family's base case. For tier, one-contact, unrelated-history and instruction-pressure variants, consistency means both answers are schema-valid and identical. For repeat-contact variants, queue and priority must stay the same and both escalation decisions must match their respective references. An invalid or missing member fails the pair.

Two identical wrong answers can be consistent. The report therefore gives both `consistency_rate` and `both_match_reference_rate`. Neither comparison creates an independent additional trial.

## What is deliberately not scored

The task requests neither explanations nor confidence estimates, so the scorer does not invent a rationale-quality or calibration metric. It also does not add an LLM judge. Counts, confusion matrices, exact comparisons and the declared loss matrix are sufficient for this answer contract.

No row-independent confidence interval or significance test is produced. For a later comparative study, fix the policy and settings first, retain paired case results, and use an analysis that accounts for shared families. Keep development and evaluation reports separate. Current scores are diagnostics against unreviewed labels and do not establish release eligibility.
