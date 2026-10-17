# Walkthrough: evaluate support-ticket routing

Target: 90–120 seconds. Audience: a builder or technical team lead. Use the saved comparison and its original examples; no new model calls are needed for this recording.

## 1. Explain the task

**Screen:** task Standard tab, instructions and three-field output rule.

**Narration:** “We want a model to route a support ticket, choose its priority and decide whether a person needs to step in. Start by writing the policy. A ticket asking for urgency does not get to override it.”

## 2. Inspect the examples

**Screen:** Examples, version history, original dataset v1, one expanded provisional example.

**Narration:** “This starter has twenty fictional tickets across ten scenario families. Each has an expected answer and a recorded origin. These labels are provisional. A person needs to review them before we use them for a real release decision.”

## 3. Explain the grading contract

**Screen:** compared standard or result page showing exact-JSON explanation. Optional separate shot of the API request with credentials omitted entirely.

**Narration:** “Both models get the same policy and examples. We compare the complete JSON answer with the reference. Key order and whitespace do not matter. Wrong values do. No model judge is used. Exact JSON mode is selected through the API in this version of Orlo.”

## 4. Show the recorded result

**Screen:** completed comparison; optional original running-card capture clearly captioned as a capture from the recorded run.

**Narration:** “All forty answers returned. GPT-5.4 and Claude Sonnet 4.6 each matched nineteen out of twenty expected answers. The estimated model cost was about seven cents.”

## 5. Inspect the shared label disagreement

**Screen:** By example, the card whose provenance says `support-008`; ticket, reference and both answers visible.

**Narration:** “Both models disagreed with our label on this API-key rotation question. Our reference says Security; both answered Technical. The policy covers security questions and API how-to questions but does not settle their overlap. We need to clarify that policy and review the label.”

## 6. Show the release decision

**Screen:** More evidence needed verdict and the declared tolerance.

**Narration:** “Neither model matched a reference that the other missed. The result is still inconclusive. Twenty visible examples do not establish that either model is ready for production. Orlo keeps the evidence inspectable and refuses a release that does not meet this task's requirements.”

## 7. Close with the next action

**Screen:** original dataset v1 and version history; end card linking the tutorial and dataset after their public URLs exist.

**Narration:** “Confirm the disputed label with a person. Then improve the instructions or references, add different cases around this boundary, and run a new comparison. Keep the old result. The first value is knowing what needs review and what to test next.”

## Capture rules

- Record only the console and explicitly prepared non-secret request payloads. Never show account tokens, provider-key entry, an environment file or unrelated browser tabs.
- Say nineteen of twenty references matched. Do not present it as production accuracy or confuse it with a confidence level.
- Do not claim the annotation/version simulation was human review or a measured improvement.
- Keep saved-run footage separate from a live run. Do not animate a fake progress bar or substitute invented answers.
- For a continuous recording, capture each action in sequence, keep the original recording, then edit pauses. The current MP4 uses actual screen captures and explicit chapter captions; it is an edited tour, not that continuous original.
