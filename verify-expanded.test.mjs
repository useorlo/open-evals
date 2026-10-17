/** Verify the separately published 500-case study without contacting Orlo or any model provider. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {load,digest} from './cli.mjs';
import {summarizeDetailed} from './rich-score.mjs';
const directory=fileURLToPath(new URL('./',import.meta.url));
const pack=await load(directory);
const study=directory+'studies/support-routing-2026-10-17/';
const json=async name=>JSON.parse(await readFile(study+name,'utf8'));
test('expanded study preserves its frozen plan and recorded usage totals',async()=>{
  const m=await json('run-manifest.json'),p=await json('plan.json');
  assert.equal(m.dataset.artifact_sha256,pack.artifact_sha256);assert.deepEqual(m.dataset.files,pack.files);
  assert.equal(digest(JSON.stringify(p)),m.plan_sha256);assert.ok(new Date(p.frozen_at)<=new Date(m.execution.started_at));
  assert.equal(m.execution.saved_answers,1000);assert.equal(m.execution.native_grades_verified,1000);
  assert.equal(m.ledger.reduce((n,r)=>n+r.calls,0),1000);assert.equal(m.ledger.reduce((n,r)=>n+r.input_tokens+r.output_tokens,0),m.usage.reported_tokens);
  assert.equal(m.review.independent_human_reviews,0);assert.equal(m.review.production_release_created,false);
});
test('both models replay all three published score reports from saved answers',async()=>{
  const manifest=await json('run-manifest.json');
  for(const model of manifest.models){
    const answers=await json(model.answers_file),scores=await json(model.scores_file);assert.equal(answers.length,500);
    for(const split of ['development','evaluation','all']){
      const cases=split==='all'?pack.cases:pack.cases.filter(c=>c.split===split),ids=new Set(cases.map(c=>c.id));
      assert.deepEqual(summarizeDetailed(cases,answers.filter(a=>ids.has(a.id)),pack.rubric),scores[split]);
    }
    assert.equal(scores.all.exact,model.whole_answer_matches);assert.equal(scores.evaluation.exact,model.evaluation_matches);
  }
});
