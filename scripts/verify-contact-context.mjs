import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url);
const services={flexoffice:'precheck','ai-campus':'diagnosis',public:'advisory',coaching:'consult'};
let checks=0;
for(const [s,t] of Object.entries(services)){
 const html=await readFile(new URL(s+'/index.html',root),'utf8');
 for(const cta of ['nav_service','footer_service']){assert.ok(html.includes('/contact/?s='+s+'&amp;t='+t+'&amp;cta='+cta),s+' '+cta);checks++;}
 if(s==='coaching'){assert.ok(html.includes('t=consult&amp;cta=footer_consult'));assert.ok(!html.includes('t=founding&amp;cta=footer_founder'));assert.ok(html.includes('t=founding&amp;cta=pricing'));checks+=3;}
}
const main=await readFile(new URL('js/main.js',root),'utf8');
const start=main.indexOf('  /* Delegation also covers');
const end=main.indexOf('  /* Contact form',start);
assert.ok(start>0&&end>start);
let handler; const events=[];
runInNewContext(main.slice(start,end),{document:{addEventListener:(type,fn)=>{assert.equal(type,'click');handler=fn;}},window:{location:{origin:'https://www.nextcw.com'}},URL,currentPath:'/insights/',track:(name,params)=>events.push({name,params})});
for(const [s,t] of Object.entries(services)){
 handler({target:{closest:()=>({getAttribute:()=>'/contact/?s='+s+'&t='+t+'&cta=insights_search_inquiry'})}});
 assert.equal(events.at(-1).name,'service_cta_click');assert.equal(events.at(-1).params.service_key,s);assert.equal(events.at(-1).params.tier_key,t);checks++;
}
const count=events.length;
handler({target:{closest:()=>null}});handler({target:{closest:()=>({getAttribute:()=> 'https://example.com/contact/?s=coaching'})}});
assert.equal(events.length,count);checks++;
assert.equal(Object.keys(events[0].params).sort().join(','),'cta_location,service_key,source_page,tier_key');checks++;
assert.ok(main.includes('data.status === "saved" && data.inquiry_id'));checks++;
console.log(JSON.stringify({result:'PASS',checks,scope:'service navigation, coaching CTA, dynamic inquiry event delegation; no form submit'}));
