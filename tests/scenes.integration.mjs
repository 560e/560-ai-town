import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomInt,randomUUID} from 'node:crypto';
import {setTimeout as delay} from 'node:timers/promises';
import {Pool} from 'pg';
import {localHttp as fetch} from './local-http.mjs';

// Only the disposable runner may execute these fixture writes; never use resident data.
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1','Disposable runner required');
const target=new URL(process.env.DATABASE_URL),base=process.env.PASSWORD_TEST_URL;
assert.ok(['127.0.0.1','localhost'].includes(target.hostname)&&/^\/town_verify_[a-z0-9_]+$/.test(target.pathname),'Disposable local database required');
assert.ok(base&&new URL(base).hostname==='127.0.0.1','Loopback test server required');
const db=new Pool({connectionString:target.href}),password='SceneTest'+randomUUID()+'42';
const people=[],fixtureIds=[];
let checks=0;
function check(value,label){assert.ok(value,label);checks++;console.log('PASS '+label);}
async function call(path,{person,data,ip=person?.ip||'127.0.0.70'}={}){
  const r=await fetch(base+path,{method:data?'POST':'GET',headers:{Host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':ip,'x-forwarded-for':ip,Origin:'https://town-password.test',...(data?{'Content-Type':'application/json'}:{}),...(person?{Cookie:person.cookie}:{})},body:data?JSON.stringify(data):undefined});
  return {status:r.status,body:await r.json(),cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};
}
const presence=(person,data)=>call('/api/town/presence',{person,data:{owner:person.owner,...data}});
const chat=(person,data)=>call('/api/town/chat',{person,data:{owner:person.owner,...data}});
async function join(person,scene){const r=await presence(person,{op:'join',...(scene?{scene}:{})});assert.equal(r.status,200,'join');person.snap=r.body;person.seq=0;return r.body;}
async function tick(person,pose=person.snap.self,extra={}){await delay(250);const r=await presence(person,{op:'tick',seq:++person.seq,scene:person.snap.scene,pose,...extra});if(r.status===200)person.snap=r.body;return r;}
async function transfer(person,scene,extra={}){const owner=randomUUID(),r=await presence(person,{op:'scene',newOwner:owner,scene,...extra});assert.equal(r.status,200,'scene transfer '+scene);assert.equal(r.body.owner,owner);person.owner=owner;person.snap=r.body.snapshot;person.seq=0;return r.body.snapshot;}
async function rooms(person,number){const r=await call('/api/town/rooms?q='+number,{person});assert.equal(r.status,200);return r.body.items.find(x=>x.number===number);}
async function roomAction(person,data){const owner=randomUUID(),r=await presence(person,{op:'room',newOwner:owner,...data});if(r.status===200&&r.body.changed){person.owner=r.body.owner;person.snap=r.body.snapshot;person.seq=0;}return r;}
async function seedOccupants(template,count,room,instance){
  const session=(await db.query('SELECT session_id FROM town_presence WHERE user_id=$1',[template.id])).rows[0].session_id;
  for(let i=0;i<count;i++){
    const id=randomUUID();fixtureIds.push(id);
    await db.query('INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt",role,banned) VALUES($1,$2,$3,false,now(),now(),\'user\',false)',[id,'Scene fixture '+i,id+'@scene.invalid']);
    const sid=randomUUID();
    await db.query('INSERT INTO session(id,token,"expiresAt","createdAt","updatedAt","userId") SELECT $1,$2,"expiresAt",now(),now(),$3 FROM session WHERE id=$4',[sid,randomUUID(),id,session]);
    await db.query('INSERT INTO town_presence(user_id,session_id,owner,room,room_instance,scene,pose) VALUES($1,$2,$3,$4,$5,$6,$7)',[id,sid,randomUUID(),room,instance,i%2?'account':'service',JSON.stringify({x:0,z:7,yaw:0,moving:false,seat:null})]);
  }
}
try{
  for(let i=0;i<3;i++){
    const phoneNumber=`+86197${randomInt(10000000,99999999)}`;
    const ip=`127.0.0.${71+i}`;
    const r=await call('/api/auth/password/register',{ip,data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber,password}});assert.equal(r.status,200,'fixture registration');
    const id=(await db.query('SELECT id FROM "user" WHERE "phoneNumber"=$1',[phoneNumber])).rows[0].id;
    people.push({id,ip,cookie:r.cookie,owner:randomUUID(),seq:0});
  }
  const [host,guest,third]=people,number=randomInt(700000,999999),roomPassword='Private'+randomUUID();
  check((await presence(host,{op:'join',scene:'unknown'})).status===400,'unknown join scene rejected');
  await join(host);await join(guest);await join(third,'service');
  check(host.snap.scene==='town'&&third.snap.scene==='service','default town and direct hall joins use their scene');
  check(third.snap.peers.length===0&&third.snap.count===3,'direct hall join counts town residents without exposing them');
  check((await roomAction(host,{action:'create',room:number,password:roomPassword})).status===200,'host creates protected room');
  const initial=await rooms(host,number);check(initial.locked&&initial.mine,'protected room has host and password');
  check((await roomAction(guest,{action:'enter',room:number,instance:initial.instance,password:roomPassword})).status===200,'guest joins protected room');
  check((await tick(host)).body.peers.some(p=>p.id===guest.id),'same scene residents visible');
  const said=await chat(guest,{op:'speak',text:'你好，场景验证',messageId:randomUUID()});assert.equal(said.status,200);
  check((await tick(host)).body.peers.find(p=>p.id===guest.id)?.speech?.text==='你好，场景验证','same scene public speech delivered');
  const invite=await chat(guest,{op:'invite',target:host.id});assert.equal(invite.status,200);assert.ok(invite.body.chat?.id);
  const chatId=invite.body.chat.id;
  check((await chat(host,{op:'respond',id:chatId,accept:true})).body.chat?.status==='active','same scene private invitation accepted');
  assert.equal((await tick(host,{...host.snap.self,x:host.snap.self.x+.3,yaw:.6})).body.corrected,false);
  const savedTownPose={...host.snap.self};
  const oldOwner=host.owner;
  await transfer(host,'service');
  check(host.snap.room===number&&host.snap.count===2&&host.snap.peers.length===0&&!host.snap.chat,'hall transfer keeps room count while isolating peers and chat');
  const continued=await rooms(host,number);check(continued.instance===initial.instance&&continued.locked&&continued.mine,'hall transfer preserves room generation, password and host');
  const members=await call(`/api/town/rooms?view=members&room=${number}&instance=${initial.instance}`,{person:host});
  check(members.status===200&&members.body.members.length===2&&members.body.members.some(p=>p.id===host.id&&p.host),'hall host can manage all scene members');
  check((await tick(guest)).body.peers.length===0&&!guest.snap.chat,'town snapshot drops transferred peer, bubble and private chat');
  check((await chat(guest,{op:'send',id:chatId,text:'expired',messageId:randomUUID()})).status===404,'transferred private conversation cannot send');
  check((await presence(host,{op:'tick',owner:oldOwner,seq:99,scene:'town',pose:guest.snap.self})).status===409,'old scene tick cannot move new lease');
  check((await chat(host,{op:'speak',owner:oldOwner,text:'stale',messageId:randomUUID()})).status===409,'old scene speech cannot affect new lease');
  assert.equal((await presence(host,{op:'leave',owner:oldOwner})).status,200);
  check((await tick(host)).status===200,'old scene leave cannot disconnect new lease');
  const retried=await presence(host,{op:'scene',owner:oldOwner,newOwner:host.owner,scene:'service'});
  check(retried.status===200&&retried.body.owner===host.owner&&retried.body.snapshot.room===number,'same transfer retry is idempotent');
  check((await presence(host,{op:'scene',owner:oldOwner,newOwner:randomUUID(),scene:'town'})).status===409,'stale transfer cannot replace current lease');
  check((await presence(host,{op:'scene',scene:'unknown',newOwner:randomUUID()})).status===400,'unknown transfer scene rejected');
  // Deliberately align coordinates in different scenes to catch distance-only authorization.
  await db.query('UPDATE town_presence SET pose=$2,last_invite_at=null WHERE user_id=$1',[guest.id,JSON.stringify(host.snap.self)]);
  check((await chat(guest,{op:'invite',target:host.id})).status===409,'same coordinates across scenes cannot invite');
  check((await roomAction(third,{action:'enter',room:number,instance:initial.instance,password:'wrong'})).status===403,'protected room password still enforced after host scene transfer');
  await transfer(guest,'service');
  check(guest.snap.peers.some(p=>p.id===host.id),'hall residents in same room see each other');
  check(!guest.snap.peers.find(p=>p.id===host.id)?.speech,'scene transfer does not leak previous public speech');
  await db.query('UPDATE town_presence SET last_invite_at=null,last_speech_at=null WHERE user_id=$1',[guest.id]);
  check((await chat(guest,{op:'speak',text:'大厅见面',messageId:randomUUID()})).status===200,'hall public speech accepted');
  check((await tick(host)).body.peers.find(p=>p.id===guest.id)?.speech?.text==='大厅见面','hall public speech delivered to hall peers');
  const hallInvite=await chat(guest,{op:'invite',target:host.id});
  check(hallInvite.status===200&&hallInvite.body.chat?.status==='pending','hall nearby private invitation works');
  assert.equal((await chat(host,{op:'respond',id:hallInvite.body.chat.id,accept:true})).status,200);
  assert.equal((await chat(host,{op:'close',id:hallInvite.body.chat.id})).status,200);
  check((await tick(guest,{...guest.snap.self,z:guest.snap.self.z-.5,moving:true})).body.corrected===false,'valid small hall movement accepted');
  const validPose=guest.snap.self;
  const out=await tick(guest,{...validPose,x:1000});check(out.status===400,'out of bounds hall pose rejected');
  const blocked=await tick(guest,{...validPose,x:0,z:-6.3});check(blocked.status===200&&blocked.body.corrected&&blocked.body.self.z===validPose.z,'hall fixture collision cannot teleport');
  check((await tick(guest,validPose,{spawn:'academy'})).status===400,'town spawn rejected in hall');
  assert.equal((await tick(guest,validPose,{spawn:'bench-a'})).status,200);
  const seated=await tick(guest,{x:-10,z:3.5,yaw:Math.PI/2,moving:false,seat:0});
  check(seated.status===200&&!seated.body.corrected&&seated.body.self.seat===0,'hall seat accepted from nearby valid station');
  check((await tick(guest,{...guest.snap.self,seat:999})).status===400,'invalid hall seat rejected');
  const standing=await tick(guest,{x:-8.4,z:3.5,yaw:Math.PI/2,moving:false,seat:null});
  check(standing.status===200&&!standing.body.corrected&&standing.body.self.seat===null,'hall resident stands safely beside bench');
  const atomicSeat=await tick(guest,{x:-10,z:7.3,yaw:Math.PI/2,moving:false,seat:1},{spawn:'bench-b'});
  check(atomicSeat.status===200&&atomicSeat.body.self.seat===1&&atomicSeat.body.self.z===7.3,'hall bench navigation and seating complete atomically');
  await transfer(guest,'account');
  check(guest.snap.peers.length===0&&!guest.snap.chat&&guest.snap.count===2,'private account scene retains room without peers or chat');
  check([400,403,409].includes((await chat(guest,{op:'speak',text:'private page',messageId:randomUUID()})).status),'private scene cannot publish speech');
  await transfer(guest,'service');
  check(guest.snap.self.seat===1&&guest.snap.self.x===-10&&guest.snap.self.z===7.3,'account return restores hall seat and position');
  await transfer(guest,'account');
  await tick(host);
  await seedOccupants(host,48,number,initial.instance);
  const full=await tick(host);check(full.body.count===50&&full.body.peers.length===24,'all scenes consume capacity while hall peers remain isolated');
  check((await rooms(host,number)).count===50,'room directory reports occupants across scenes');
  check((await roomAction(third,{action:'enter',room:number,instance:initial.instance,password:roomPassword})).status===423,'other scene occupants enforce room capacity 50');
  await db.query('UPDATE town_presence SET room_instance=$2 WHERE user_id=$1',[fixtureIds[0],randomUUID()]);
  const generation=await tick(host);
  check(generation.body.count===49&&generation.body.peers.length===23,'stale room generation cannot appear in count or peers');
  await db.query('DELETE FROM "user" WHERE id=ANY($1)',[fixtureIds]);
  await presence(guest,{op:'leave'});await tick(host);
  check((await rooms(host,number))?.count===1,'sole hall occupant keeps protected room alive');
  for(const scene of ['office-campus','creative-street','ai-community','town-square','task-square']){
    await transfer(host,scene);check(host.snap.room===number&&host.snap.count===1&&!host.snap.peers.length,'private district '+scene+' preserves room lease');
  }
  await transfer(host,'learning-campus');
  check(host.snap.self.z===37&&host.snap.room===number,'academy has an outdoor campus entrance and preserves room');
  await join(guest,'learning-campus');
  check((await roomAction(guest,{action:'enter',room:number,instance:initial.instance,password:roomPassword})).status===200,'academy entrant uses existing protected room');
  check((await tick(host)).body.peers.some(p=>p.id===guest.id),'academy peers share only the same room and scene');
  await db.query('UPDATE town_presence SET last_speech_at=null,last_invite_at=null WHERE user_id=$1',[guest.id]);
  check((await chat(guest,{op:'speak',text:'校园见面',messageId:randomUUID()})).status===200,'academy public chat is available');
  check((await tick(host)).body.peers.find(p=>p.id===guest.id)?.speech?.text==='校园见面','academy public chat reaches campus peers');
  const campusInvite=await chat(guest,{op:'invite',target:host.id});
  check(campusInvite.status===200&&campusInvite.body.chat?.status==='pending','academy nearby private invitation works');
  await transfer(guest,'service');
  check((await tick(host)).body.peers.length===0&&!host.snap.chat,'hall transfer clears academy peers and private invitation');
  await db.query('UPDATE town_presence SET pose=$2,last_invite_at=null WHERE user_id=$1',[guest.id,JSON.stringify(host.snap.self)]);
  check((await chat(guest,{op:'invite',target:host.id})).status===409,'campus and hall identical coordinates cannot invite');
  await presence(guest,{op:'leave'});
  await db.query("UPDATE town_presence SET pose=$2,scene_poses=scene_poses-'__academyLayout' WHERE user_id=$1",[host.id,JSON.stringify({x:0,z:7,yaw:0,moving:false,seat:null})]);
  const legacy=await tick(host,{x:0,z:7,yaw:0,moving:false,seat:null});
  check(legacy.body.corrected&&legacy.body.self.z===37,'old hall academy pose resets to new campus entry once');
  const academyWalk=await tick(host,{...host.snap.self,x:1,moving:true});
  check(academyWalk.status===200&&!academyWalk.body.corrected&&academyWalk.body.self.x===1,'academy accepts bounded campus movement');
  await transfer(host,'account');await transfer(host,'learning-campus');
  check(host.snap.self.x===1&&host.snap.self.z===37,'academy return restores its own saved pose');
  await transfer(host,'town');
  check(host.snap.self.x===savedTownPose.x&&host.snap.self.z===savedTownPose.z&&host.snap.self.yaw===savedTownPose.yaw,'return from private district restores exact town position and facing');
  await transfer(host,'service');await presence(host,{op:'leave'});
  check(!(await rooms(third,number)),'last occupant leaving all scenes releases room');
  console.log(`${checks} cross-scene integration checks passed`);
}finally{
  const ids=[...people.map(p=>p.id),...fixtureIds];
  if(ids.length){await db.query('DELETE FROM town_audit WHERE actor_id=ANY($1) OR target_id=ANY($1)',[ids]);await db.query('DELETE FROM "user" WHERE id=ANY($1)',[ids]);}
  await db.end();
}
