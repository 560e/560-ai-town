import {sceneInput,sceneSpawn,sceneNavigationPose,sceneTransferPose,scenePoseInput,restoreScenePose,acceptSceneMovement,spatialScene,currentCampusHistory} from '../town-scenes.ts';
import {publicIdentityBadges} from './identity-display.ts';
import {getAuth} from './auth.ts';
import {transaction} from './db.ts';
import {HttpError} from './http.ts';
import {savedAppearance} from '../character.ts';
import {PRESENCE_TTL_MS,ROOM_CAPACITY,type PresenceSnapshot} from '../multiplayer.ts';
import type {PoolClient} from 'pg';
import {privateSnapshot} from './town-chat.ts';
import {livePresence,roomLock,sweepRooms,roomMutation,roomThrottle,nextPublicRoom} from './rooms.ts';
const live=livePresence+` AND EXISTS(SELECT 1 FROM town_rooms r WHERE r.number=p.room AND r.instance=p.room_instance)`;
function checked<T>(work:()=>T){try{return work();}catch(e){throw new HttpError(400,(e as Error).message);}}
async function snapshot(client:PoolClient,row:Record<string,any>,corrected:boolean):Promise<PresenceSnapshot>{
  const serverTime=Date.now();
  const {rows}=await client.query(`SELECT p.user_id,p.pose,p.speech,p.scene,u.name,f.character FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id LEFT JOIN town_profiles f ON f.user_id=p.user_id WHERE p.room=$1 AND p.room_instance=$2 AND ${live} ORDER BY p.user_id`,[row.room,row.room_instance]);
  const badges=await publicIdentityBadges(rows.map(p=>p.user_id),client);
  return {scene:row.scene,room:row.room,count:rows.length,capacity:ROOM_CAPACITY,self:row.pose,corrected,serverTime,chat:spatialScene(row.scene)?await privateSnapshot(client,row.user_id):null,peers:rows.filter(p=>spatialScene(row.scene)&&p.scene===row.scene&&p.user_id!==row.user_id).map(p=>({id:p.user_id,name:p.name,badges:badges.get(p.user_id)||[],character:savedAppearance(p.character),pose:p.pose,speech:p.speech?.expiresAt>serverTime?p.speech:null}))};
}
export async function presenceRequest(headers:Headers,input:Record<string,unknown>){
  const auth=await getAuth().api.getSession({headers});if(!auth)throw new HttpError(401,'请先登录小镇账户');
  const op=input.op;
  if(!['join','tick','leave','room','scene'].includes(op as string))throw new HttpError(400,'在线操作无效');
  const allowed=op==='scene'?['op','owner','newOwner','scene','spawn']:op==='room'?['op','owner','action','room','password','instance','newOwner','target']:op==='leave'?['op','owner']:op==='join'?['op','owner','spawn','takeover','scene']:['op','owner','seq','pose','spawn','scene'];
  if(Object.keys(input).some(key=>!allowed.includes(key)))throw new HttpError(400,'在线参数包含不允许的字段');
  if(typeof input.owner!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.owner))throw new HttpError(400,'页面编号无效');
  if(input.takeover!==undefined&&typeof input.takeover!=='boolean')throw new HttpError(400,'接管参数无效');
  const requestedScene=input.scene===undefined?undefined:checked(()=>sceneInput(input.scene));
  if(op==='scene'&&(requestedScene===undefined||typeof input.newOwner!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.newOwner)))throw new HttpError(400,'场景转移参数无效');
  if(input.spawn!==undefined&&typeof input.spawn!=='string')throw new HttpError(400,'目的地无效');
  const spawn=input.spawn as string|undefined;
  if(op==='tick'&&(!Number.isSafeInteger(input.seq)||(input.seq as number)<1||(input.seq as number)>2147483647))throw new HttpError(400,'同步序号无效');
  if(op==='room')await roomThrottle(auth.user.id);
  return transaction(async client=>{
    // Scene transfers/admissions exclude chat delivery; ordinary position ticks share the lock.
    await roomLock(client,op==='tick');
    const valid=await client.query('SELECT u.id FROM "user" u JOIN session s ON s."userId"=u.id WHERE u.id=$1 AND s.id=$2 AND s."expiresAt">now() AND NOT coalesce(u.banned,false) FOR UPDATE OF u',[auth.user.id,auth.session.id]);
    if(!valid.rowCount)throw new HttpError(401,'登录已失效，请重新登录');
    let row=(await client.query('SELECT *,extract(epoch FROM (clock_timestamp()-updated_at))*1000 AS elapsed,extract(epoch FROM (clock_timestamp()-joined_at))*1000 AS joined_elapsed FROM town_presence WHERE user_id=$1 FOR UPDATE',[auth.user.id])).rows[0];
    if(op==='room'){const result=await roomMutation(client,auth.user.id,auth.session.id,row,input);return {owner:result.owner,changed:result.changed,snapshot:result.row?.online?await snapshot(client,result.row,true):null};}
    if(op==='leave'){
      await client.query('UPDATE town_presence SET online=false,speech=null WHERE user_id=$1 AND owner=$2',[auth.user.id,input.owner]);await sweepRooms(client);return {ok:true};
    }
    if(op==='join'){
      await sweepRooms(client);
      if(spawn!==undefined)checked(()=>sceneSpawn(requestedScene||'town',spawn));
      const alive=row?.online&&Number(row.elapsed)<PRESENCE_TTL_MS;
      if(alive&&row.owner!==input.owner&&!input.takeover)throw new HttpError(409,'此账号正在另一个页面游览小镇');
      if(alive&&row.owner===input.owner&&row.session_id===auth.session.id){
        const pose=restoreScenePose(row.pose,row.scene,row.scene_poses),corrected=Object.entries(pose).some(([key,value])=>row.pose?.[key]!==value)||row.scene==='learning-campus'&&!currentCampusHistory(row.scene_poses);
        if(corrected){const {scenePoses}=sceneTransferPose(row.scene,row.pose,row.scene_poses,row.scene);row=(await client.query('UPDATE town_presence SET pose=$2,scene_poses=$3 WHERE user_id=$1 RETURNING *',[auth.user.id,JSON.stringify(pose),JSON.stringify(scenePoses)])).rows[0];}
        return snapshot(client,row,corrected);
      }
      if(alive&&Number(row.joined_elapsed)<1000)throw new HttpError(429,'操作较快，请稍后再试');
      const existingRoom=alive?(await client.query('SELECT * FROM town_rooms WHERE number=$1 AND instance=$2',[row.room,row.room_instance])).rows[0]:null;
      const target=existingRoom||(row?.exit_reason?await nextPublicRoom(client,auth.user.id,row.room):(await client.query('SELECT * FROM town_rooms WHERE number=1')).rows[0]),room=target.number;
      const count=(await client.query(`SELECT count(*)::int AS count FROM town_presence p JOIN "user" u ON u.id=p.user_id JOIN session s ON s.id=p.session_id WHERE p.room=$1 AND p.user_id<>$2 AND ${live}`,[room,auth.user.id])).rows[0].count;
      if(count>=ROOM_CAPACITY)throw new HttpError(423,'1 号公共房间已满，请选择或创建其他房间');
      const scene=requestedScene||'town';
      const pose=spawn!==undefined?checked(()=>sceneSpawn(scene,spawn)):row?.scene===scene?restoreScenePose(row.pose,scene,row.scene_poses):sceneSpawn(scene);
      const {scenePoses}=sceneTransferPose(row?.scene||'account',row?.pose,row?.scene_poses,scene,spawn);
      row=(await client.query('INSERT INTO town_presence(user_id,session_id,owner,room,pose,room_instance,scene,scene_poses) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id) DO UPDATE SET session_id=$2,owner=$3,room=$4,pose=$5,room_instance=$6,scene=$7,scene_poses=$8,speech=null,exit_reason=null,online=true,seq=0,joined_at=now(),updated_at=now() RETURNING *',[auth.user.id,auth.session.id,input.owner,room,JSON.stringify(pose),target.instance,scene,JSON.stringify(scenePoses)])).rows[0];
      await client.query('DELETE FROM town_private_chat WHERE expires_at<now()');
      await client.query("DELETE FROM town_presence WHERE updated_at<now()-interval '1 day'");
      return snapshot(client,row,true);
    }
    if(!row||!row.online||Number(row.elapsed)>=PRESENCE_TTL_MS)throw new HttpError(410,row?.exit_reason||'在线连接已过期，正在重新连接');
    if(op==='scene'){
      checked(()=>sceneSpawn(requestedScene!,spawn));
      if(row.owner===input.newOwner&&row.session_id===auth.session.id&&row.scene===requestedScene){
        if(!(await client.query('SELECT 1 FROM town_rooms WHERE number=$1 AND instance=$2',[row.room,row.room_instance])).rowCount)throw new HttpError(410,'房间已释放，请重新选择房间');
        return {owner:row.owner,snapshot:await snapshot(client,row,false)};
      }
    }
    if(row.owner!==input.owner||row.session_id!==auth.session.id)throw new HttpError(409,'此账号已在另一个页面继续游览');
    if(!(await client.query('SELECT 1 FROM town_rooms WHERE number=$1 AND instance=$2',[row.room,row.room_instance])).rowCount)throw new HttpError(410,'房间已释放，请重新选择房间');
    if(op==='scene'){
      if(input.newOwner===input.owner)throw new HttpError(400,'场景转移必须更新页面编号');
      const {pose,scenePoses}=checked(()=>sceneTransferPose(row.scene,row.pose,row.scene_poses,requestedScene!,spawn));
      row=(await client.query('UPDATE town_presence SET owner=$2,scene=$3,pose=$4,scene_poses=$5,seq=0,speech=null,joined_at=clock_timestamp(),updated_at=clock_timestamp() WHERE user_id=$1 RETURNING *',[auth.user.id,input.newOwner,requestedScene,JSON.stringify(pose),JSON.stringify(scenePoses)])).rows[0];
      await client.query("UPDATE town_private_chat SET status='closed',messages='[]',expires_at=now() WHERE inviter=$1 OR recipient=$1",[auth.user.id]);
      return {owner:row.owner,snapshot:await snapshot(client,row,true)};
    }
    if(requestedScene!==undefined&&requestedScene!==row.scene)throw new HttpError(409,'场景已变化，请重新连接');
    const next=checked(()=>scenePoseInput(input.pose,row.scene));
    if((input.seq as number)<=row.seq)throw new HttpError(409,'同步请求已过期');
    if(Number(row.elapsed)<120)throw new HttpError(429,'同步频率过快');
    let corrected=false,pose=next!;
    const legacyCampus=row.scene==='learning-campus'&&!currentCampusHistory(row.scene_poses);
    if(legacyCampus){pose=sceneSpawn(row.scene);corrected=true;}
    else if(spawn!==undefined){pose=checked(()=>sceneNavigationPose(row.scene,spawn,next));corrected=true;}
    else if(!acceptSceneMovement(row.pose,pose,Number(row.elapsed),row.scene)){pose={...restoreScenePose(row.pose,row.scene,row.scene_poses),moving:false};corrected=true;}
    const scenePoses=legacyCampus?sceneTransferPose(row.scene,row.pose,row.scene_poses,row.scene).scenePoses:row.scene_poses;
    row=(await client.query('UPDATE town_presence SET pose=$2,seq=$3,scene_poses=$4,updated_at=now() WHERE user_id=$1 RETURNING *',[auth.user.id,JSON.stringify(pose),input.seq,JSON.stringify(scenePoses)])).rows[0];
    return snapshot(client,row,corrected);
  });
}
