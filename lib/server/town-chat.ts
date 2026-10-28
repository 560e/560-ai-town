import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {getAuth} from './auth.ts';
import {transaction} from './db.ts';
import {HttpError} from './http.ts';
import {chatText,PRIVATE_DISTANCE,PRIVATE_LIMIT,INVITE_DURATION,type PrivateChat,type ChatMessage} from '../town-chat.ts';
import {SPEECH_DURATION,SPEECH_LIMIT} from '../../data/player-speech.ts';
import {sceneLineClear,spatialScene} from '../town-scenes.ts';
import {roomLock} from './rooms.ts';
import {assertAllowedMessage} from './moderation.ts';

const online=`p.online AND p.updated_at>now()-interval '8 seconds' AND s."expiresAt">now() AND NOT coalesce(u.banned,false)`;
// Match both page leases, not just account IDs. Neither an old page nor a new login inherits consent.
const validChat=`c.status IN ('pending','active') AND c.expires_at>now() AND
 (SELECT count(*) FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id
 WHERE ${online} AND p.room=c.room AND p.room_instance=c.room_instance AND p.scene=c.scene AND p.scene IN ('town','service','learning-campus') AND EXISTS(SELECT 1 FROM town_rooms r WHERE r.number=p.room AND r.instance=p.room_instance) AND p.joined_at<=c.created_at AND
 ((p.user_id=c.inviter AND p.owner=c.inviter_owner) OR (p.user_id=c.recipient AND p.owner=c.recipient_owner)))=2`;
