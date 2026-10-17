/** Seeded-defect and independent grading checks for the portable draft pack. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {load,validate,promptfoo,orloPayloads,root,digest} from './cli.mjs';
import {grade,summarize} from './score.mjs';
const pack=await load();
test('all cases are provisional and related variants stay together',()=>assert.equal(pack.cases.length,20));
test('study manifest preserves frozen files, recorded usage and paired outcomes',async()=>{
  const manifest=JSON.parse(await readFile(root+'support-routing/run-manifest.json','utf8'));
  const study=JSON.parse(await readFile(root+'support-routing/study-results.json','utf8'));
  assert.equal(manifest.artifact_sha256,pack.artifact_sha256);
  assert.deepEqual(manifest.artifact_files,pack.files);
  assert.equal(manifest.comparison_settings.sha256,digest(await readFile(root+'support-routing/comparison-settings.json')));
  assert.equal(manifest.models.reduce((n,m)=>n+m.input_tokens+m.output_tokens,0),study.consumed.tokens_used);
  assert.equal(manifest.models.reduce((n,m)=>n+m.calls,0),40);
  const differences=study.cases.filter(c=>c.answers[0].exact!==c.answers[1].exact);
  assert.equal(differences.length,0);
  assert.deepEqual(study.cases.filter(c=>c.answers.every(a=>a.exact===0)).map(c=>c.id),manifest.observations.shared_reference_disagreements);
  for(const model of manifest.models){
    assert.ok(model.returned_model);const answers=study.cases.map(c=>({id:c.id,output:c.answers.find(a=>a.model===model.requested_model).output}));
    assert.equal(summarize(pack.cases,answers).exact,19);
  }
});
test('public API payloads retain provenance and require an explicit release decision',()=>{
  const p=orloPayloads(pack);assert.equal(p.samples.length,20);assert.equal(p.task.config.release_policy.mode,'required');
  assert.equal(p.comparison.scoring.exact_match_weight,1);assert.equal(p.comparison.config.exact_match_mode,'json');
  assert.equal(p.comparison.release_test.sample_count,20);assert.ok(!Object.hasOwn(p.comparison,'task_id'));
  for(const [i,s]of p.samples.entries()){assert.deepEqual(s.input,pack.cases[i].input);assert.deepEqual(s.expected_output,pack.cases[i].expected_output);assert.equal(s.provenance.artifact_sha256,pack.artifact_sha256);assert.ok(!Object.hasOwn(s.input,'expected_output'));}
});
test('missing labels, duplicate IDs and split leakage fail validation',()=>{
  for(const alter of [c=>delete c[0].expected_output.escalate,c=>c[1].id=c[0].id,c=>c[1].split='regression']){
    const cases=structuredClone(pack.cases);alter(cases);assert.throws(()=>validate(pack.manifest,cases,pack.schema));
  }
});
test('JSON equality ignores presentation but preserves values, types and extra fields',()=>{
  const e=pack.cases[0].expected_output;
  assert.equal(grade(e,JSON.stringify({escalate:false,priority:'normal',queue:'billing'},null,2)).exact,1);
  for(const output of ['```json\n'+JSON.stringify(e)+'\n```',JSON.stringify({...e,queue:'BILLING'}),JSON.stringify({...e,escalate:'false'}),JSON.stringify({...e,extra:true})])assert.equal(grade(e,output).exact,0);
});
test('absent outputs remain failures in the full denominator',()=>{
  const r=summarize(pack.cases,[]);assert.equal(r.planned,20);assert.equal(r.missing,20);assert.equal(r.exact,0);assert.equal(r.escalation_recall,0);
});
test('external assertions grade every reference and reject one mutated field without putting labels in prompts',()=>{
  const config=promptfoo(pack);assert.equal(config.providers.length,0);
  for(const t of config.tests){assert.deepEqual(Object.keys(t.vars),['ticket']);const a=t.assert[0];const run=new Function('output','context',a.value);
    assert.equal(run(JSON.stringify(a.config.expected),{config:a.config}),true);assert.equal(run(JSON.stringify({...a.config.expected,escalate:!a.config.expected.escalate}),{config:a.config}),false);}
});
