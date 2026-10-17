/** Collect every comparison page and preserve missing/failed answers for independent scoring. */
import assert from 'node:assert/strict';
import {writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {load,digest} from './cli.mjs';
const fingerprint=input=>digest(JSON.stringify(Object.entries(input).sort()));
export function collectAnswers(pack,dataset,examples,candidate){
  assert.equal(dataset.samples.length,pack.cases.length,'Use the full dataset version used by this comparison.');
  const samples=new Map(dataset.samples.map(s=>[fingerprint(s.input),s]));
  assert.equal(samples.size,pack.cases.length,'Duplicate dataset input.');
  for(const c of pack.cases){const s=samples.get(fingerprint(c.input));assert.ok(s,`Dataset lacks ${c.id}`);assert.deepEqual(s.expected_output,c.expected_output);assert.equal(s.provenance.artifact_sha256,pack.artifact_sha256,'Dataset artifact differs.');}
  const lookup=new Map();
  for(const e of examples){const k=fingerprint(e.input);assert.ok(samples.has(k),'Unexpected comparison input.');assert.ok(!lookup.has(k),'Duplicate example input.');assert.deepEqual(e.expected_output,samples.get(k).expected_output);lookup.set(k,e);}
  return pack.cases.map(c=>{const r=lookup.get(fingerprint(c.input))?.results.find(r=>r.candidate_id===candidate.id);return{id:c.id,output:r?.grader_scores?.execution?.failed===false?r.output:null};});
}
async function main(){
const [evaluationId,output='results/collected']=process.argv.slice(2);
assert.match(evaluationId??'',/^[a-f0-9-]{36}$/i,'Pass the evaluation ID and an output directory.');
const base=new URL(process.env.ORLO_BASE_URL??'https://api.useorlo.com');
assert.ok(base.protocol==='https:'||(base.protocol==='http:'&&['localhost','127.0.0.1','[::1]'].includes(base.hostname)),'Use HTTPS except for localhost.');
assert.ok(process.env.ORLO_API_KEY,'Set ORLO_API_KEY to your runtime key.');
const pack=await load('.');
const get=async path=>{
  const response=await fetch(new URL('/v1'+path,base),{headers:{authorization:'Bearer '+process.env.ORLO_API_KEY},signal:AbortSignal.timeout(30000),redirect:'error'});
  assert.ok(response.ok,`Request failed: HTTP ${response.status}`);return response.json();
};
const detail=await get(`/evaluations/${evaluationId}`);
assert.ok(!['pending','queued','running'].includes(detail.status),'Wait for a terminal comparison status before collecting.');
assert.ok(Array.isArray(detail.candidates)&&detail.candidates.length,'No comparison candidates.');
const examples=[];let offset=0;
while(true){const page=await get(`/evaluations/${evaluationId}/examples?limit=100&offset=${offset}`);assert.ok(Array.isArray(page.examples)&&Number.isInteger(page.total));examples.push(...page.examples);offset+=page.examples.length;if(offset>=page.total)break;assert.ok(page.examples.length,'Pagination ended before the reported total.');}
const dataset=await get(`/datasets/${detail.dataset_id}`);
const directory=resolve(output);await mkdir(directory,{recursive:true});
const files=[];
for(const [i,candidate]of detail.candidates.entries()){
  const answers=collectAnswers(pack,dataset,examples,candidate);
  const name=`candidate-${i+1}.json`;await writeFile(directory+'/'+name,JSON.stringify(answers,null,2)+'\n',{mode:0o600});files.push({file:name,candidate_key:candidate.candidate_key,model:candidate.model,answers:answers.length});
}
await writeFile(directory+'/collection.json',JSON.stringify({dataset_version:pack.manifest.version,artifact_sha256:pack.artifact_sha256,status:detail.status,candidates:files},null,2)+'\n',{mode:0o600});
console.log(JSON.stringify({directory,status:detail.status,candidates:files},null,2));
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error.message);process.exitCode=1;});
