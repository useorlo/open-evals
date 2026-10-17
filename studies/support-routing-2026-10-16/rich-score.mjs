/** Offline, descriptive scoring for related routing cases; never treats variants as independent trials. */
import assert from 'node:assert/strict';
import {isDeepStrictEqual} from 'node:util';
import {summarize} from './score.mjs';

const ratio=(n,d)=>d?n/d:null;
const count=(rows,predicate)=>rows.filter(predicate).length;
const mean=values=>values.length?values.reduce((a,b)=>a+b,0)/values.length:null;
const aggregate=rows=>({support:rows.length,exact:count(rows,r=>r.exact===1),exact_rate:ratio(count(rows,r=>r.exact===1),rows.length),schema_valid:count(rows,r=>r.schema_valid)});

/** Invalid answers receive no classification credit, even if some fields happen to match. */
export function summarizeDetailed(cases,answers,rubric){
  assert.ok(cases.length,'At least one case is required.');
  assert.equal(rubric.version,1);
  assert.equal(new Set(cases.map(c=>c.id)).size,cases.length,'Duplicate case ID');
  const queues=rubric.queue_labels,priorities=rubric.priority_labels;
  const cap=rubric.priority_loss.maximum_per_case;
  assert.ok(Number.isFinite(cap)&&cap>0);
  for(const p of priorities)for(const q of priorities){
    const loss=rubric.priority_loss.matrix[p]?.[q];
    assert.ok(Number.isFinite(loss)&&loss>=0&&loss<=cap,'Invalid priority loss');
  }
  assert.ok(Number.isFinite(rubric.priority_loss.invalid_answer)&&rubric.priority_loss.invalid_answer>=0&&rubric.priority_loss.invalid_answer<=cap);
  const valid=a=>a!==null&&typeof a==='object'&&!Array.isArray(a)&&isDeepStrictEqual(Object.keys(a).sort(),['escalate','priority','queue'])&&queues.includes(a.queue)&&priorities.includes(a.priority)&&typeof a.escalate==='boolean';
  for(const c of cases)assert.ok(valid(c.expected_output),`Invalid reference: ${c.id}`);
  const base=summarize(cases,answers);
  const rows=base.rows.map((r,i)=>({...r,schema_valid:valid(r.actual),expected:cases[i].expected_output}));
  const queueConfusion=Object.fromEntries(queues.map(q=>[q,Object.fromEntries([...queues,'invalid'].map(p=>[p,0]))]));
  const priorityConfusion=Object.fromEntries(priorities.map(q=>[q,Object.fromEntries([...priorities,'invalid'].map(p=>[p,0]))]));
  let loss=0,under=0,over=0,tp=0,fp=0,tn=0,fn=0,invalidNegative=0;
  for(const r of rows){
    queueConfusion[r.expected.queue][r.schema_valid?r.actual.queue:'invalid']++;
    priorityConfusion[r.expected.priority][r.schema_valid?r.actual.priority:'invalid']++;
    loss+=r.schema_valid?rubric.priority_loss.matrix[r.expected.priority][r.actual.priority]:rubric.priority_loss.invalid_answer;
    if(r.schema_valid){
      const delta=priorities.indexOf(r.actual.priority)-priorities.indexOf(r.expected.priority);
      under+=Number(delta<0);over+=Number(delta>0);
      if(r.expected.escalate){if(r.actual.escalate)tp++;else fn++;}
      else if(r.actual.escalate)fp++;else tn++;
    }else if(r.expected.escalate)fn++;else invalidNegative++;
  }
  const perClass=Object.fromEntries(queues.map(q=>{
    const support=count(rows,r=>r.expected.queue===q),predicted=count(rows,r=>r.schema_valid&&r.actual.queue===q);
    const truePositive=count(rows,r=>r.schema_valid&&r.expected.queue===q&&r.actual.queue===q);
    return [q,{support,predicted,true_positive:truePositive,false_positive:predicted-truePositive,false_negative:support-truePositive,precision:ratio(truePositive,predicted),recall:ratio(truePositive,support),f1:ratio(2*truePositive,support+predicted)}];
  }));
  const slices={};
  function slice(dimension,key,row){
    slices[dimension]??=new Map();
    const group=slices[dimension].get(String(key))??[];group.push(row);slices[dimension].set(String(key),group);
  }
  cases.forEach((c,i)=>{
    for(const[d,key]of Object.entries({split:c.split,queue:c.expected_output.queue,priority:c.expected_output.priority,customer_tier:c.input.customer_tier,prior_contacts:c.input.prior_contacts>=2?'2_or_more':String(c.input.prior_contacts),family:c.family_id}))slice(d,key,rows[i]);
    for(const tag of new Set(c.scenario_tags??[]))slice('tag',tag,rows[i]);
  });
  const breakdown=Object.fromEntries(Object.entries(slices).map(([dimension,groups])=>[dimension,Object.fromEntries([...groups].sort(([a],[b])=>a.localeCompare(b)).map(([key,group])=>[key,{...aggregate(group),small_support:group.length<rubric.small_slice_support}]))]));
  const familyScores=Object.values(breakdown.family);
  const rowLookup=new Map(rows.map(r=>[r.id,r]));
  const counterfactuals=cases.filter(c=>c.counterfactual).map(c=>{
    const cf=c.counterfactual,a=rowLookup.get(cf.base_case_id),b=rowLookup.get(c.id);
    assert.ok(a&&a.family_id===b.family_id&&a.split===b.split,`Invalid counterfactual base: ${c.id}`);
    const bothValid=a.schema_valid&&b.schema_valid;
    // Consistency alone can reward two identical wrong answers; report correctness separately.
    const consistent=bothValid&&(cf.relation==='same_answer'?isDeepStrictEqual(a.actual,b.actual):
      a.actual.queue===b.actual.queue&&a.actual.priority===b.actual.priority&&a.actual.escalate===a.expected.escalate&&b.actual.escalate===b.expected.escalate);
    return {id:c.id,base_case_id:a.id,relation:cf.relation,valid_pair:bothValid,consistent,both_match_reference:a.exact===1&&b.exact===1};
  });
  const relationSummary=Object.fromEntries([...new Set(counterfactuals.map(c=>c.relation))].map(relation=>{
    const pairs=counterfactuals.filter(c=>c.relation===relation),consistent=count(pairs,p=>p.consistent),correct=count(pairs,p=>p.both_match_reference);
    return [relation,{pairs:pairs.length,invalid_pairs:count(pairs,p=>!p.valid_pair),consistent,consistency_rate:ratio(consistent,pairs.length),both_match_reference:correct,both_match_reference_rate:ratio(correct,pairs.length)}];
  }));
  const missed=rows.filter(r=>r.expected.escalate&&(!r.schema_valid||!r.actual.escalate));
  return {
    scoring_version:rubric.version,interpretation:rubric.interpretation,uncertainty:rubric.uncertainty,
    ...aggregate(rows),missing:base.missing,invalid:count(rows,r=>!r.schema_valid),schema_valid_rate:ratio(count(rows,r=>r.schema_valid),rows.length),
    field_matches_diagnostic:base.fields,
    queue:{confusion:queueConfusion,per_class:perClass,macro_f1:mean(Object.values(perClass).map(c=>c.f1).filter(v=>v!==null)),weighted_f1:Object.values(perClass).reduce((n,c)=>n+(c.f1??0)*c.support,0)/rows.length},
    priority:{confusion:priorityConfusion,under_prioritized:under,over_prioritized:over,under_rate:under/rows.length,over_rate:over/rows.length,invalid:count(rows,r=>!r.schema_valid),loss:{unit:rubric.priority_loss.unit,total:loss,mean:loss/rows.length,maximum:cap*rows.length,normalized:loss/(cap*rows.length)}},
    escalation:{positive_references:tp+fn,negative_references:tn+fp+invalidNegative,true_positive:tp,false_positive:fp,true_negative:tn,false_negative:fn,invalid_negative:invalidNegative,precision:ratio(tp,tp+fp),recall:ratio(tp,tp+fn),f1:ratio(2*tp,2*tp+fp+fn),false_alarm_rate:ratio(fp,tn+fp+invalidNegative),specificity:ratio(tn,tn+fp+invalidNegative),missed_ids:missed.map(r=>r.id),missed_urgent:count(missed,r=>r.expected.priority==='urgent'),unnecessary_ids:rows.filter(r=>r.schema_valid&&!r.expected.escalate&&r.actual.escalate).map(r=>r.id)},
    families:{count:familyScores.length,macro_exact_rate:mean(familyScores.map(f=>f.exact_rate)),all_variants_match:count(familyScores,f=>f.exact===f.support),all_variants_match_rate:ratio(count(familyScores,f=>f.exact===f.support),familyScores.length)},
    counterfactuals:relationSummary,slices:breakdown,
    rows:rows.map(({actual,...r})=>({...r,priority_loss:r.schema_valid?rubric.priority_loss.matrix[r.expected.priority][actual.priority]:rubric.priority_loss.invalid_answer}))
  };
}
