/** Check published artifact identity, split boundaries, prompt exports and missing-answer behavior. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {load,digest} from './cli.mjs';
import {summarizeDetailed} from './rich-score.mjs';
const directory=fileURLToPath(new URL('./',import.meta.url)),pack=await load(directory);

test('every published file matches its checksum',async()=>{
  const hashes=JSON.parse(await readFile(directory+'checksums.json','utf8'));
  for(const[name,hash]of Object.entries(hashes)){
    assert.ok(!name.startsWith('/')&&!name.split('/').includes('..'));
    assert.equal(digest(await readFile(directory+name)),hash,name);
  }
});
test('500 cases retain family boundaries, policy invariants and honest publication status',()=>{
  assert.equal(pack.cases.length,500);assert.equal(new Set(pack.cases.map(c=>c.family_id)).size,91);
  assert.deepEqual(pack.manifest.splits,{development:400,evaluation:100});
  assert.equal(pack.manifest.status,'public_draft');assert.equal(pack.manifest.review.human_reviewed_cases,0);assert.equal(pack.manifest.grading.release_eligible,false);
  const lookup=new Map(pack.cases.map(c=>[c.id,c]));
  for(const c of pack.cases){
    assert.equal(c.expected_output.escalate,c.expected_output.priority==='urgent'||c.input.prior_contacts>=2);
    if(c.counterfactual){const base=lookup.get(c.counterfactual.base_case_id);assert.ok(base);assert.equal(base.family_id,c.family_id);assert.equal(base.split,c.split);}
  }
});
test('coverage and portable exports identify the same artifact',async()=>{
  const report=JSON.parse(await readFile(directory+'coverage-report.json','utf8'));
  assert.equal(report.artifact_sha256,pack.artifact_sha256);
  const samples=JSON.parse(await readFile(directory+'orlo-samples.json','utf8'));assert.equal(samples.length,500);
  for(const s of samples)assert.equal(s.provenance.artifact_sha256,pack.artifact_sha256);
  const comparison=JSON.parse(await readFile(directory+'orlo-comparison.json','utf8'));assert.equal(comparison.release_test,undefined);
  const external=JSON.parse(await readFile(directory+'promptfoo.json','utf8'));assert.equal(external.tests.length,500);assert.deepEqual(external.providers,[]);
  for(const t of external.tests){assert.deepEqual(Object.keys(t.vars),['ticket']);const a=t.assert[0],run=new Function('output','context',a.value);assert.equal(run(JSON.stringify(a.config.expected),{config:a.config}),true);assert.equal(run('{}',{config:a.config}),false);}
  for(const[split,count]of Object.entries(pack.manifest.splits)){
    const rows=(await readFile(directory+split+'.jsonl','utf8')).trim().split('\n').map(JSON.parse);
    assert.equal(rows.length,count);assert.deepEqual(rows,pack.cases.filter(c=>c.split===split));
  }
});
test('no answers are failures, and reference self-scoring is only a fixture test',()=>{
  const empty=summarizeDetailed(pack.cases,[],pack.rubric);assert.equal(empty.missing,500);assert.equal(empty.exact,0);assert.equal(empty.escalation.false_negative,151);
  const perfect=summarizeDetailed(pack.cases,pack.cases.map(c=>({id:c.id,output:c.expected_output})),pack.rubric);
  assert.equal(perfect.exact,500);assert.equal(perfect.priority.loss.total,0);assert.equal(perfect.families.all_variants_match,91);
});
test('the documented CLI works without dependencies and scores a partition',()=>{
  const run=spawnSync(process.execPath,[directory+'cli.mjs','baseline','--dataset',directory,'--split','evaluation'],{encoding:'utf8',timeout:5000});
  assert.equal(run.status,0,run.stderr);const result=JSON.parse(run.stdout);assert.equal(result.support,100);assert.equal(result.dataset.artifact_sha256,pack.artifact_sha256);assert.equal(result.dataset.partition,'evaluation');
});
