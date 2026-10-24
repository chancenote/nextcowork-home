import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const root = new URL('../', import.meta.url);
const main = await readFile(new URL('js/main.js', root), 'utf8');
const html = await readFile(new URL('contact/index.html', root), 'utf8');
const landing = await readFile(new URL('ai-campus/ceo-ax-workshop/index.html', root), 'utf8');
const campus = await readFile(new URL('ai-campus/index.html', root), 'utf8');
let checks = 0;
function ok(value, message) { assert.ok(value, message); checks++; }
class Element {
  constructor(id, attrs = {}) { this.id=id; this.attrs=attrs; this.value=attrs.value || ''; this.options=[]; this.listeners={}; this.hidden=false; this.disabled=false; this.required=false; }
  getAttribute(k) { return this.attrs[k] ?? null; }
  setAttribute(k,v) { this.attrs[k]=v; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(k,fn) { (this.listeners[k] ||= []).push(fn); }
  appendChild(el) { this.options.push(el); if(this.options.length===1)this.value=el.value; }
  set innerHTML(v) { this.markup=v; if(this.id==='cf-tier') this.options=[]; }
  get innerHTML() { return this.markup || ''; }
  get selectedIndex() { return this.options.findIndex(o=>o.value===this.value); }
  querySelector(q) {
    const m=q.match(/option\[data-([st])="([^"]*)"\]/);
    if(m)return this.options.find(o=>o.getAttribute('data-'+m[1])===m[2]);
    return null;
  }
  querySelectorAll() { return []; }
  scrollIntoView() {}
  focus() {}
  checkValidity() { return true; }
}
function harness(search='?s=ai-campus&t=ceo-ax-workshop&cta=workshop_hero&source_page=/ai-campus/ceo-ax-workshop/') {
  const elements={}; const ids=[...html.matchAll(/\bid="(cf-[^"]+)"/g)].map(m=>m[1]);
  for(const id of [...ids,'contact-crumb']) elements[id]=new Element(id);
  const svc=elements['cf-service'],tier=elements['cf-tier'];
  svc.options=[['general','일반 문의'],['ai-campus','AI Campus 기업 AI 교육'],['flexoffice','FlexOffice 컨설팅'],['public','Public Advisory 공공 자문'],['coaching','CEO AI 코칭']].map(([k,v])=>new Element('',{'data-s':k,value:v}));
  svc.value=svc.options[0].value;
  const fields=elements['cf-workshop-fields'];
  const required=['cf-workshop-industry','cf-workshop-role','cf-workshop-experience'];
  fields.querySelectorAll=()=>required.map(id=>elements[id]);
  const optional=elements['cf-project-details'];
  optional.querySelectorAll=()=>['cf-org-type','cf-budget','cf-timeline'].map(id=>elements[id]);
  const names={};
  for(const m of html.matchAll(/<(?:input|textarea|select)\b[^>]*\bid="([^"]+)"[^>]*\bname="([^"]+)"[^>]*>/g)) names[m[1]]=m[2];
  const form=new Element('contact-form',{'data-endpoint':'https://hook.us1.make.com/test-mocked'});
  elements['contact-form']=form;form.valid=true;
  form.checkValidity=()=>form.valid;form.reportValidity=()=>{};
  form.reset=()=>{for(const id of Object.keys(names))elements[id].value='';svc.value=svc.options[0].value;};
  const events=[],posts=[],copies=[]; let nextResponse={status:'saved',inquiry_id:'TEST-001'},seq=0;
  class FormDataMock extends Map {
    constructor(){super();for(const [id,name] of Object.entries(names)){
      const el=elements[id];if(el.disabled || (name.startsWith('workshop_')&&fields.disabled))continue;
      this.set(name,el.value);
    }}
  }
  const sandbox={document:{getElementById:id=>elements[id],createElement:()=>new Element(''),referrer:'https://www.nextcw.com/ai-campus/ceo-ax-workshop/'},
    window:{location:{origin:'https://www.nextcw.com',pathname:'/contact/',search,href:'https://www.nextcw.com/contact/'+search},sessionStorage:{getItem:()=>null,setItem:()=>{},removeItem:()=>{}},crypto:{randomUUID:()=>`key-${++seq}`}},
    URL,URLSearchParams,FormData:FormDataMock,track:(event,params)=>events.push({event,params}),honeypotFilled:()=>false,markElapsed:()=>{},
    navigator:{clipboard:{writeText:async text=>copies.push(text)}},setTimeout:()=>1,clearTimeout:()=>{},AbortController,
    fetch:async (url,opts)=>{posts.push({url,opts});if(nextResponse instanceof Error)throw nextResponse;return {ok:nextResponse.httpOk!==false,status:nextResponse.httpOk===false?500:200,text:async()=>JSON.stringify(nextResponse)};},location:{}};
  runInNewContext(main.slice(main.indexOf('  function searchParam('), main.indexOf('  /* Conversion link tracking')),sandbox);
  runInNewContext(main.slice(main.indexOf('  /* Contact form'),main.indexOf('  /* Newsletter forms')),sandbox);
  const dispatch=(el,type)=>{for(const fn of el.listeners[type]||[])fn({preventDefault(){},target:el});};
  const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
  return {elements,svc,tier,fields,events,posts,copies,form,dispatch,flush,response:r=>{nextResponse=r;}};
}
const h=harness(); const e=h.elements;
ok(!h.fields.hidden&&!h.fields.disabled,'workshop deep link enables fields');
ok(e['cf-workshop-industry'].required&&e['cf-workshop-role'].required&&e['cf-workshop-experience'].required,'required workshop inputs');
ok(h.tier.options[h.tier.selectedIndex].attrs['data-t']==='ceo-ax-workshop','product context retained');
ok(e['cf-source-page'].value==='/ai-campus/ceo-ax-workshop/','source retained');
ok(e['cf-project-details'].hidden&&e['cf-budget'].disabled,'enterprise budgets excluded from individual workshop');
e['cf-name'].value='테스트';e['cf-email'].value='qa@example.invalid';e['cf-message'].value='주간 브리핑을 다시 쓰고 싶습니다';
e['cf-workshop-industry'].value='컨설팅';e['cf-workshop-role'].value='대표';e['cf-workshop-experience'].value='가끔 사용';e['cf-workshop-intent'].value='조건 확인 후 검토';e['cf-workshop-schedule'].value='주말';
const key=e['cf-request-key'].value;
h.form.valid=false;h.dispatch(h.form,'submit');await h.flush();ok(h.posts.length===0,'invalid form never sends');h.form.valid=true;
h.response({status:'failed'});h.dispatch(h.form,'submit');await h.flush();
ok(e['cf-request-key'].value===key&&e['cf-message'].value==='주간 브리핑을 다시 쓰고 싶습니다','failed request keeps key and answers');
ok(e['cf-submit'].disabled===false&&e['cf-success'].hidden,'failure can retry without success');
const payload=h.posts[0].opts.body;
for(const value of ['컨설팅','대표','가끔 사용','조건 확인 후 검토','주말','주간 브리핑을 다시 쓰고 싶습니다'])ok(payload.get('message').includes(value),'legacy message includes '+value);
ok(payload.get('workshop_industry')==='컨설팅','structured field also present');
h.response({status:'accepted'});h.dispatch(h.form,'submit');await h.flush();ok(e['cf-request-key'].value===key&&e['cf-success'].hidden,'unconfirmed response retains key without success');
h.response(new Error('Failed to fetch'));h.dispatch(h.form,'submit');await h.flush();ok(e['cf-request-key'].value===key&&!e['cf-submit'].disabled,'network failure preserves retry');
h.dispatch(e['cf-copy'],'click');await h.flush();ok(h.copies[0].includes('업종: 컨설팅')&&h.copies[0].includes('AI 사용 경험: 가끔 사용'),'copy fallback includes workshop details');
h.response({status:'saved',inquiry_id:'TEST-001'});h.dispatch(h.form,'submit');h.dispatch(h.form,'submit');await h.flush();
ok(h.posts.length===4,'double submit sends once');
ok(e['cf-request-key'].value!==key&&!e['cf-success'].hidden,'saved receipt resets request key and shows success');
ok(e['cf-inquiry-id'].textContent==='접수번호: TEST-001','receipt shown');
ok(e['cf-message'].value===''&&!h.fields.disabled,'success resets answers and restores deep-linked workshop');
for(const post of h.posts)ok((post.opts.body.get('message').match(/업종:/g)||[]).length===1,'retry never duplicates prefix');
for(const event of h.events)ok(!JSON.stringify(event).includes('qa@example.invalid')&&!JSON.stringify(event).includes('컨설팅')&&!JSON.stringify(event).includes('주간 브리핑을 다시'),'analytics exclude answers');
for(const [s,t] of [['flexoffice','precheck'],['ai-campus','diagnosis'],['ai-campus','workshop'],['ai-campus','sprint'],['public','advisory'],['coaching','consult'],['coaching','founding'],['general','']]){
  const x=harness(`?s=${s}&t=${t}`);ok(x.fields.hidden&&x.fields.disabled&&!x.elements['cf-workshop-industry'].required,`${s}/${t} unaffected`);
  x.elements['cf-message'].value='기존 문의 내용';x.dispatch(x.form,'submit');await x.flush();ok(x.posts[0].opts.body.get('message')==='기존 문의 내용'&&!x.posts[0].opts.body.has('workshop_role'),'ordinary message unchanged');
}
h.svc.value=h.svc.options.find(o=>o.attrs['data-s']==='coaching').value;h.dispatch(h.svc,'change');ok(h.fields.disabled&&h.fields.hidden,'service switch disables workshop');
h.svc.value=h.svc.options.find(o=>o.attrs['data-s']==='ai-campus').value;h.dispatch(h.svc,'change');h.tier.value=h.tier.options.find(o=>o.attrs['data-t']==='ceo-ax-workshop').value;h.dispatch(h.tier,'change');ok(!h.fields.disabled&&!h.fields.hidden,'manual product selection enables workshop');
h.tier.value=h.tier.options.find(o=>o.attrs['data-t']==='lecture').value;h.dispatch(h.tier,'change');ok(h.fields.disabled&&!e['cf-budget'].disabled,'product switch restores ordinary fields');
for(const match of landing.matchAll(/href="(\/contact\/[^\"]*)"/g)){const u=new URL(match[1].replaceAll('&amp;','&'),'https://www.nextcw.com');ok(u.searchParams.get('s')==='ai-campus'&&u.searchParams.get('t')==='ceo-ax-workshop','landing CTAs carry workshop product');}
ok(campus.includes('href="/ai-campus/ceo-ax-workshop/"'),'campus bridge present');
ok(!/"@type"\s*:\s*"(?:Offer|Event)"/.test(landing),'no unconfirmed offer or dated event schema');
ok(landing.includes('설명용 샘플')&&landing.includes('가격·정원·일정은 준비 중'),'sample and availability truthfulness');
console.log(JSON.stringify({result:'PASS',checks,scope:'workshop context, payload, validation, retry, receipt, copy, analytics privacy, legacy service/product regressions; mocked transport only'}));
