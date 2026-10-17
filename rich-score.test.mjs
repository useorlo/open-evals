/** Hand-counted scoring checks, including malformed answers, asymmetric losses and correlated families. */
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {summarizeDetailed} from './rich-score.mjs';
const rubric=JSON.parse(await readFile(new URL('./scoring.json',import.meta.url),'utf8'));
const example=(id,queue,priority,escalate,family='f1')=>({id,family_id:family,split:'development',input:{subject:id,body:id,customer_tier:'standard',prior_contacts:0},expected_output:{queue,priority,escalate},scenario_tags:['fixture']});
const answers=cases=>cases.map(c=>({id:c.id,output:c.expected_output}));

test('seeded defects produce hand-counted confusion, escalation and severity totals',()=>{
  const cases=[example('a','security','urgent',true),example('b','billing','normal',false),example('c','account_access','high',false),example('d','technical','normal',true),example('e','general','normal',false,'f2'),example('f','technical','high',true,'f2')];
  const outputs=[{id:'a',output:{queue:'general',priority:'normal',escalate:false}},{id:'b',output:{queue:'billing',priority:'urgent',escalate:true}},{id:'d',output:cases[3].expected_output},{id:'e',output:{...cases[4].expected_output,extra:'invalid'}},{id:'f',output:{queue:'technical',priority:'urgent',escalate:true}}];
  const s=summarizeDetailed(cases,outputs,rubric);
  assert.equal(s.support,6);assert.equal(s.exact,1);assert.equal(s.schema_valid,4);assert.equal(s.invalid,2);assert.equal(s.missing,1);
  assert.deepEqual(s.priority.loss,{unit:'relative_error_points',total:28,mean:28/6,maximum:48,normalized:28/48});
  assert.equal(s.priority.under_prioritized,1);assert.equal(s.priority.over_prioritized,2);
  assert.equal(s.queue.macro_f1,.4);assert.equal(s.queue.weighted_f1,.5);
  assert.equal(s.queue.confusion.account_access.invalid,1);assert.equal(s.queue.confusion.security.general,1);
  assert.equal(s.escalation.true_positive,2);assert.equal(s.escalation.false_positive,1);assert.equal(s.escalation.false_negative,1);assert.equal(s.escalation.invalid_negative,2);
  assert.equal(s.escalation.recall,2/3);assert.equal(s.escalation.precision,2/3);assert.equal(s.escalation.f1,2/3);assert.equal(s.escalation.specificity,0);
  assert.deepEqual(s.escalation.missed_ids,['a']);assert.deepEqual(s.escalation.unnecessary_ids,['b']);assert.equal(s.escalation.missed_urgent,1);
  assert.equal(s.families.macro_exact_rate,.125);assert.equal(s.families.all_variants_match_rate,0);
  assert.equal(s.slices.tag.fixture.support,6);assert.equal(s.slices.tag.fixture.small_support,true);
});
test('no evidence stays in full denominators and undefined ratios are null',()=>{
  const c=[example('a','billing','normal',false)];
  const missing=summarizeDetailed(c,[],rubric);assert.equal(missing.exact_rate,0);assert.equal(missing.priority.loss.total,8);assert.equal(missing.escalation.precision,null);assert.equal(missing.escalation.recall,null);assert.equal(missing.escalation.f1,null);assert.equal(missing.escalation.specificity,0);
  const perfect=summarizeDetailed(c,answers(c),rubric);assert.equal(perfect.queue.per_class.security.f1,null);assert.equal(perfect.queue.per_class.billing.f1,1);assert.equal(perfect.queue.macro_f1,1);assert.equal(perfect.escalation.specificity,1);
});
test('all malformed output forms lose classification credit but diagnostics remain separate',()=>{
  const c=[example('a','billing','normal',false)];
  for(const output of ['no JSON','```json\n{}\n```',null,[],{},12,{queue:'billing',priority:'normal',escalate:'false'},{...c[0].expected_output,extra:true}]){
    const s=summarizeDetailed(c,[{id:'a',output}],rubric);assert.equal(s.schema_valid,0);assert.equal(s.exact,0);assert.equal(s.queue.confusion.billing.invalid,1);assert.equal(s.priority.loss.total,8);
  }
  const s=summarizeDetailed(c,[{id:'a',output:{...c[0].expected_output,extra:true}}],rubric);
  assert.equal(s.field_matches_diagnostic.queue.correct,1);assert.equal(s.queue.per_class.billing.true_positive,0);
});
test('counterfactual consistency cannot be mistaken for correctness',()=>{
  const c=[example('base','billing','normal',false),example('tier','billing','normal',false),example('repeat','billing','normal',true)];
  c[1].counterfactual={base_case_id:'base',relation:'same_answer'};c[2].counterfactual={base_case_id:'base',relation:'escalation_boundary'};
  const s=summarizeDetailed(c,c.map(x=>({id:x.id,output:{...x.expected_output,queue:'general'}})),rubric);
  for(const relation of Object.values(s.counterfactuals)){assert.equal(relation.consistency_rate,1);assert.equal(relation.both_match_reference_rate,0);}
  const absent=summarizeDetailed(c,[],rubric);assert.equal(absent.counterfactuals.same_answer.consistency_rate,0);assert.equal(absent.counterfactuals.escalation_boundary.invalid_pairs,1);
});
test('duplicate IDs, unknown answers, invalid references and invalid severity weights fail',()=>{
  const c=[example('a','billing','normal',false)];
  assert.throws(()=>summarizeDetailed(c,[...answers(c),...answers(c)],rubric),/Duplicate answer/);
  assert.throws(()=>summarizeDetailed(c,[{id:'unknown',output:{}}],rubric),/does not belong/);
  assert.throws(()=>summarizeDetailed([...c,...c],[],rubric),/Duplicate case/);
  assert.throws(()=>summarizeDetailed([example('a','unknown','normal',false)],[],rubric),/Invalid reference/);
  const bad=structuredClone(rubric);bad.priority_loss.matrix.urgent.normal=-1;
  assert.throws(()=>summarizeDetailed(c,[],bad),/Invalid priority loss/);
});
