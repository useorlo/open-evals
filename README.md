# Evaluate support routing on 500 synthetic cases

This draft tests whether a model routes fictional support tickets according to a stated policy. It includes 500 cases, reference answers, rationales, family-separated partitions and an offline scorer. You can use the data without Orlo. The references are provisional: no person has independently reviewed them, and model results must be interpreted against that limit.

The answer remains three fields: `queue`, `priority` and `escalate`. Richer scoring adds diagnostics without requiring a different model response. Read the [dataset card](dataset-card.md), [policy](policy.md) and [scoring guide](SCORING.md) before interpreting results.

## Run locally

Clone the standalone repository:

```sh
git clone https://github.com/useorlo/open-evals.git
cd open-evals
node cli.mjs validate --dataset .
node cli.mjs baseline --dataset . --split evaluation
```

These commands validate the dataset and score a constant answer. They make no model calls. Node.js 20 or later is sufficient; no packages or Orlo server are required.

The repository includes JSONL and CSV data, separate partition files, a review worksheet, a promptfoo configuration, Orlo payload templates and a standalone scorer. To score saved answers, run:

```sh
node cli.mjs validate --dataset .
node cli.mjs baseline --dataset . --split evaluation
node cli.mjs score answers.json --dataset . --split evaluation > scores.json
```

`answers.json` is a JSON array of `{ "id": "support-033", "output": { "queue": "security", "priority": "urgent", "escalate": true } }` records. `output` can also be a JSON string. Save the answer against the case ID used to request it. Supply all cases in the partition you are scoring; missing answers count as failures. A full-dataset answer file can also be scored by partition. Duplicate or unknown IDs are rejected.

Keep the references, rationales, tags and scoring report outside the prompt. Send only the policy, output schema and ticket input. Freeze the artifact hash and settings before a run. Record the provider, requested and returned model IDs, temperature, reasoning settings, output limits, attempts, timestamps, errors and usage. A match rate without these details is not a reproducible comparison.

## Use with Orlo or another harness

The Orlo export contains a task, 500 sample payloads with provenance, and comparison settings. The task template sets a required release policy: submit it as a signed-in person or management principal. A runtime key cannot set that policy. The tutorial explains the separate setup step. Supply the task/dataset and candidate identifiers through the normal API workflow. These are payload templates, not an installer. Compare the evaluation partition only after fixing the prompt and settings against development cases.

The comparison template uses JSON exact matching and has **no release test**. Its ceilings are $5, 1,000,000 tokens and 30 minutes. These are spend limits, not an estimate or a guarantee that every candidate completes. Choose limits and models deliberately before starting. This dataset alone does not qualify a release.

Orlo's current comparison surface supplies the exact-match results. The additional metrics in this pack run offline through `score`; they are not new console charts or native comparison metrics. The promptfoo configuration has no provider selected. Its assertion code is tested locally, but this version has not been executed inside promptfoo.

## Review and publication

The export includes `review-worksheet.csv`, with blank reviewer, decision, corrected-label and policy-gap columns. Review every family and transformation assumption; inspect disagreements against the policy before changing labels. Review all labels before calling the full dataset reviewed. Make policy or reference changes in a new version and rerun affected comparisons.

Data and documentation are licensed under **CC BY 4.0**; the scoring tools are **MIT** licensed. You can use the dataset in Orlo or another harness, modify it and share it with the required attribution. See [LICENSE.md](LICENSE.md). The licenses do not certify the reference labels. See [publication metadata](publication.json) for the current status. The earlier 20-case study is separate. Its results do not apply to these 500 cases.

`checksums.json` records the file digests. [Generation metadata](generation.json) records the authoring method, source hashes and earlier dataset identity. This repository includes the finished cases and authored scenario briefs, but not the original authoring environment. You can validate and score the cases independently; the recorded generator hash is provenance, not a claim that this repository reproduces that environment.