function uuid(value:unknown){if(typeof value!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))throw new HttpError(400,'会话编号无效');return value;}
function text(value:unknown,limit:number,multiline=false){try{return chatText(value,limit,multiline);}catch(e){throw new HttpError(400,(e as Error).message);}}
export async function privateSnapshot(client:PoolClient,userId:string):Promise<PrivateChat|null>{
 const c=(await client.query(`SELECT c.*,a.name AS inviter_name,b.name AS recipient_name FROM town_private_chat c JOIN "user" a ON a.id=c.inviter JOIN "user" b ON b.id=c.recipient WHERE (c.inviter=$1 OR c.recipient=$1) AND ${validChat} ORDER BY c.created_at DESC LIMIT 1`,[userId])).rows[0];
 if(!c)return null;
 const incoming=c.recipient===userId;
 return {id:c.id,status:c.status,incoming,peer:{id:incoming?c.inviter:c.recipient,name:incoming?c.inviter_name:c.recipient_name},messages:c.status==='active'?c.messages:[],expiresAt:new Date(c.expires_at).getTime(),version:new Date(c.updated_at).toISOString()};
}
export async function chatRequest(headers:Headers,input:Record<string,unknown>){
 const auth=await getAuth().api.getSession({headers});if(!auth)throw new HttpError(401,'请先登录，再与小镇居民聊天');
 const fields:Record<string,string[]>={speak:['text','messageId'],invite:['target'],respond:['id','accept'],send:['id','text','messageId'],close:['id']};
 const op=typeof input.op==='string'?input.op:'';
 if(!Object.hasOwn(fields,op)||Object.keys(input).some(k=>!['op','owner',...fields[op]].includes(k)))throw new HttpError(400,'聊天参数无效');
 const owner=uuid(input.owner),message=(op==='send'||op==='speak')?text(input.text,op==='speak'?SPEECH_LIMIT:PRIVATE_LIMIT,op==='send'):'';
 const messageId=(op==='send'||op==='speak')?uuid(input.messageId):null;
 if(['respond','send','close'].includes(op))uuid(input.id);
 if(op==='respond'&&typeof input.accept!=='boolean')throw new HttpError(400,'请选择同意或拒绝');
 if(op==='invite'&&(typeof input.target!=='string'||input.target.length>128||!input.target||input.target===auth.user.id))throw new HttpError(400,'请选择附近的其他居民');
 return transaction(async client=>{
  // Admission/scene changes are exclusive; chat holds a shared lease until delivery commits.
  await roomLock(client,true);
  // Private participants are locked in stable order before reading their current positions.
  if(op!=='speak')await client.query("SELECT pg_advisory_xact_lock(hashtext('town:private-chat'))");
  if(op!=='speak'){
   const participants=op==='invite'?[auth.user.id,input.target]:[auth.user.id,...(await client.query('SELECT inviter,recipient FROM town_private_chat WHERE id=$1 AND (inviter=$2 OR recipient=$2)',[input.id,auth.user.id])).rows.flatMap(c=>[c.inviter,c.recipient])];
   await client.query('SELECT id FROM "user" WHERE id=ANY($1::text[]) ORDER BY id FOR KEY SHARE',[participants]);
   await client.query('SELECT user_id FROM town_presence WHERE user_id=ANY($1::text[]) ORDER BY user_id FOR UPDATE',[participants]);
  }
  const p=(await client.query(`SELECT p.* FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id WHERE p.user_id=$1 AND p.session_id=$2 AND ${online} FOR UPDATE OF p`,[auth.user.id,auth.session.id])).rows[0];
  if(!p)throw new HttpError(410,'请等待小镇重新连接后再聊天');
  if(p.owner!==owner)throw new HttpError(409,'此页面已失去角色控制，请重新连接');
  if(!spatialScene(p.scene))throw new HttpError(403,'此页面不支持聊天');
  if(!(await client.query('SELECT 1 FROM town_rooms WHERE number=$1 AND instance=$2',[p.room,p.room_instance])).rowCount)throw new HttpError(410,'房间已释放');
  const now=Date.now();
  if(op==='speak'){
   if(p.speech?.id===messageId){if(p.speech.text!==message)throw new HttpError(409,'消息编号已使用');return {speech:p.speech,serverTime:now};}
   if(p.last_speech_at&&now-new Date(p.last_speech_at).getTime()<2000)throw new HttpError(429,'说得太快啦，请稍等 2 秒');
   await assertAllowedMessage(client,message);
   const speech={id:messageId,text:message,expiresAt:now+SPEECH_DURATION};
   await client.query('UPDATE town_presence SET speech=$2,last_speech_at=now() WHERE user_id=$1',[auth.user.id,JSON.stringify(speech)]);
   return {speech,serverTime:now};
  }
  await client.query('DELETE FROM town_private_chat WHERE expires_at<now()');
  if(op==='invite'){
   if(p.last_invite_at&&now-new Date(p.last_invite_at).getTime()<10000)throw new HttpError(429,'邀请已发出过，请稍等 10 秒再邀请');
   const target=(await client.query(`SELECT p.* FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id WHERE p.user_id=$1 AND ${online} FOR UPDATE OF p`,[input.target])).rows[0];
   if(!target||target.room!==p.room||target.room_instance!==p.room_instance||target.scene!==p.scene)throw new HttpError(409,'对方已离开当前房间');
   if(Math.hypot(p.pose.x-target.pose.x,p.pose.z-target.pose.z)>PRIVATE_DISTANCE||!sceneLineClear(p.scene,p.pose,target.pose))throw new HttpError(409,'请走到对方附近再邀请私聊');
   if(await privateSnapshot(client,auth.user.id)||await privateSnapshot(client,input.target as string))throw new HttpError(409,'你或对方已有私聊邀请或正在聊天，请稍后再试');
   await client.query("INSERT INTO town_private_chat(id,inviter,recipient,inviter_owner,recipient_owner,room,status,expires_at,scene,room_instance) VALUES($1,$2,$3,$4,$5,$6,'pending',now()+make_interval(secs=>$7),$8,$9)",[randomUUID(),auth.user.id,input.target,owner,target.owner,p.room,INVITE_DURATION/1000,p.scene,p.room_instance]);
   await client.query('UPDATE town_presence SET last_invite_at=now() WHERE user_id=$1',[auth.user.id]);
  }else{
   const current=await privateSnapshot(client,auth.user.id);
   if(!current||current.id!==input.id)throw new HttpError(404,'私聊已结束或邀请已过期');
   if(op==='close')await client.query("UPDATE town_private_chat SET status='closed',messages='[]',expires_at=now(),updated_at=now() WHERE id=$1",[current.id]);
   if(op==='respond'){
    if(current.status!=='pending'||!current.incoming)throw new HttpError(403,'只有被邀请者可以处理这份邀请');
    if(input.accept){
     const other=(await client.query('SELECT pose FROM town_presence WHERE user_id=$1',[current.peer.id])).rows[0];
     if(!other||Math.hypot(p.pose.x-other.pose.x,p.pose.z-other.pose.z)>PRIVATE_DISTANCE||!sceneLineClear(p.scene,p.pose,other.pose))throw new HttpError(409,'对方已走远，请靠近后再接受邀请');
    }
    await client.query("UPDATE town_private_chat SET status=$2,expires_at=now()+make_interval(secs=>$3),updated_at=now() WHERE id=$1",[current.id,input.accept?'active':'closed',input.accept?1800:0]);
   }
   if(op==='send'){
    if(current.status!=='active')throw new HttpError(403,'请等待对方同意，才能发送私聊消息');
    const duplicate=current.messages.find(m=>m.id===messageId);
    if(duplicate){if(duplicate.sender!==auth.user.id||duplicate.text!==message)throw new HttpError(409,'消息编号已使用');}
    else{
     const previous=current.messages.findLast(m=>m.sender===auth.user.id);
     if(previous&&now-previous.at<1000)throw new HttpError(429,'消息发送太快，请稍等 1 秒');
     await assertAllowedMessage(client,message);
     const messages:ChatMessage[]=[...current.messages,{id:messageId!,sender:auth.user.id,text:message,at:now}].slice(-50);
     await client.query("UPDATE town_private_chat SET messages=$2,expires_at=now()+interval '30 minutes',updated_at=now() WHERE id=$1",[current.id,JSON.stringify(messages)]);
    }
   }
  }
  return {chat:await privateSnapshot(client,auth.user.id),serverTime:now};
 });
}
