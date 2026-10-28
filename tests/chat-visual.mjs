// Local browser QA companion: two disposable accounts, isolated from real users.
// The browser logs in normally using the printed fixture phone and local OTP UI.
import '../scripts/account-env.mjs';
import {emptyTitle} from '../lib/service.ts';
import {identityPresets} from '../lib/identity-display.ts';
const withIdentities=process.argv.includes('--identities'),identityTitles=[];
import assert from 'node:assert/strict';
import {randomUUID,randomInt,createHmac} from 'node:crypto';
import {readFile,unlink} from 'node:fs/promises';
import {Pool} from 'pg';
import {setTimeout as delay} from 'node:timers/promises';
const base=process.env.BETTER_AUTH_URL||'http://localhost:3000';
assert.equal(process.env.TOWN_LOCAL_AUTH,'1');assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const db=new Pool({connectionString:process.env.DATABASE_URL}),ids=[randomUUID(),randomUUID()],phone=`+86199${randomInt(10000000,99999999)}`,token=randomUUID(),control=new URL('./.chat-visual-command.json',import.meta.url);
let owner=randomUUID();const visualRoom=randomInt(800000,899999);
const cookie=`better-auth.session_token=${encodeURIComponent(token+'.'+createHmac('sha256',process.env.BETTER_AUTH_SECRET).update(token).digest('base64'))}`;
async function call(path,data){const r=await fetch(base+path,{method:'POST',headers:{Origin:base,'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({...data,owner})});const result=await r.json();if(!r.ok)throw Error(`${path}: ${r.status} ${result.error}`);return result;}
try{
 await unlink(control).catch(()=>{});
 for(let i=0;i<2;i++){await db.query('INSERT INTO "user"(id,name,email,"emailVerified",role,"phoneNumber","phoneNumberVerified") VALUES($1,$2,$3,false,\'user\',$4,true)',[ids[i],`${i?'联机体验员':'聊天验收员'}${ids[i].slice(0,4)}`,`${ids[i]}@chat-visual.invalid`,i?null:phone]);await db.query('INSERT INTO town_profiles(user_id,character) VALUES($1,$2)',[ids[i],{hairStyle:'bob',hairColor:'silver',shirtColor:i?'lavender':'green'}]);}
 if(withIdentities){
  const names=['金牌共创者','AI学习先锋','创意伙伴','校园推广大使','技术分享官','社区志愿者','产品体验官','优秀学员','小镇探索家'];
  const picks=ids.map(()=>['resident']);
  for(let n=0;n<names.length;n++){const tid=randomUUID();identityTitles.push(tid);const config={...emptyTitle(),name:names[n],summary:'临时身份展示验收',overheadAllowed:true,overheadStyle:Object.values(identityPresets)[(n+1)%8].style};await db.query('INSERT INTO town_service_titles(id,draft,published,published_version) VALUES($1,$2,$2,1)',[tid,config]);for(let i=0;i<2;i++){const gid=randomUUID();picks[i].push(gid);await db.query("INSERT INTO town_service_grants(id,user_id,title_id,source,snapshot) VALUES($1,$2,$3,'manual',$4)",[gid,ids[i],tid,config]);}}
  for(let i=0;i<2;i++)await db.query('UPDATE town_profiles SET identity_display=$2 WHERE user_id=$1',[ids[i],JSON.stringify(picks[i])]);
 }
 await db.query('INSERT INTO session(id,token,"userId","expiresAt","updatedAt") VALUES($1,$2,$3,now()+interval \'15 minutes\',now())',[randomUUID(),token,ids[1]]);
 console.log(`Browser fixture phone: ${phone.slice(3)}. Bot name: 联机体验员${ids[1].slice(0,4)}. Use local OTP login on 127.0.0.1, then enter room ${visualRoom} with test room password qa560 at 主入口. Cleanup after stop command or 10 minutes.`);
 await call('/api/town/presence',{op:'join',spawn:'entrance'});
 const created=await call('/api/town/presence',{op:'room',action:'create',room:visualRoom,password:'qa560',newOwner:randomUUID()});owner=created.owner;
 let seq=0,isolated=false,lastSpeech=0,lastCommand='',pendingSince=0,lastChat='',lastCount=0;const start=Date.now();
 while(Date.now()-start<600000){
  await delay(300);let command={};try{command=JSON.parse(await readFile(control,'utf8'));}catch{}
  if(command.action==='stop')break;
  if(command.action==='join'&&command.id!==lastCommand){lastCommand=command.id;const r=(await db.query('SELECT instance FROM town_rooms WHERE number=$1',[command.room])).rows[0];if(r){const moved=await call('/api/town/presence',{op:'room',action:'enter',room:command.room,instance:r.instance,password:command.password||'',newOwner:randomUUID()});owner=moved.owner;seq=0;isolated=true;console.log('QA bot entered requested room '+command.room);continue;}}

  const a=(await db.query('SELECT * FROM town_presence WHERE user_id=$1 AND online',[ids[0]])).rows[0];
  if(a?.room===visualRoom&&!isolated){isolated=true;console.log('Both QA accounts entered their test room.');}
  let state;try{state=await call('/api/town/presence',{op:'tick',seq:++seq,pose:{x:1.8,z:54,yaw:Math.PI,moving:false,seat:null}});}catch(e){if(!e.message.includes(': 410 '))throw e;console.log(e.message);state=await call('/api/town/presence',{op:'join'});seq=0;isolated=false;console.log('QA bot automatically returned to room '+state.room);}

  if(!isolated)continue;
  if(Date.now()-lastSpeech>10000){await call('/api/town/chat',{op:'speak',text:'你好，一起探索 AI 小镇吧！',messageId:randomUUID()});lastSpeech=Date.now();}
  if(command.action==='invite'&&command.id!==lastCommand){lastCommand=command.id;try{await call('/api/town/chat',{op:'invite',target:ids[0]});}catch(e){console.log(e.message);}}
  const chat=state.chat;
  if(chat?.id!==lastChat){lastChat=chat?.id||'';pendingSince=Date.now();lastCount=0;}
  if(chat?.status==='pending'&&chat.incoming&&Date.now()-pendingSince>5000)await call('/api/town/chat',{op:'respond',id:chat.id,accept:true});
  if(chat?.status==='active'&&(!chat.messages.length||chat.messages.length>lastCount&&chat.messages.at(-1)?.sender===ids[0])){await call('/api/town/chat',{op:'send',id:chat.id,text:chat.messages.length?'收到，这条消息只有我们两人能看到。':'你好！很高兴在小镇遇见你。',messageId:randomUUID()});lastCount=chat.messages.length+1;console.log('Private test exchange delivered.');}
 }
 await call('/api/town/presence',{op:'leave'});
}catch(e){console.error(e.message);process.exitCode=1;}
finally{await db.query('DELETE FROM town_rooms WHERE created_by=ANY($1::text[])',[ids]);await db.query('DELETE FROM town_limits WHERE key=ANY($1::text[])',[ids.map(id=>'room-action:'+id)]);await db.query('DELETE FROM town_audit WHERE actor_id=ANY($1::text[])',[ids]);await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[ids]);await db.query('DELETE FROM town_service_title_versions WHERE title_id=ANY($1::uuid[])',[identityTitles]);await db.query('DELETE FROM town_service_titles WHERE id=ANY($1::uuid[])',[identityTitles]);await db.query('DELETE FROM town_limits WHERE key IN ($1,$2)',['send:'+phone,'verify:'+phone]);await db.query('DELETE FROM town_otp WHERE phone=$1',[phone]);await unlink(control).catch(()=>{});await db.end();console.log('Disposable chat QA accounts and sessions removed.');}
