# How do I compare support-routing models with Orlo?

Import the written policy and 500 synthetic tickets, compare two models with exact JSON grading, then inspect the disagreements in Orlo and score the saved answers independently. This walkthrough uses a runtime key for the API and a person in the console for the release policy. It ends with evidence to review; it does not deploy a model.

For a five-minute introduction with no account, provider key or model cost, start with [replaying the historical study](REPLAY.md).

## 1. Get the data and read its limits

Use Node.js 20 or later, `curl` and `jq`:

```sh
git clone https://github.com/useorlo/open-evals.git
cd open-evals
node cli.mjs validate --dataset .
node cli.mjs baseline --dataset . --split evaluation
```

Read [the policy](policy.md), [dataset card](dataset-card.md) and [scoring guide](SCORING.md). A ticket must produce only `queue`, `priority` and `escalate`. Reference labels are provisional, and none has been independently human-reviewed. There are 91 related families, not 500 independent production situations.

This walkthrough freezes one policy and runs all 500 cases once per model. It reports the 400 development and 100 evaluation cases separately afterward. Both partitions are public. If you tune instructions, use development cases and freeze the changes before a separate evaluation run; do not call repeated inspection an unseen holdout.

## 2. Prepare Orlo and the runtime key

Create an Orlo organization or use one where you can manage tasks and comparisons. Save provider keys in **Settings → Keys** and select two available text models. Create a separate Orlo runtime key with:

```text
tasks.read tasks.write datasets.read datasets.write
models.read evaluations.read evaluations.write
```

Load the runtime key into `ORLO_API_KEY` through your normal secret manager. Do not put it in a file you commit or use shell tracing. Set your gateway URL; a local installation may use a different port:

```sh
export ORLO_BASE_URL='https://api.useorlo.com'
# For the local study installation: http://127.0.0.1:4310
: "${ORLO_API_KEY:?Load your Orlo runtime key first}"
RUN_DIR="results/tutorial-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RUN_DIR"
RUN_KEY="support-routing-$(node -e 'console.log(require("node:crypto").randomUUID())')"
printf '%s\n' "$RUN_KEY" > "$RUN_DIR/request-key.txt"
```

Keep that results directory and reuse its request key only when retrying an identical write. A later experiment gets new IDs and a new directory. The examples below were verified against a local Orlo deployment. Hosted installations must provide JSON exact matching and the comparison endpoints used here.

The exact JSON option is selected through the API; the console displays its results. The ordinary comparison form does not yet select this grading mode. No model judge, embedding grader or retrieval is used.

## 3. Create the task, then require release evidence

The supplied task template includes a release policy. Runtime keys cannot set or relax it, so omit that field from this API request and set it as a person afterward:

```sh
jq 'del(.config.release_policy)' orlo-task.json > "$RUN_DIR/task-request.json"
curl --fail-with-body -sS "$ORLO_BASE_URL/v1/tasks" \
  -H "Authorization: Bearer $ORLO_API_KEY" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $RUN_KEY-task" \
  --data-binary "@$RUN_DIR/task-request.json" > "$RUN_DIR/task.json"
TASK_ID=$(jq -er '.id' "$RUN_DIR/task.json")
```

As an owner or admin in the console, open **Tasks → Support routing evaluation → Standard** and inspect the instructions and answer format. Open **Changes → Release policy**, select **Required: only passed configurations**, and save 100 minimum paired examples, 95% confidence and five points allowed score loss. This is a release requirement, not a claim that these provisional examples satisfy it.

Refresh the saved version after that change:

```sh
curl --fail-with-body -sS "$ORLO_BASE_URL/v1/tasks/$TASK_ID" \
  -H "Authorization: Bearer $ORLO_API_KEY" > "$RUN_DIR/task-current.json"
jq -e '.config.release_policy.mode == "required"' "$RUN_DIR/task-current.json"
VERSION_ID=$(jq -er '.current_version.id' "$RUN_DIR/task-current.json")
```

A management principal can instead submit the complete task template where supported. A runtime key must not be used to bypass the person-only policy decision.

## 4. Import the 500 examples

```sh
jq -n --arg task "$TASK_ID" --slurpfile samples orlo-samples.json \
  '{task_id:$task,name:"Support routing 0.3.1",base_dataset_id:null,mode:"replace",samples:$samples[0]}' \
  > "$RUN_DIR/dataset-request.json"
curl --fail-with-body -sS "$ORLO_BASE_URL/v1/datasets" \
  -H "Authorization: Bearer $ORLO_API_KEY" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $RUN_KEY-dataset" \
  --data-binary "@$RUN_DIR/dataset-request.json" > "$RUN_DIR/dataset.json"
DATASET_ID=$(jq -er '.id' "$RUN_DIR/dataset.json")
jq -e '(.redacted_sample_count // 0) == 0' "$RUN_DIR/dataset.json"
```

If a sample was redacted, inspect the change before comparing. In **Standard → Examples → Version history → Inspect examples**, check the input, expected answer, case ID and artifact version. Expected answers, rationales and provenance must stay out of the model prompt. A task's later dataset version does not rewrite this comparison's saved examples.

