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
const roomNumbers=[];
async function number(){let n;do{n=randomInt(700000,999999);}while((await db.query('SELECT 1 FROM town_rooms WHERE number=$1',[n])).rowCount);roomNumbers.push(n);return n;}
async function list(u,q=''){const r=await fetch(base+'/api/town/rooms?q='+q,{headers:u?{Cookie:u.cookie}:{}});return {status:r.status,body:await r.json()};}
async function members(u,r){const response=await fetch(base+'/api/town/rooms?'+new URLSearchParams({view:'members',room:String(r.number),instance:r.instance}),{headers:{Cookie:u.cookie}});return {status:response.status,body:await response.json()};}
const join=u=>request(u,{op:'join',owner:u.owner});
let pulseQueue=Promise.resolve();
const pulse=()=>pulseQueue=pulseQueue.then(()=>db.query('UPDATE town_presence SET updated_at=clock_timestamp() WHERE user_id=ANY($1::text[]) AND online',[fixtures]));
async function action(u,action,room,extra={}){await pulse();const r=await request(u,{op:'room',owner:u.owner,newOwner:randomUUID(),action,room,...extra});if(r.status===200){u.owner=r.body.owner;u.seq=0;}return r;}
const view=async u=>{await pulse();return (await join(u)).body;};
const leave=u=>request(u,{op:'leave',owner:u.owner});
const speak=(u,text)=>fetch(base+'/api/town/chat',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:u.cookie},body:JSON.stringify({op:'speak',owner:u.owner,messageId:randomUUID(),text})});
try{
 const a=await seed(),b=await seed(),c=await seed();await Promise.all([a,b,c].map(join));
 check((await list(null)).status===401,'room list requires sign-in');
 check((await view(a)).room===1&&(await view(a)).capacity===50,'default public room starts at 1 with capacity 50');
 for(const n of [0,-1,1000000,1.5,'2'])check((await action(a,'create',n)).status===400,'reject invalid room number '+n);
 const privateNumber=await number(),created=await action(a,'create',privateNumber,{password:'友谊560'});check(created.status===200&&created.body.snapshot.room===privateNumber,'create and enter password room atomically');
 let room=(await list(a,String(privateNumber))).body.items.find(r=>r.number===privateNumber);
 check(room.locked&&room.mine&&room.count===1,'list shows lock, ownership and actual occupants');
 check(!JSON.stringify((await list(b)).body).includes('password_hash')&&!JSON.stringify((await list(b)).body).includes('友谊560'),'list never exposes password or hash');
 const stored=(await db.query('SELECT password_hash FROM town_rooms WHERE number=$1',[privateNumber])).rows[0].password_hash;check(stored&&!stored.includes('友谊560'),'password stored as salted derived hash');
 const ownerBefore=b.owner;check((await action(b,'enter',privateNumber,{instance:room.instance,password:'错误'})).status===403,'incorrect password rejected');
 check(b.owner===ownerBefore&&(await view(b)).room===1,'failed switch retains old ownership and room');
 check((await action(b,'enter',privateNumber,{instance:room.instance,password:'友谊560'})).status===200,'friend can enter with correct password');
 check((await view(a)).peers.some(p=>p.id===b.id)&&!(await view(c)).peers.some(p=>p.id===a.id),'room membership and peer visibility isolated');
 check((await action(b,'password',privateNumber,{instance:room.instance,password:'劫持'})).status===403,'non-creator cannot change password');
 check((await action(b,'close',privateNumber,{instance:room.instance})).status===403,'non-creator cannot close room');
 check((await action(a,'password',privateNumber,{instance:room.instance,password:'新密码'})).status===200,'creator can change room password');
 check((await action(c,'enter',privateNumber,{instance:room.instance,password:'友谊560'})).status===403,'former password stops new admissions');
 check((await view(b)).room===privateNumber,'password change does not eject existing friend');
 check((await action(c,'enter',privateNumber,{instance:room.instance,password:'新密码'})).status===200,'new password accepted');

 const roster=await members(a,room);check(roster.status===200&&roster.body.members.length===3&&roster.body.members.find(m=>m.id===a.id).host,'creator is host and can list room members');
 check(roster.body.members.every(m=>Object.keys(m).sort().join(',')==='host,id,name'),'member management exposes only identity, nickname and host badge');
 check((await members(b,room)).status===403,'non-host cannot read management member list');
 check((await action(b,'kick',privateNumber,{instance:room.instance,target:c.id})).status===403,'non-host cannot kick another resident');
 check((await action(a,'kick',privateNumber,{instance:room.instance,target:a.id})).status===400,'host cannot kick themselves');
 check((await action(a,'kick',privateNumber,{instance:randomUUID(),target:b.id})).status===410,'stale room generation cannot kick anyone');
 await speak(b,'移出前发言');
 await db.query("INSERT INTO town_private_chat(id,room,inviter,recipient,inviter_owner,recipient_owner,status,expires_at,messages) VALUES($1,$2,$3,$4,$5,$6,'active',now()+interval '5 minutes','[]')",[randomUUID(),privateNumber,a.id,b.id,a.owner,b.owner]);
 check((await action(a,'kick',privateNumber,{instance:room.instance,target:b.id})).status===200,'host can kick a current room member');
 const removedTick=await request(b,{op:'tick',owner:b.owner,seq:99,pose:spawnPose()});check(removedTick.status===410&&removedTick.body.error.includes('房主移出'),'kicked client receives a clear removal reason');
 check((await view(a)).peers.every(p=>p.id!==b.id),'kicked member and public speech immediately disappear');
 check(!(await db.query("SELECT 1 FROM town_private_chat WHERE (inviter=$1 OR recipient=$1) AND status='active'",[b.id])).rowCount,'kicking ends private conversations');
 check((await join(b)).body.room===1,'kicked resident rejoins public room automatically');
 check((await action(a,'kick',privateNumber,{instance:room.instance,target:b.id})).status===409&&(await view(b)).room===1,'cannot kick a target who already left for another room');
 await action(b,'enter',privateNumber,{instance:room.instance,password:'新密码'});
 await db.query('DELETE FROM town_limits WHERE key=$1',['room-action:'+a.id]);
 await speak(a,'房间切换验收');const previous=await view(a),oldOwner=a.owner,newOwner=randomUUID();
 const pub=(await list(a,'1')).body.items.find(r=>r.number===1);
 const payload={op:'room',owner:oldOwner,newOwner,action:'enter',room:1,instance:pub.instance};
 const switched=await request(a,payload);check(switched.status===200&&JSON.stringify(switched.body.snapshot.self)===JSON.stringify(previous.self),'switch preserves authoritative position and facing');a.owner=newOwner;
 check((await request(a,payload)).status===200,'retry of same successful switch is idempotent');
 check((await request(a,{op:'tick',owner:oldOwner,seq:999,pose:spawnPose()})).status===409,'delayed old tick cannot act in new room');
 check((await view(c)).peers.every(p=>p.id!==a.id),'departed resident no longer appears in former room');
 check((await view(a)).peers.every(p=>p.id!==b.id),'new room never receives former peers');
 await leave(a);await join(a);check((await view(a)).room===1,'fresh join returns to public room rather than bypassing a password');
 check((await action(a,'password',privateNumber,{instance:room.instance,password:''})).status===200,'creator can manage owned room after leaving while friends remain');
 check(!(await list(a,String(privateNumber))).body.items[0].locked,'empty password makes room public');
 await leave(b);check((await list(a,String(privateNumber))).body.items.length===1,'room stays open while another resident remains');
 await leave(c);check((await list(a,String(privateNumber))).body.items.length===0,'last explicit departure immediately releases room');
 const replacement=await action(b,'create',privateNumber,{password:'另一个'});const renewed=(await list(b,String(privateNumber))).body.items[0];
 check(replacement.status===200&&renewed.instance!==room.instance&&renewed.mine,'released number can be recreated with fresh identity and creator');
 check((await action(a,'password',privateNumber,{instance:room.instance,password:''})).status===410,'old creator generation cannot manage recreated room');
 check((await action(c,'enter',privateNumber,{instance:room.instance,password:'另一个'})).status===410,'stale list cannot admit to a reused room number');
 check((await action(c,'enter',privateNumber,{instance:renewed.instance,password:'新密码'})).status===403,'reused number does not inherit former password');
 await db.query("UPDATE town_presence SET updated_at=now()-interval '9 seconds' WHERE user_id=$1",[b.id]);
 check(!(await list(a,String(privateNumber))).body.items.length,'last expired connection releases room');
 check((await request(b,{op:'tick',owner:b.owner,seq:99,pose:spawnPose()})).status===410,'expired occupant cannot resurrect released room');
 const raceNumber=await number(),race=await Promise.all([action(a,'create',raceNumber),action(c,'create',raceNumber)]);
 check(race.filter(r=>r.status===200).length===1&&race.filter(r=>r.status===409).length===1,'concurrent creation of same number has exactly one winner');
 const winner=race[0].status===200?a:c,loser=winner===a?c:a,raced=(await list(winner,String(raceNumber))).body.items[0];
 await action(loser,'enter',raceNumber,{instance:raced.instance});
 check((await action(winner,'close',raceNumber,{instance:raced.instance})).status===200,'creator can close occupied room');
 check(!(await list(winner,String(raceNumber))).body.items.length,'closed room number is released');
 check((await join(loser)).body.room===1,'removed occupants can rejoin public room');
 check((await action(a,'close',1,{instance:pub.instance})).status===403&&(await action(a,'password',1,{instance:pub.instance,password:'禁止'})).status===403,'room 1 cannot be closed or password protected');
 const crowd=await Promise.all(Array.from({length:51},()=>seed())),capacityNumber=await number();
 const first=await action(crowd[0],'create',capacityNumber),capacityRoom=(await list(crowd[0],String(capacityNumber))).body.items[0];check(first.status===200,'resident can create room without already having an online slot');
 const admissions=await Promise.all(crowd.slice(1).map(u=>action(u,'enter',capacityNumber,{instance:capacityRoom.instance})));
 check(admissions.filter(r=>r.status===200).length===49&&admissions.filter(r=>r.status===423).length===1,'51 simultaneous accounts cannot exceed 50 room slots');
 const rejected=crowd[admissions.findIndex(r=>r.status===423)+1];check(!(await db.query('SELECT 1 FROM town_presence WHERE user_id=$1',[rejected.id])).rowCount,'full-room rejection creates no accidental membership');
 await pulse();const full=await view(crowd[0]);check(full.count===50&&full.peers.length===49,'full room reports 50 occupants and 49 remote residents');
 const times=[];await new Promise(r=>setTimeout(r,180));
 const ticks=await Promise.all(crowd.filter(u=>u!==rejected).map(u=>request(u,{op:'tick',owner:u.owner,seq:1,pose:spawnPose()})));check(ticks.every(r=>r.status===200),'50 concurrent heartbeats remain valid');times.push(...ticks.map(r=>r.ms));console.log('50-session heartbeat p95: '+Math.round(times.sort((a,b)=>a-b)[Math.floor(times.length*.95)])+' ms (local check only)');
 await db.query('DELETE FROM town_limits WHERE key=$1',['room-action:'+a.id]);
 for(let i=0;i<30;i++)await request(a,{op:'room',owner:a.owner,newOwner:randomUUID(),action:'enter',room:1,instance:randomUUID()});
 check((await request(a,{op:'room',owner:a.owner,newOwner:randomUUID(),action:'enter',room:1,instance:pub.instance})).status===429,'failed attempts count toward server request rate limit');
 console.log(`Passed ${checks} room integration checks.`);
}finally{
 await db.query('DELETE FROM town_rooms WHERE created_by=ANY($1::text[])',[fixtures]);
 await db.query('DELETE FROM town_limits WHERE key=ANY($1::text[])',[fixtures.map(id=>'room-action:'+id)]);
 await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[fixtures]);await db.end();
}
