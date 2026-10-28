// Optional local visual smoke fixture. A real authenticated second session moves for 90 seconds,
// then leaves and removes its own temporary account. Never prints tokens or modifies other users.
import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomUUID,createHmac} from 'node:crypto';
import {Pool} from 'pg';
import {setTimeout as delay} from 'node:timers/promises';
const base=process.env.BETTER_AUTH_URL||'http://localhost:3000';
assert.equal(process.env.TOWN_LOCAL_AUTH,'1');assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const db=new Pool({connectionString:process.env.DATABASE_URL}),id=randomUUID(),owner=randomUUID(),token=randomUUID();
const cookie=`better-auth.session_token=${encodeURIComponent(token+'.'+createHmac('sha256',process.env.BETTER_AUTH_SECRET).update(token).digest('base64'))}`;
async function call(data){const response=await fetch(base+'/api/town/presence',{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({...data,owner})});if(!response.ok)throw new Error('Visual fixture request failed: '+response.status);return response.json();}
try{
  await db.query('INSERT INTO "user"(id,name,email,"emailVerified",role) VALUES($1,$2,$3,false,\'user\')',[id,`联机体验员${id.slice(0,4)}`,`${id}@visual-qa.invalid`]);
  await db.query('INSERT INTO town_profiles(user_id,character) VALUES($1,$2)',[id,{hairStyle:'bob',hairColor:'silver',shirtColor:'lavender'}]);
  await db.query('INSERT INTO session(id,token,"userId","expiresAt","updatedAt") VALUES($1,$2,$3,now()+interval \'5 minutes\',now())',[randomUUID(),token,id]);
  const joined=await call({op:'join',spawn:'entrance'});console.log(`Visual fixture online in room ${joined.room}. Temporary actor: 联机体验员${id.slice(0,4)}`);
  const started=Date.now();let seq=0;
  while(Date.now()-started<90000){await delay(250);const t=(Date.now()-started)/1000;await call({op:'tick',seq:++seq,pose:{x:3*Math.sin(t),z:54,yaw:Math.cos(t)>0?Math.PI/2:-Math.PI/2,moving:true,seat:null}});}
  await call({op:'leave'});console.log('Visual fixture left the room.');
}catch(e){console.error(e.message);process.exitCode=1;}
finally{await db.query('DELETE FROM "user" WHERE id=$1',[id]);await db.end();console.log('Temporary visual account removed.');}
