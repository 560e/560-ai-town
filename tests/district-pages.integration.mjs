import assert from 'node:assert/strict';
import {districtEntries} from '../data/district-entries.ts';
const base='http://localhost:3000';
for(const e of districtEntries){
 const page=await fetch(base+e.href);assert.equal(page.status,200,e.href);const html=await page.text();if(e.href!=='/service')assert.ok(html.includes('功能筹备中'),e.id);assert.ok(!html.includes('href="/?return='),e.id);
 const back=await fetch(`${base}/?return=${e.destination}`),body=await back.text();assert.equal(back.status,200);assert.ok(body.includes('正在展开小镇'),e.id);assert.ok(!body.includes('class="welcome-overlay'),e.id);
}
const home=await (await fetch(base+'/')).text();assert.ok(home.includes('正在展开小镇'));
assert.equal((await fetch(base+'/districts/not-a-district')).status,404);
console.log('Seven district pages use clean return links; legacy/home bootstrap and unknown-route handling passed.');
