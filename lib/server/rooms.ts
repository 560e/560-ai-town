import {randomBytes,randomUUID,scrypt as derive,timingSafeEqual} from 'node:crypto';
import {promisify} from 'node:util';
import type {PoolClient} from 'pg';
import {transaction} from './db.ts';
import {HttpError} from './http.ts';
import {roomNumber,roomPassword,ROOM_LIMIT,type RoomInfo} from '../rooms.ts';
import {spawnPose} from '../multiplayer.ts';
const scrypt=promisify(derive);
export const livePresence=`p.online AND p.updated_at>clock_timestamp()-interval '8 seconds' AND NOT coalesce(u.banned,false) AND s."expiresAt">clock_timestamp()`;
export async function roomLock(client:PoolClient,shared=false){await client.query(`SELECT pg_advisory_xact_lock${shared?'_shared':''}(hashtext('town:presence-admission'))`);}
export async function sweepRooms(client:PoolClient){
 await client.query(`DELETE FROM town_rooms r WHERE r.number<>1 AND NOT EXISTS(SELECT 1 FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id WHERE p.room=r.number AND p.room_instance=r.instance AND ${livePresence})`);
}
// Called under the admission lock: the chosen slot and any new room are atomic.
export async function nextPublicRoom(client:PoolClient,userId:string,excluded:number){
 const result=(await client.query(`WITH candidates AS (
 SELECT r.number FROM town_rooms r WHERE r.password_hash IS NULL AND r.number<>$2 AND
 (SELECT count(*) FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id WHERE p.room=r.number AND p.room_instance=r.instance AND p.user_id<>$1 AND ${livePresence})<$3
 UNION ALL
 SELECT n FROM (SELECT n FROM generate_series(1,999999) n WHERE n<>$2 AND NOT EXISTS(SELECT 1 FROM town_rooms r WHERE r.number=n) LIMIT 1) missing
 ) SELECT number FROM candidates ORDER BY number LIMIT 1`,[userId,excluded,ROOM_LIMIT])).rows[0];
 if(!result)throw new HttpError(423,'当前没有可用房间，请稍后再试');
 return (await client.query('INSERT INTO town_rooms(number,instance,created_by) VALUES($1,$2,$3) ON CONFLICT(number) DO UPDATE SET number=excluded.number RETURNING *',[result.number,randomUUID(),userId])).rows[0];
}
export async function roomsList(userId:string,search:string,page:number){return transaction(async client=>{
 await roomLock(client);await sweepRooms(client);
 const where="WHERE ($1='' OR r.number::text LIKE $1||'%')";
 const rows=(await client.query(`SELECT r.number,r.instance,(r.password_hash IS NOT NULL) AS locked,(r.created_by=$2) IS TRUE AS mine,(SELECT count(*)::int FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id WHERE p.room=r.number AND p.room_instance=r.instance AND ${livePresence}) AS count FROM town_rooms r ${where} ORDER BY r.number LIMIT 50 OFFSET $3`,[search,userId,(page-1)*50])).rows as RoomInfo[];
 const total=(await client.query(`SELECT count(*)::int AS count FROM town_rooms r ${where}`,[search])).rows[0].count;
 return {items:rows,total,page,capacity:ROOM_LIMIT};
});}
export async function roomThrottle(userId:string){await transaction(async client=>{
 const key=`room-action:${userId}`;await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[key]);
 const row=(await client.query('SELECT * FROM town_limits WHERE key=$1',[key])).rows[0],now=Date.now(),fresh=!row||now-Number(row.started_at)>60000;
 if(!fresh&&row.count>=30)throw new HttpError(429,'房间操作过于频繁，请稍后再试');
 await client.query('INSERT INTO town_limits(key,started_at,last_at,count) VALUES($1,$2,$3,1) ON CONFLICT(key) DO UPDATE SET started_at=$2,last_at=$3,count=$4',[key,fresh?now:row.started_at,now,fresh?1:row.count+1]);
});}
export async function roomMembers(userId:string,number:number,instance:string){return transaction(async client=>{
 await roomLock(client);await sweepRooms(client);
 const room=(await client.query('SELECT * FROM town_rooms WHERE number=$1 AND instance::text=$2',[number,instance])).rows[0];
 if(!room)throw new HttpError(410,'房间已释放，请刷新列表');
 if(room.created_by!==userId)throw new HttpError(403,'只有房主可以管理房内成员');
 const {rows}=await client.query(`SELECT p.user_id AS id,u.name,(p.user_id=$3) AS host FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id WHERE p.room=$1 AND p.room_instance=$2 AND ${livePresence} ORDER BY (p.user_id=$3) DESC,u.name,p.user_id`,[number,room.instance,userId]);
 return {members:rows};
});}
async function hashPassword(password:string){if(!password)return null;const salt=randomBytes(16).toString('hex');return `${salt}:${(await scrypt(password,salt,32) as Buffer).toString('hex')}`;}
async function verifyPassword(password:string,hash:string|null){if(!hash)return true;const [salt,hex]=hash.split(':');const actual=await scrypt(password,salt,32) as Buffer,expected=Buffer.from(hex,'hex');return expected.length===actual.length&&timingSafeEqual(expected,actual);}
export async function roomMutation(client:PoolClient,userId:string,sessionId:string,row:Record<string,any>|undefined,input:Record<string,unknown>){
 let number:number,password:string;try{number=roomNumber(input.room);password=roomPassword(input.password);}catch(e){throw new HttpError(400,(e as Error).message);}
 if(!['create','enter','password','close','kick'].includes(input.action as string))throw new HttpError(400,'房间操作无效');
 if(typeof input.newOwner!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.newOwner))throw new HttpError(400,'新页面编号无效');
 if(['enter','create'].includes(input.action as string)&&row?.online&&Number(row.elapsed)<8000&&row.owner===input.newOwner&&row.session_id===sessionId&&row.room===number)return {row,owner:input.newOwner,changed:true};
 if(row?.online&&Number(row.elapsed)<8000&&(row.owner!==input.owner||row.session_id!==sessionId))throw new HttpError(409,'此账号正在另一个页面游览，请先在此页面接管');
 await sweepRooms(client);
 const room=(await client.query('SELECT * FROM town_rooms WHERE number=$1',[number])).rows[0];
 if(input.action==='create'){
  if(room)throw new HttpError(409,'这个房间号已经有人使用，请选择进入或换一个号码');
 }else{
  if(!room||room.instance!==input.instance)throw new HttpError(410,'房间已释放或重新创建，请刷新列表');
  if(['password','close','kick'].includes(input.action as string)){
   if(number===1)throw new HttpError(403,'1 号公共房间永久开放，不能加密或关闭');
   if(room.created_by!==userId)throw new HttpError(403,'只有当前房间的房主可以管理');
  }else if(!await verifyPassword(password,room.password_hash))throw new HttpError(403,'房间密码不正确');
 }
 if(input.action==='kick'){
  if(typeof input.target!=='string'||!input.target||input.target.length>128||input.target===userId)throw new HttpError(400,'请选择其他成员，房主不能踢出自己');
  const target=(await client.query(`UPDATE town_presence p SET online=false,speech=null,exit_reason='你已被房主移出房间，正在返回公共房间' WHERE p.user_id=$1 AND p.room=$2 AND p.room_instance=$3 AND p.online AND p.updated_at>clock_timestamp()-interval '8 seconds' RETURNING p.user_id`,[input.target,number,room.instance])).rows[0];
  if(!target)throw new HttpError(409,'该用户已离开房间，请刷新成员列表');
  await client.query("UPDATE town_private_chat SET status='closed',messages='[]',expires_at=now() WHERE inviter=$1 OR recipient=$1",[input.target]);
  await sweepRooms(client);
  return {row:row?.online&&Number(row.elapsed)<8000?row:undefined,owner:input.owner,changed:false};
 }
 if(input.action==='password'){
  await client.query('UPDATE town_rooms SET password_hash=$2 WHERE number=$1',[number,await hashPassword(password)]);
  return {row:row?.online&&Number(row.elapsed)<8000?row:undefined,owner:input.owner,changed:false};
 }
 if(input.action==='close'){
  // Lock/update occupants before chat rows, matching chat's presence-before-conversation order.
  await client.query("UPDATE town_presence SET online=false,speech=null,exit_reason='房主已关闭房间，正在返回公共房间' WHERE room=$1 AND room_instance=$2",[number,room.instance]);
  await client.query("UPDATE town_private_chat SET status='closed',messages='[]',expires_at=now() WHERE room=$1",[number]);
  await client.query('DELETE FROM town_rooms WHERE number=$1',[number]);
  return {row:row?.room===number?undefined:row,owner:input.owner,changed:row?.room===number};
 }
 const count=room?(await client.query(`SELECT count(*)::int AS count FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id WHERE p.room=$1 AND p.room_instance=$2 AND p.user_id<>$3 AND ${livePresence}`,[number,room.instance,userId])).rows[0].count:0;
 if(count>=ROOM_LIMIT)throw new HttpError(423,'这个房间已满 50 人，请选择其他房间');
 const instance=room?.instance||randomUUID();
 if(!room)await client.query('INSERT INTO town_rooms(number,instance,created_by,password_hash) VALUES($1,$2,$3,$4)',[number,instance,userId,await hashPassword(password)]);
 // Rotate the lease: delayed ticks, messages and leave requests from the former room cannot act here.
 const pose=row?.pose||spawnPose();
 const next=(await client.query('INSERT INTO town_presence(user_id,session_id,owner,room,room_instance,pose,scene) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(user_id) DO UPDATE SET session_id=$2,owner=$3,room=$4,room_instance=$5,pose=$6,scene=$7,online=true,seq=0,speech=null,exit_reason=null,joined_at=clock_timestamp(),updated_at=clock_timestamp() RETURNING *',[userId,sessionId,input.newOwner,number,instance,JSON.stringify({...pose,moving:false}),row?.scene||'town'])).rows[0];
 await client.query("UPDATE town_private_chat SET status='closed',messages='[]',expires_at=now() WHERE inviter=$1 OR recipient=$1",[userId]);
 await sweepRooms(client);
 return {row:next,owner:input.newOwner,changed:true};
}
