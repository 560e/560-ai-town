import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomUUID,createHmac,randomInt} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {Pool} from 'pg';
import {spawnPose} from '../lib/multiplayer.ts';
import {benches} from '../data/district-plan.ts';
const base=process.env.BETTER_AUTH_URL||'http://localhost:3000';
assert.equal(process.env.TOWN_LOCAL_AUTH,'1');assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const db=new Pool({connectionString:process.env.DATABASE_URL}),fixtures=[];let checks=0;
const check=(value,label)=>{assert.ok(value,label);checks++;console.log('✓ '+label);};
async function request(user,data,origin=base){const start=performance.now(),r=await fetch(base+'/api/town/presence',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json',...(user?{Cookie:user.cookie}:{})},body:JSON.stringify(data)});return {status:r.status,body:await r.json(),ms:performance.now()-start};}
async function seed(){
  const id=randomUUID(),token=randomUUID(),session=randomUUID(),owner=randomUUID();fixtures.push(id);
  await db.query('INSERT INTO "user"(id,name,email,"emailVerified",role,"phoneNumber","phoneNumberVerified") VALUES($1,$2,$3,false,\'user\',$4,true)',[id,`联机验收${id.slice(0,8)}`,`${id}@qa.invalid`,`+86199${randomInt(10000000,99999999)}`]);
  await db.query('INSERT INTO town_profiles(user_id) VALUES($1)',[id]);
  await db.query('INSERT INTO session(id,token,"userId","expiresAt","updatedAt") VALUES($1,$2,$3,now()+interval \'1 hour\',now())',[session,token,id]);
  // Same HMAC format as the installed Better Call signer; only disposable local sessions.
  const cookie=`better-auth.session_token=${encodeURIComponent(token+'.'+createHmac('sha256',process.env.BETTER_AUTH_SECRET).update(token).digest('base64'))}`;
  return {id,session,owner,cookie,seq:0};
}
const join=(u,extra={})=>request(u,{op:'join',owner:u.owner,spawn:'entrance',...extra});
const tick=(u,pose=spawnPose(),extra={})=>request(u,{op:'tick',owner:u.owner,seq:++u.seq,pose,...extra});
const age=async(u,seconds=.3)=>db.query("UPDATE town_presence SET updated_at=now()-make_interval(secs=>$2) WHERE user_id=$1",[u.id,seconds]);
try{
  const a=await seed(),b=await seed();
  check((await join(a)).status===200,'authenticated resident joins main-town room');
  check((await request(null,{op:'join',owner:randomUUID()})).status===401,'anonymous visitor cannot impersonate an online resident');
  check((await request(a,{op:'join',owner:a.owner,userId:b.id})).status===400,'client-supplied identity is rejected');
  check((await request(a,{op:'join',owner:a.owner},'https://other.invalid')).status===403,'cross-origin presence writes rejected');
  check((await request(a,{op:'tick',owner:a.owner,seq:1,pose:{...spawnPose(),x:null}})).status===400,'malformed movement rejected');
  const joinedB=await join(b);check(joinedB.status===200&&joinedB.body.peers.some(p=>p.id===a.id),'two sessions see each other in the same room');
  check(!JSON.stringify(joinedB.body).includes(a.session)&&!JSON.stringify(joinedB.body).includes('phoneNumber')&&Object.keys(joinedB.body.peers[0]).sort().join(',')==='badges,character,id,name,pose,speech','peer snapshot only contains public scene fields');
  await age(a);const moved=await tick(a,{...spawnPose(),x:.8,moving:true});check(moved.status===200&&!moved.body.corrected&&moved.body.self.x===.8,'legal movement is accepted');
  await age(b);check((await tick(b)).body.peers.find(p=>p.id===a.id).pose.x===.8,'movement reaches another authenticated session');
  await age(a);const bad=await tick(a,{...spawnPose(),x:40});check(bad.body.corrected&&bad.body.self.x===.8,'teleport speed spoof is corrected');
  await age(a);const nav=await tick(a,spawnPose(),{spawn:'retail'});check(nav.body.corrected&&nav.body.self.x===spawnPose('retail').x,'existing fixed destination navigation remains available');
  const [sx,sz]=benches[0];await db.query('UPDATE town_presence SET pose=$2 WHERE user_id=$1',[a.id,{x:sx,z:sz+1.4,yaw:0,moving:false,seat:null}]);
  await age(a);check((await tick(a,{x:sx,z:sz,yaw:0,moving:false,seat:0})).body.self.seat===0,'sitting pose is synchronized');
  await age(a);check((await tick(a,{x:sx,z:sz+1.4,yaw:0,moving:false,seat:null})).body.self.seat===null,'standing pose is synchronized');
  const otherOwner=randomUUID();check((await request(a,{op:'join',owner:otherOwner})).status===409,'same account cannot silently duplicate across pages');
  await db.query("UPDATE town_presence SET joined_at=now()-interval '2 seconds' WHERE user_id=$1",[a.id]);
  check((await request(a,{op:'join',owner:otherOwner,takeover:true})).status===200,'explicit page takeover transfers one existing resident');
  check((await tick(a)).status===409,'old owner can no longer send movement');
  await request(a,{op:'leave',owner:a.owner});a.owner=otherOwner;a.seq=0;
  await age(a);check((await tick(a)).status===200,'old page leave cannot evict the new owner');
  await age(a,9);check((await tick(a)).status===410,'expired presence requires rejoining');
  check((await join(a)).status===200,'disconnected resident can rejoin');a.seq=0;
  await request(a,{op:'leave',owner:a.owner});await age(b);check(!(await tick(b)).body.peers.some(p=>p.id===a.id),'leaving removes the resident from peer snapshots');
  await join(a);await db.query('UPDATE "user" SET banned=true WHERE id=$1',[a.id]);await age(b);
  check(!(await tick(b)).body.peers.some(p=>p.id===a.id),'banned resident disappears without waiting for client cooperation');
  check((await tick(a)).status===401,'banned resident cannot refresh online lease');
  await db.query('UPDATE "user" SET banned=false WHERE id=$1',[a.id]);await join(a);
  await db.query('DELETE FROM session WHERE id=$1',[a.session]);await age(b);check(!(await tick(b)).body.peers.some(p=>p.id===a.id),'session revocation removes online presence');
  // Thirty-one concurrent admissions test the atomic room cap, including any real online users.
  await request(b,{op:'leave',owner:b.owner});const crowd=await Promise.all(Array.from({length:31},()=>seed()));
  const joins=await Promise.all(crowd.map(u=>join(u)));check(joins.every(r=>r.status===200&&r.body.count<=50&&r.body.peers.length<=49),'31 concurrent admissions never exceed room capacity');
  check(joins.every(r=>r.body.room===1),'default admission uses permanent public room 1');
  const rows=(await db.query('SELECT user_id,room FROM town_presence WHERE user_id=ANY($1::text[])',[crowd.map(u=>u.id)])).rows;
  const roomByUser=new Map(rows.map(r=>[r.user_id,r.room])),latencies=[];
  for(let round=0;round<8;round++){
    await delay(250);const results=await Promise.all(crowd.map(u=>tick(u)));
    check(results.every(r=>r.status===200),'concurrent heartbeat round '+(round+1)+' succeeds');
    for(let i=0;i<results.length;i++){latencies.push(results[i].ms);assert.ok(results[i].body.peers.every(p=>!roomByUser.has(p.id)||roomByUser.get(p.id)===roomByUser.get(crowd[i].id)));}
  }
  check(true,'peer snapshots never mix rooms');
  console.log(`Local 31-session snapshot check: ${latencies.length} ticks, p95 ${Math.round(latencies.sort((a,b)=>a-b)[Math.floor(latencies.length*.95)])}ms. This is not a production capacity guarantee.`);
  console.log(`Passed ${checks} multiplayer integration checks.`);
}finally{if(fixtures.length)await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[fixtures]);await db.end();}
