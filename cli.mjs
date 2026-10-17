/** Portable draft-pack validation, deterministic baseline and export. Never executes code from a dataset. */
import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {summarize} from './score.mjs';
export const root=fileURLToPath(new URL('./',import.meta.url));
export const digest=b=>createHash('sha256').update(b).digest('hex');
export async function load(directory=root+'support-routing/'){
  const dir=resolve(directory)+'/';
  const manifest=JSON.parse(await readFile(dir+'dataset.json','utf8'));
  const cases=(await readFile(dir+'cases.jsonl','utf8')).trim().split('\n').map(JSON.parse);
  const schema=JSON.parse(await readFile(dir+'output-schema.json','utf8'));
  const policy=await readFile(dir+'policy.md','utf8');
  const names=manifest.artifact_files??['dataset.json','cases.jsonl','policy.md','output-schema.json'];
  assert.equal(new Set(names).size,names.length,'Duplicate artifact filename');
  for(const name of [...names,...[manifest.scoring,manifest.task_spec].filter(Boolean)])assert.ok(/^[a-z0-9][a-z0-9.-]*\.(json|jsonl|md)$/.test(name),'Artifact filenames must be plain basenames');
  for(const name of ['dataset.json','cases.jsonl','policy.md','output-schema.json',manifest.scoring,manifest.task_spec].filter(Boolean))assert.ok(names.includes(name),'Canonical artifact is missing');
  const files={};for(const name of names)files[name]=digest(await readFile(dir+name));
  const rubric=manifest.scoring?JSON.parse(await readFile(dir+manifest.scoring,'utf8')):null;
  validate(manifest,cases,schema);return {directory:dir,manifest,cases,schema,policy,rubric,files,artifact_sha256:digest(JSON.stringify(files))};
}
export function validate(m,cases,schema){
  assert.equal(m.schema_version,1);assert.equal(m.case_count,cases.length);assert.ok(cases.length>0);
  const ids=new Set(),inputs=new Set(),families=new Map();
  for(const c of cases){
    assert.ok(typeof c.id==='string'&&!ids.has(c.id),'Case IDs must be unique');ids.add(c.id);
    const fingerprint=JSON.stringify(c.input);assert.ok(!inputs.has(fingerprint),'Duplicate ticket');inputs.add(fingerprint);
    assert.ok(typeof c.family_id==='string'&&c.family_id.length>0);
    assert.ok(Object.hasOwn(m.splits,c.split));assert.ok(!families.has(c.family_id)||families.get(c.family_id)===c.split,'Family crosses splits');families.set(c.family_id,c.split);
    assert.deepEqual(Object.keys(c.input).sort(),['body','customer_tier','prior_contacts','subject']);
    assert.ok(typeof c.input.subject==='string'&&typeof c.input.body==='string');assert.ok(Number.isInteger(c.input.prior_contacts)&&c.input.prior_contacts>=0);
    assert.ok(['standard','premium'].includes(c.input.customer_tier));
    assert.deepEqual(Object.keys(c.expected_output).sort(),schema.required.slice().sort(),'Missing or extra expected field');
    for(const [key,field]of Object.entries(schema.properties)){assert.equal(typeof c.expected_output[key],field.type);if(field.enum)assert.ok(field.enum.includes(c.expected_output[key]));}
    assert.ok(c.rationale&&c.review.status==='unreviewed'&&c.review.human_reviews===0,'Draft cannot claim a human review');
    assert.equal(c.provenance.origin,'authored_synthetic');assert.equal(c.provenance.contains_customer_data,false);
  }
  for(const [split,count]of Object.entries(m.splits))assert.equal(cases.filter(c=>c.split===split).length,count);
  assert.equal(m.review.human_reviewed_cases,0);assert.equal(m.grading.release_eligible,false);
  assert.ok(['local_draft','public_draft'].includes(m.status));
  assert.equal(m.review.public_release_allowed,m.status==='public_draft','Publication permission is separate from label review and release qualification');
}
export function promptfoo(pack){
  const assertion='try { const a=typeof output === "string" ? JSON.parse(output) : output; const e=context.config.expected; return a !== null && typeof a === "object" && !Array.isArray(a) && Object.keys(a).length === Object.keys(e).length && Object.keys(e).every(k=>Object.prototype.hasOwnProperty.call(a,k)&&a[k]===e[k]); } catch { return false; }';
  return {description:'Support-routing draft: provisional labels, no release qualification',providers:[],
    prompts:[JSON.stringify([{role:'system',content:pack.policy+'\nReturn JSON matching: '+JSON.stringify(pack.schema)},{role:'user',content:'{{ticket}}'}])],
    tests:pack.cases.map(c=>({description:c.id,vars:{ticket:JSON.stringify(c.input)},assert:[{type:'javascript',value:assertion,config:{expected:c.expected_output}}]}))};
}
/** Offline public-API payloads; no organization identity, key or provider call is needed. */
export function orloPayloads(pack){
  const payloads={
    task:{name:'Support routing evaluation',description:'Fictional support tickets with provisional labels. Development and regression use only.',prompt_template:pack.policy,
      input_schema:{type:'object',required:['subject','body','prior_contacts','customer_tier'],properties:{subject:{type:'string'},body:{type:'string'},prior_contacts:{type:'integer',minimum:0},customer_tier:{type:'string',enum:['standard','premium']}}},output_schema:pack.schema,
      config:{release_policy:{version:1,mode:'required',minimum_samples:100,confidence:.95,max_score_drop:.05}}},
    samples:pack.cases.map(c=>({input:c.input,expected_output:c.expected_output,provenance:{source:'open_eval',artifact_id:pack.manifest.id,artifact_version:pack.manifest.version,artifact_sha256:pack.artifact_sha256,source_case_id:c.id,scenario_family:c.family_id,dataset_purpose:c.split,review_status:c.review.status,origin:c.provenance.origin}})),
    comparison:{release_test:{version:1,method:'paired_fixed',baseline_candidate_key:'baseline',sample_count:pack.cases.length,confidence:.95,max_score_drop:.05},scoring:{schema_weight:0,semantic_weight:0,judge_weight:0,state_change_weight:0,exact_match_weight:1},config:{exact_match:true,exact_match_mode:'json',early_stopping:false,include_retrieval_context:false},budget:{max_cost_usd:1,max_tokens:100000,max_runtime_minutes:10}}
  };
  if(pack.manifest.execution?.release_test_in_export===false){
    delete payloads.comparison.release_test;
    payloads.task.description='Fictional support tickets with provisional labels. Visible development and evaluation partitions; no release qualification.';
    // Conservative spend caps, not a prediction or a guarantee of completing every candidate.
    payloads.comparison.budget={max_cost_usd:5,max_tokens:1000000,max_runtime_minutes:30};
  }
  return payloads;
}
export const csv=rows=>rows.map(row=>row.map(value=>'"'+String(value??'').replaceAll('"','""')+'"').join(',')).join('\n')+'\n';
/** Flat, language-independent exports with labels kept outside the task input. */
export function flatCases(pack){
  const header=['id','family_id','split','subject','body','prior_contacts','customer_tier','queue','priority','escalate','scenario_tags','rationale','review_status'];
  return csv([header,...pack.cases.map(c=>[c.id,c.family_id,c.split,c.input.subject,c.input.body,c.input.prior_contacts,c.input.customer_tier,c.expected_output.queue,c.expected_output.priority,c.expected_output.escalate,(c.scenario_tags??[]).join('|'),c.rationale,c.review.status])]);
}
async function main(){
  const args=process.argv.slice(2),flag=args.indexOf('--dataset');
  let directory;
  if(flag!==-1){assert.ok(args[flag+1]&&!args[flag+1].startsWith('--'),'Pass a directory after --dataset');directory=args[flag+1];args.splice(flag,2);}
  const command=args[0]??'validate',pack=await load(directory);
  const splitFlag=args.indexOf('--split');let split;
  if(splitFlag!==-1){split=args[splitFlag+1];assert.ok(Object.hasOwn(pack.manifest.splits,split),'Choose a declared split');assert.ok(['score','baseline'].includes(command),'--split is for score and baseline');args.splice(splitFlag,2);}
  const summarizePack=pack.rubric?(await import('./rich-score.mjs')).summarizeDetailed:summarize;
  const score=answers=>{
    const ids=new Set(pack.cases.map(c=>c.id)),seen=new Set();
    for(const a of answers){assert.ok(ids.has(a.id),'An answer does not belong to this dataset.');assert.ok(!seen.has(a.id),'Duplicate answer');seen.add(a.id);}
    const cases=split?pack.cases.filter(c=>c.split===split):pack.cases,selected=new Set(cases.map(c=>c.id));
    const result=summarizePack(cases,answers.filter(a=>selected.has(a.id)),pack.rubric);
    return pack.rubric?{dataset:{id:pack.manifest.id,version:pack.manifest.version,artifact_sha256:pack.artifact_sha256,partition:split??'all'},...result}:result;
  };
  if(command==='validate'){console.log(JSON.stringify({valid:true,cases:pack.cases.length,families:new Set(pack.cases.map(c=>c.family_id)).size,artifact_sha256:pack.artifact_sha256}));return;}
  if(command==='baseline'){console.log(JSON.stringify(score(pack.cases.map(c=>({id:c.id,output:JSON.stringify({queue:'general',priority:'normal',escalate:false})}))),null,2));return;}
  if(command==='score'){assert.ok(args[1],'Pass a JSON array of {id,output} answers.');console.log(JSON.stringify(score(JSON.parse(await readFile(args[1],'utf8'))),null,2));return;}
  if(command==='export'){
    assert.ok(/^\d+\.\d+\.\d+$/.test(pack.manifest.version),'Invalid export version');
    const out=join(root,'dist','support-routing-'+pack.manifest.version)+'/';await mkdir(out,{recursive:true});
    for(const name of Object.keys(pack.files))await copyFile(pack.directory+name,out+name);
    await writeFile(out+'promptfoo.json',JSON.stringify(promptfoo(pack),null,2)+'\n');
    const files={...pack.files,'promptfoo.json':digest(await readFile(out+'promptfoo.json'))};
    for(const[name,payload]of Object.entries(orloPayloads(pack))){const file=`orlo-${name}.json`;await writeFile(out+file,JSON.stringify(payload,null,2)+'\n');files[file]=digest(await readFile(out+file));}
    if(pack.rubric){
      await writeFile(out+'cases.csv',flatCases(pack));
      await writeFile(out+'review-worksheet.csv',csv([['id','family_id','split','proposed_queue','proposed_priority','proposed_escalate','reviewer','decision','reviewed_queue','reviewed_priority','reviewed_escalate','policy_gap','notes'],...pack.cases.map(c=>[c.id,c.family_id,c.split,c.expected_output.queue,c.expected_output.priority,c.expected_output.escalate,'','','','','','',''])]));
      for(const name of ['cases.csv','review-worksheet.csv'])files[name]=digest(await readFile(out+name));
      for(const name of ['cli.mjs','score.mjs','rich-score.mjs']){await copyFile(root+name,out+name);files[name]=digest(await readFile(out+name));}
      for(const name of ['README.md','dataset-card.md','SCORING.md','CHANGELOG.md','coverage-report.json']){await copyFile(pack.directory+name,out+name);files[name]=digest(await readFile(out+name));}
      for(const split of Object.keys(pack.manifest.splits)){
        assert.ok(/^[a-z]+$/.test(split),'Invalid split name');
        const name=split+'.jsonl';await writeFile(out+name,pack.cases.filter(c=>c.split===split).map(c=>JSON.stringify(c)).join('\n')+'\n');files[name]=digest(await readFile(out+name));
      }
    }
    await writeFile(out+'checksums.json',JSON.stringify(files,null,2)+'\n');
    console.log(JSON.stringify({directory:out,artifact_sha256:pack.artifact_sha256,note:'Review generated assertions and select an explicit provider before running the external harness.'}));return;
  }
  throw new Error('Use validate, baseline, score <answers.json>, or export; optionally --dataset <directory>. Score/baseline also accept --split <name>.');
}
if(process.argv[1]===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
