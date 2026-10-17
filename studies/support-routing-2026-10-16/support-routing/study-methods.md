# How was the support-routing pilot run?

The pilot made one comparison on 16 October 2026, with one saved answer per ticket per model. The local provider-call ledger records exactly 20 successful calls for each model, with no failed or additional calls for this comparison. The public [run manifest](run-manifest.json) records identifiers, parameters, usage and content hashes; [comparison settings](comparison-settings.json) preserve the normalized experiment configuration.

## Models and parameters

| Item | OpenAI | Anthropic |
|---|---|---|
| Requested model | `gpt-5.4` | `claude-sonnet-4-6` |
| Provider-returned model | `gpt-5.4-2026-03-05` | `claude-sonnet-4-6` |
| Output budget | `max_completion_tokens: 4096` | `max_tokens: 4096` |
| Temperature | Not sent; provider default | `0` |
| Reasoning/thinking setting | No `reasoning_effort` sent | No thinking or effort setting sent |
| Seed | Not sent | Not sent |
| Input tokens | 10,057 | 11,154 |
| Output tokens | 363 | 346 |
| Successful calls | 20 | 20 |

The returned model identifiers, call counts and token counts come from saved provider-call records. Parameters are reconstructed from the caller and compatibility logic used for this pilot; the full outbound requests were not archived. Omitted settings must not be read as zero or as a measured provider default. Temperature zero also does not guarantee identical fresh generations.

Anthropic documents `claude-sonnet-4-6` as a fixed model identifier despite its dateless spelling. A missing date suffix is not, by itself, evidence of an unpinned Claude model. Serving behavior can still vary. [Anthropic model versioning](https://platform.claude.com/docs/en/about-claude/models/model-ids-and-versions)

These models were selected from the available direct-provider connections for a local workflow pilot. They were not selected to represent the latest generation. This historical result should stay dated; a current-model comparison would be a separate study with its own reviewed dataset and settings.

## What was fixed, and what is recorded afterward?

The original manifest, policy, cases and output schema match the bytes in local commit `b695b7bf0be7af54650f4bd19dacc32cc1adfd6b`, recorded at 14:21:06 Pacific on 16 October. The comparison started at 14:25:21 Pacific. Their aggregate artifact SHA-256 is:

```text
72536835ab5c4ae92ffe7dd5493de629069a0968f8fff42d1c9cdb714c70acce
```

Run `node cli.mjs validate` from the starter root to reproduce that artifact hash. The run manifest lists individual file hashes. The saved task version has the same policy and schema, and the imported examples carry this artifact identity.

The comparison recorded its grading, candidate specification hashes and release-test settings when queued. The public settings file removes private record IDs and was assembled and hashed on 17 October from that saved request. These records support the identity of the experiment; they are not an independently timestamped public preregistration. We do not claim the settings hash was published before the run.

## Scoring and release settings

The exact JSON grade has weight one; schema, semantic, judge and state-change weights are zero. Required output validation still runs. Retrieval and early stopping were disabled. No model judge or embedding grader was used. The same policy and output schema were saved for both candidates. The model input contains ticket data; references and provenance are excluded from it.

The paired fixed-sample comparison used OpenAI as the baseline, 20 pairs, a 95% confidence setting and a permitted score decrease of 0.05 on the zero-to-one scale. It returned zero observed difference and bounds of approximately -60.7 to +60.7 percentage points. Both models matched the same 19 references and differed from the same one. There were no discordant correctness outcomes, so this run supplied no observed model advantage. That is not a formal statement of zero statistical power or proof of equivalence.

The confidence level describes the statistical procedure. It is not the observed fraction of matching answers. The cases are related, deliberately authored examples rather than a random sample of production tickets; the bounds must not be presented as a production-accuracy claim.

The separate task release policy required at least 100 examples. Both attempted releases were refused. Raising the row count with near-duplicates would not establish representative coverage.

## Cost and reproducibility limits

The 21,920 reported tokens cover both models combined. The recorded cost estimate is retained at its original precision in the machine-readable manifest; reader-facing material rounds it to about $0.07. No provider invoice was checked, and omitted usage categories cannot be reconstructed from this record.

Independent scoring reproduces all 40 grades from the saved answers. We also tested the exported assertion functions, but did not verify the export inside promptfoo. Its configuration uses the same policy and scoring contract; it is not a byte-identical replay of Orlo's complete provider requests. A fresh provider run can produce different answers even with the same model identifier and settings.

## Separate version-workflow simulation

After the comparison, a separate simulation saved the disputed answer as an agent step, annotated its trace sample and added it to a new dataset version. Trying to add it against an outdated dataset version was refused. Repeating the successful addition did not create another copy. The original 20-case version remained unchanged.

The added item was a replay of an existing answer, not new independent evidence or a human correction. Its annotation records that no human review occurred. This simulation checks the versioning workflow; it supplies no evidence of improved model performance.
