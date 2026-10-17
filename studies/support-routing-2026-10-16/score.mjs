/** Independent, offline grading for the support-routing pilot; no Orlo imports or provider calls. */
import {isDeepStrictEqual} from 'node:util';
export function grade(expected, raw) {
  let actual;
  try { actual=typeof raw==='string'?JSON.parse(raw):raw; } catch { return {exact:0,valid_json:false,fields:{queue:0,priority:0,escalate:0},actual:null}; }
  const valid=actual!==null&&typeof actual==='object'&&!Array.isArray(actual);
  return {exact:Number(valid&&isDeepStrictEqual(actual,expected)),valid_json:valid,
    fields:Object.fromEntries(Object.keys(expected).map(k=>[k,Number(valid&&Object.hasOwn(actual,k)&&isDeepStrictEqual(actual[k],expected[k]))])),actual};
}
export function summarize(cases, answers) {
  const lookup=new Map();
  for(const answer of answers){if(lookup.has(answer.id))throw new Error(`Duplicate answer: ${answer.id}`);lookup.set(answer.id,answer);}
  if(answers.some(a=>!cases.some(c=>c.id===a.id)))throw new Error('An answer does not belong to this dataset.');
  const rows=cases.map(c=>({id:c.id,family_id:c.family_id,split:c.split,missing:!lookup.has(c.id),...grade(c.expected_output,lookup.get(c.id)?.output)}));
  const fields=Object.fromEntries(['queue','priority','escalate'].map(k=>[k,{correct:rows.reduce((n,r)=>n+r.fields[k],0),total:cases.length}]));
  const positive=cases.filter(c=>c.expected_output.escalate);
  const confusion={};
  for(let i=0;i<cases.length;i++){const expected=cases[i].expected_output.priority,actual=rows[i].actual?.priority??'no_answer';confusion[expected]??={};confusion[expected][actual]=(confusion[expected][actual]??0)+1;}
  return {planned:cases.length,missing:rows.filter(r=>r.missing).length,exact:rows.reduce((n,r)=>n+r.exact,0),fields,
    escalation_recall:positive.length?positive.filter(c=>rows.find(r=>r.id===c.id)?.actual?.escalate===true).length/positive.length:null,priority_confusion:confusion,rows};
}
