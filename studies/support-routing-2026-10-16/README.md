# Orlo evaluation starter: support-ticket routing

Check whether a model follows a written support-routing policy. This starter contains 20 fictional tickets, expected answers, an output schema and an independent exact-JSON scorer. Use it with Orlo, adapt it for another harness, or inspect the recorded study without making a model call. The [methods appendix](support-routing/study-methods.md) distinguishes reproducible grading from rerunning generation.

**Historical study, dataset 0.1.0.** Labels are provisional and AI-authored, with zero independently human-reviewed cases. Data and documentation are now CC BY 4.0; tools are MIT licensed under the repository license. The original manifest keeps its historical status and license fields to preserve the experiment hash. This is a workflow study, not a production benchmark.

## Start here

1. Read the [dataset card](support-routing/dataset-card.md) and [policy](support-routing/policy.md).
2. Follow the [step-by-step tutorial](support-routing/tutorial.md).
3. Read the [worked case study](support-routing/case-study.md) and [recorded answers](support-routing/study-results.json).
4. Use the [review worksheet](support-routing/review-worksheet.md) before trusting or adapting the labels.

[Watch the 98-second walkthrough](support-routing/media/support-routing-walkthrough.mp4). It is an edited tour of real console captures from the saved experiment, with captions and no audio. It is not a continuous recording of the original run. [Separate captions](support-routing/media/captions.vtt) are included.

## Run offline

Requires Node.js 20 or later. No installation, account or provider key is needed for these commands:

```sh
node cli.mjs validate
node cli.mjs baseline
node cli.mjs export
node --test pilot.test.mjs
```

To score your own answers, supply a JSON array with one `{ "id": "support-001", "output": "..." }` record per case:

```sh
node cli.mjs score answers.json
```

An answer passes when its JSON values equal the expected answer. Formatting whitespace and object-key order do not matter; string case, types, arrays, extra fields and values do. Missing or malformed answers do not disappear from the denominator.

## What the recorded study found

GPT-5.4 and Claude Sonnet 4.6 each matched 19 of 20 provisional references. Both disagreed with the same provisional queue label. Inspection exposed an unresolved overlap between security questions and API how-to questions in the written policy. Orlo's grades matched the independent scorer and exported assertion functions on all 40 answers. The comparison could not distinguish the models on these cases and remained inconclusive, and no production release was created.

This is a result on a small, visible set of related synthetic cases. It does not establish production accuracy or identify a general model winner. The study's token-price estimate was about $0.07; future runs can cost differently.

Recheck both recorded model results without a provider call:

```sh
node --input-type=module <<'JS'
import {readFile} from 'node:fs/promises';
import {load} from './cli.mjs';
import {summarize} from './score.mjs';
const pack = await load();
const study = JSON.parse(await readFile('support-routing/study-results.json', 'utf8'));
for (const {model} of study.models) {
  const answers = study.cases.map(c => ({id:c.id, output:c.answers.find(a => a.model === model).output}));
  const result = summarize(pack.cases, answers);
  console.log(`${model}: ${result.exact}/${result.planned} whole answers match`);
}
JS
```

## Adapt responsibly

Make a private copy for your organization's policy. Version the policy and labels together, record human reviews, and add different scenario families rather than near-duplicates. Keep expected answers and grading metadata out of candidate prompts. The six records labelled regression cover three families absent from development. All their labels were visible, so they are not an unseen holdout.

The package contains no Orlo server implementation, account receipts, private API exports or provider credentials. The scorer and data are usable independently of the platform. Orlo-specific requests are generated offline, then submitted explicitly as described in the tutorial.

This archive is separate from the 500-case dataset at the repository root. Follow the [current tutorial](../../TUTORIAL.md) for new experiments.
