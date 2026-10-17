# How do I inspect the study without a model key?

Clone this repository and run `node replay-study.mjs`. It checks the archived dataset and settings hashes, re-scores all 40 saved answers, and compares each grade with the published result. It makes no network requests and requires no Orlo account or provider key.

## 1. Get the files

Use Node.js 20 or later:

```sh
git clone https://github.com/useorlo/open-evals.git
cd open-evals
node replay-study.mjs
```

The output should report 40 verified answers, zero model calls and **19 of 20 matches for each model**. These are results for dataset **0.1.0**, not the 500-case dataset at the repository root.

## 2. Read the disagreement

Open [the case study](studies/support-routing-2026-10-16/support-routing/case-study.md). For `support-008`, both models chose Technical while the provisional reference chose Security. The policy contained overlapping rules for security questions and API how-to questions. Agreement between models did not prove the reference wrong; the overlap required a policy decision.

Inspect [the original policy](studies/support-routing-2026-10-16/support-routing/policy.md), [the saved answers](studies/support-routing-2026-10-16/support-routing/study-results.json) and [the methods](studies/support-routing-2026-10-16/support-routing/study-methods.md). The original files remain unchanged, including the ambiguous rule.

## 3. See how Orlo presented it

[Watch the 98-second console walkthrough](studies/support-routing-2026-10-16/support-routing/media/support-routing-walkthrough.mp4). It uses edited captures of the saved comparison, with captions and no audio. It is a result walkthrough, not a continuous setup recording. GitHub may offer the MP4 as a download; [captions](studies/support-routing-2026-10-16/support-routing/media/captions.vtt) are separate.

![The saved comparison](studies/support-routing-2026-10-16/support-routing/images/completed.png)

## 4. Try the expanded dataset

The current dataset adds policy boundaries, family-separated partitions and richer diagnostics. Validate it and score a deliberately simple constant-answer baseline:

```sh
node cli.mjs validate --dataset .
node cli.mjs baseline --dataset . --split evaluation
node --test rich-score.test.mjs verify.test.mjs
```

The baseline is a scoring check, not a model result. Read the [dataset card](dataset-card.md), [scoring guide](SCORING.md) and [Orlo tutorial](TUTORIAL.md) before starting your own comparison.

Replaying saved grades is reproducible. Calling a model again is a new experiment and can return different answers. None of these checks independently validates the provisional reference labels.
