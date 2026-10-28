import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomUUID,createHmac,randomInt} from 'node:crypto';
import {Pool} from 'pg';
import {emptyTitle} from '../lib/service.ts';
import {identityPresets} from '../lib/identity-display.ts';
const base=process.env.BETTER_AUTH_URL||'http://localhost:3000';
assert.equal(process.env.TOWN_LOCAL_AUTH,'1');assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const db=new Pool({connectionString:process.env.DATABASE_URL}),users=[],titles=[],grants=[];let checks=0;
const check=(v,label)=>{assert.ok(v,label);checks++;console.log('✓ '+label);};
async function seed(role='user'){
 const id=randomUUID(),token=randomUUID();users.push(id);
 await db.query('INSERT INTO "user"(id,name,email,"emailVerified",role,"phoneNumber","phoneNumberVerified") VALUES($1,$2,$3,false,$4,$5,true)',[id,'身份验收'+id.slice(0,8),id+'@identity-qa.invalid',role,`+86199${randomInt(10000000,99999999)}`]);
 await db.query('INSERT INTO town_profiles(user_id) VALUES($1)',[id]);
 await db.query('INSERT INTO session(id,token,"userId","expiresAt","updatedAt") VALUES($1,$2,$3,now()+interval \'1 hour\',now())',[randomUUID(),token,id]);
 return {id,cookie:`better-auth.session_token=${encodeURIComponent(token+'.'+createHmac('sha256',process.env.BETTER_AUTH_SECRET).update(token).digest('base64'))}`,owner:randomUUID()};
}
async function call(user,path='/api/account/identity-display',data,method=data?'PATCH':'GET',origin=base){const r=await fetch(base+path,{method,headers:{Origin:origin,...(user?{Cookie:user.cookie}:{}),...(data?{'Content-Type':'application/json'}:{})},...(data?{body:JSON.stringify(data)}:{})});return {status:r.status,data:await r.json()};}
try{
 const a=await seed(),b=await seed(),admin=await seed('super_admin');
 const initial=await call(a);check(initial.status===200&&initial.data.selected.join()==='resident','default resident selected');
 check((await call(null)).status===401,'anonymous preferences rejected');
 for(let i=0;i<12;i++){
  const config={...emptyTitle(),name:'身份测试'+i,summary:'仅供自动验收',overheadAllowed:i!==10,overheadStyle:identityPresets.gold.style};
  const pub=await call(admin,'/api/manage/service',{op:'publish',config,internalNote:'identity fixture'},'POST');check(pub.status===200,'operator publishes appearance '+i);const id=pub.data.id;titles.push(id);
  const grant=randomUUID();grants.push(grant);await db.query("INSERT INTO town_service_grants(id,user_id,title_id,source,snapshot) VALUES($1,$2,$3,'manual',$4)",[grant,i===11?b.id:a.id,id,config]);
 }
 const get=()=>call(a),save=(selected,version=0)=>call(a,undefined,{selected,version});
 check((await get()).data.choices.some(c=>c.id===grants[10]&&!c.allowed),'owned non-public-overhead title listed as unavailable');
 check((await save([grants[11]])).status===400,'cannot wear another account grant');
 check((await save([grants[10]])).status===400,'cannot wear display-disabled title');
 check((await save(['resident',...grants.slice(0,10)])).status===400,'eleven selected identities rejected');
 check((await save([grants[0],grants[0]])).status===400,'duplicate identities rejected');
 check((await call(a,undefined,{version:0,selected:[],userId:b.id})).status===400,'spoofed account field rejected');
 check((await call(a,undefined,{version:0,selected:[]},'PATCH','https://bad.invalid')).status===403,'cross-origin changes rejected');
 const selected=[grants[2],grants[0],'resident',...grants.slice(3,10)];
 check((await save(selected)).status===200,'ten identities saved with custom order');
 check((await save([])).status===409,'stale concurrent editor cannot overwrite');
 const badges=await call(a,'/api/account/identity-display?view=badges');assert.deepEqual(badges.data.badges.map(c=>c.id),selected);check(true,'display order round trips');
 check(!JSON.stringify(badges.data).includes(grants[10]),'hidden title absent from public DTO');
 const join=u=>call(u,'/api/town/presence',{op:'join',owner:u.owner,spawn:'entrance'},'POST');await join(a);const peer=(await join(b)).data.peers.find(p=>p.id===a.id);assert.deepEqual(peer.badges.map(c=>c.id),selected);check(true,'second user receives ordered identities');
 check(Object.keys(peer.badges[0]).sort().join(',')==='expiresAt,id,name,style','peer badge exposes no grant/private/config metadata');
 const config=(await db.query('SELECT published FROM town_service_titles WHERE id=$1',[titles[2]])).rows[0].published;
 check((await call(admin,'/api/manage/service',{op:'save',id:titles[2],version:1,config:{...config,overheadStyle:identityPresets.purple.style}},'POST')).status===200,'appearance draft saved');
 check((await call(a,'/api/account/identity-display?view=badges')).data.badges[0].style.text===identityPresets.gold.style.text,'draft does not change live appearance');
 check((await call(admin,'/api/manage/service',{op:'publish',id:titles[2],version:2,config:{...config,overheadStyle:identityPresets.purple.style}},'POST')).status===200,'new appearance published');
 check((await call(a,'/api/account/identity-display?view=badges')).data.badges[0].style.text===identityPresets.purple.style.text,'published appearance updates existing wearer');
 check((await call(a,'/api/manage/service',{op:'publish',config},'POST')).status===403,'resident cannot configure or publish title colors');
 await db.query("UPDATE town_service_grants SET expires_at=now()-interval '1 second' WHERE id=$1",[grants[2]]);
 await db.query('UPDATE town_service_grants SET revoked_at=now() WHERE id=$1',[grants[0]]);
 check(!(await call(a,'/api/account/identity-display?view=badges')).data.badges.some(c=>[grants[0],grants[2]].includes(c.id)),'expired and revoked identities disappear');
 check((await save([grants[0]],1)).status===400,'revoked grant cannot be reselected');
 check((await save([],1)).status===200,'all identities including resident can be hidden');
 check((await call(a,'/api/account/identity-display?view=badges')).data.badges.length===0,'empty selection stays empty');
 check((await db.query('SELECT count(*)::int AS n FROM town_service_grants WHERE user_id=$1',[a.id])).rows[0].n===11,'display changes never remove actual grants');
 await db.query('UPDATE "user" SET banned=true WHERE id=$1',[a.id]);check((await get()).status===401,'disabled account cannot access display settings');
 console.log(`Passed ${checks} identity display integration checks.`);
}finally{
 await db.query('DELETE FROM town_audit WHERE actor_id=ANY($1::text[])',[users]);
 await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[users]);
 await db.query('DELETE FROM town_service_title_versions WHERE title_id=ANY($1::uuid[])',[titles]);
 await db.query('DELETE FROM town_service_titles WHERE id=ANY($1::uuid[])',[titles]);await db.end();
}