## 5. Select available models and freeze settings

```sh
curl --fail-with-body -sS "$ORLO_BASE_URL/v1/models" \
  -H "Authorization: Bearer $ORLO_API_KEY" > "$RUN_DIR/models.json"
jq '.models[] | {id,name,provider,availability}' "$RUN_DIR/models.json"
```

Set `BASELINE_MODEL_ID` and `CANDIDATE_MODEL_ID` to two selectable models in your organization. The published studies used GPT-5.4 and Claude Sonnet 4.6 for continuity across two providers, not as a survey of the latest models. Choose models and spending limits appropriate to your account.

```sh
: "${BASELINE_MODEL_ID:?Select a model ID}"
: "${CANDIDATE_MODEL_ID:?Select a different model ID}"
jq --arg task "$TASK_ID" --arg dataset "$DATASET_ID" --arg version "$VERSION_ID" \
  --arg baseline "$BASELINE_MODEL_ID" --arg candidate "$CANDIDATE_MODEL_ID" \
  '. + {task_id:$task,dataset_id:$dataset,candidates:[
    {key:"baseline",model_id:$baseline,task_version_id:$version,include_retrieval_context:false},
    {key:"candidate",model_id:$candidate,task_version_id:$version,include_retrieval_context:false}
  ]} | .budget.max_runtime_minutes=60' orlo-comparison.json > "$RUN_DIR/comparison-request.json"
curl --fail-with-body -sS "$ORLO_BASE_URL/v1/evaluations/check" \
  -H "Authorization: Bearer $ORLO_API_KEY" -H 'Content-Type: application/json' \
  --data-binary "@$RUN_DIR/comparison-request.json" > "$RUN_DIR/preflight.json"
jq . "$RUN_DIR/preflight.json"
jq -e '.ready == true' "$RUN_DIR/preflight.json"
node cli.mjs validate --dataset . > "$RUN_DIR/dataset-identity.json"
shasum -a 256 "$RUN_DIR/comparison-request.json" > "$RUN_DIR/settings.sha256"
```

Preflight checks saved configuration and availability. It does not call the provider or guarantee quota. This request plans 1,000 answers with ceilings of **$5 estimated model cost, 1,000,000 tokens and 60 minutes**. These are stopping limits, not a completion guarantee or a provider invoice cap. Provider outages and quota can still leave an incomplete run.

The comparison has no release test. It uses exact JSON equality with weight one: types, values and extra fields matter; whitespace and key order do not. Save the settings and model names before running. Record returned model IDs, generation settings and usage when available. Do not infer omitted provider settings from zero-valued defaults.

## 6. Run and watch the console

This request makes model calls:

```sh
curl --fail-with-body -sS "$ORLO_BASE_URL/v1/evaluations/run" \
  -H "Authorization: Bearer $ORLO_API_KEY" -H 'Content-Type: application/json' \
  -H "Idempotency-Key: $RUN_KEY-comparison" \
  --data-binary "@$RUN_DIR/comparison-request.json" > "$RUN_DIR/comparison.json"
EVALUATION_ID=$(jq -er '.id' "$RUN_DIR/comparison.json")
```

Open the task's **Changes** tab and select the comparison. The progress card shows completed, failed and remaining work by configuration. A queued or running comparison is not a result. Distinguish failed requests from returned answers that disagree with a reference. If the run stops early, preserve it as incomplete instead of discarding missing answers.

## 7. Inspect disagreements and score every page

When the run finishes, open **By example**. Read the ticket, both answers, the reference and the policy together. Model agreement does not adjudicate a provisional reference.

Collect all pages and score each candidate:

```sh
node collect-orlo.mjs "$EVALUATION_ID" "$RUN_DIR/collected"
cat "$RUN_DIR/collected/collection.json"
node cli.mjs score "$RUN_DIR/collected/candidate-1.json" --dataset . --split development > "$RUN_DIR/development.json"
node cli.mjs score "$RUN_DIR/collected/candidate-1.json" --dataset . --split evaluation > "$RUN_DIR/evaluation.json"
node cli.mjs score "$RUN_DIR/collected/candidate-1.json" --dataset . > "$RUN_DIR/all.json"
```

Repeat for `candidate-2.json`. The collection manifest maps file names to candidates. The collector checks the saved dataset’s 500 inputs, references and artifact identity against the local files. Failed or unattempted answers remain failures, including after an incomplete run. It refuses a different dataset or a comparison made on only one partition.

Compare the whole-answer totals with Orlo. The offline report adds queue metrics, escalation misses and false alarms, priority loss, family averages, slices and paired consistency. Those diagnostics are supplied by this repository; they are not additional native console charts. Always show denominators. Related variants do not justify confidence intervals that assume 500 independent cases.

## 8. Decide what to change

A domain owner should resolve ambiguous policies and review disputed labels. Change instructions or references in a new version, add distinct scenarios around the failure, and declare the next comparison before running it. Keep the original result visible.

Do not convert provisional synthetic references into a production release claim. The required release policy remains in place, and this comparison supplies no passing release-test verdict. The useful outcome is a specific failure or policy decision that your team can investigate and retest.
