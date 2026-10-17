/** Re-score the archived pilot without a model call; fail if any saved grade or artifact differs. */
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {load,digest} from './cli.mjs';
import {grade,summarize} from './score.mjs';
const dir=fileURLToPath(new URL('./studies/support-routing-2026-10-16/support-routing/',import.meta.url));
const pack=await load(dir),study=JSON.parse(await readFile(dir+'study-results.json','utf8'));
const manifest=JSON.parse(await readFile(dir+'run-manifest.json','utf8'));
assert.equal(pack.artifact_sha256,manifest.artifact_sha256);assert.equal(study.artifact_sha256,pack.artifact_sha256);
assert.deepEqual(pack.files,manifest.artifact_files);
assert.equal(digest(await readFile(dir+'comparison-settings.json')),manifest.comparison_settings.sha256);
const results=study.models.map(({model,whole_answer_matches})=>{
  const answers=pack.cases.map(c=>{
    const row=study.cases.find(x=>x.id===c.id);assert.ok(row);assert.deepEqual(row.input,c.input);assert.deepEqual(row.expected_output,c.expected_output);
    const answer=row.answers.find(a=>a.model===model);assert.ok(answer);
    assert.equal(grade(c.expected_output,answer.output).exact,answer.exact);
    return{id:c.id,output:answer.output};
  });
  const result=summarize(pack.cases,answers);assert.equal(result.exact,whole_answer_matches);
  return{model,matches:result.exact,cases:result.planned};
});
console.log(JSON.stringify({dataset_version:pack.manifest.version,artifact_sha256:pack.artifact_sha256,model_calls:0,saved_answers_verified:40,results},null,2));
