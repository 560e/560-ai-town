import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {database,transaction,audit} from './db.ts';
import {HttpError} from './http.ts';
import {requireUser} from './session.ts';
import {noStaffPolicy,serviceActions,type StaffPolicy,type ServiceAction,type TitleConfig} from '../service.ts';
export const uuid=()=>randomUUID();
export function idValue(value:unknown){if(typeof value!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(value))throw new HttpError(400,'记录编号无效');return value;}
export function revision(value:unknown){if(!Number.isSafeInteger(value)||(value as number)<0)throw new HttpError(400,'版本无效');return value as number;}
export function validate<T>(fn:()=>T):T{try{return fn();}catch(error){throw new HttpError(400,(error as Error).message);}}
export function checkVersion(row:{version:number},value:unknown){if(row.version!==revision(value))throw new HttpError(409,'内容已更新，请重新读取后再操作；未保存输入仍保留');}
export type ServiceAuthority={id:string;super:boolean;policy:StaffPolicy};
export async function authority(userId:string,client:Pick<PoolClient,'query'>=database()):Promise<ServiceAuthority>{
  const {rows}=await client.query('SELECT u.role,u.banned,s.policy FROM "user" u LEFT JOIN town_service_staff s ON s.user_id=u.id WHERE u.id=$1',[userId]);
  const user=rows[0];if(!user||user.banned)throw new HttpError(401,'账户不可用，请重新登录');
  return {id:userId,super:user.role==='super_admin',policy:user.role==='admin'?(user.policy||noStaffPolicy):noStaffPolicy};
}
export function may(a:ServiceAuthority,action:ServiceAction,titleId?:string){return a.super||(a.policy.actions.includes(action)&&(titleId?a.policy.allTitles||a.policy.titles.includes(titleId):true));}
export function need(a:ServiceAuthority,action:ServiceAction,titleId?:string){if(!may(a,action,titleId))throw new HttpError(403,'没有该事项的服务中心操作权限');}
export async function serviceActor(headers:Headers){const user=await requireUser(headers);return authority(user.id);}
export async function serviceTransaction<T>(actorId:string,work:(client:PoolClient,actor:ServiceAuthority)=>Promise<T>){return transaction(async client=>{await client.query("SELECT pg_advisory_xact_lock(hashtext('town:service'))");await client.query('SELECT id FROM "user" WHERE id=$1 FOR UPDATE',[actorId]);const actor=await authority(actorId,client);return work(client,actor);});}
export async function capabilities(client:Pick<PoolClient,'query'>=database()){
  const {rows}=await client.query("SELECT id,published->>'name' AS name FROM town_service_guides WHERE published IS NOT NULL AND published->>'public'='false' ORDER BY updated_at DESC LIMIT 200");
  return rows.map(row=>({id:`guide:${row.id}:read`,name:`阅读资料：${row.name}`,guideId:row.id}));
}
export async function checkBindings(client:PoolClient,actor:ServiceAuthority,permissions:string[]){
  const choices=await capabilities(client);for(const p of permissions){if(!choices.some(c=>c.id===p))throw new HttpError(400,'绑定包含尚未开放或不存在的业务权限');if(!actor.super&&!actor.policy.permissions.includes(p))throw new HttpError(403,'绑定超出了工作人员可分配的权限范围');}
}
export async function effectivePermissions(userId:string,client:Pick<PoolClient,'query'>=database()){
  const {rows}=await client.query(`SELECT DISTINCT p.value AS permission FROM town_service_grants g JOIN town_service_titles t ON t.id=g.title_id JOIN "user" u ON u.id=g.user_id CROSS JOIN LATERAL jsonb_array_elements_text(t.published->'permissions') p WHERE g.user_id=$1 AND NOT coalesce(u.banned,false) AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>now()) AND t.published->>'kind'='permission'`,[userId]);
  return rows.map(row=>row.permission as string);
}
export async function readGuide(id:string,headers:Headers){
  const {rows}=await database().query('SELECT id,published AS config FROM town_service_guides WHERE id=$1 AND published IS NOT NULL',[id]);const guide=rows[0];if(!guide)throw new HttpError(404,'资料不存在');
  if(!guide.config.public){const actor=await requireUser(headers);if(!(await effectivePermissions(actor.id)).includes(`guide:${id}:read`))throw new HttpError(403,'此资料需要对应的有效权限称号');}return guide;
}
export async function notify(client:PoolClient,userId:string,message:string,applicationId:string|null=null){await client.query('INSERT INTO town_service_notices(user_id,message,application_id) VALUES($1,$2,$3)',[userId,message,applicationId]);}
export async function award(client:PoolClient,actor:ServiceAuthority,userId:string,titleId:string,config:TitleConfig,reason:string,applicationId:string|null=null){
  if(userId===actor.id&&!applicationId)throw new HttpError(400,'不能定向授予自己的称号');
  const user=await client.query('SELECT id FROM "user" WHERE id=$1 AND NOT coalesce(banned,false)',[userId]);if(!user.rowCount)throw new HttpError(400,'目标居民不存在或已停用');
  await checkBindings(client,actor,config.permissions);
  const duplicate=await client.query('SELECT id FROM town_service_grants WHERE user_id=$1 AND title_id=$2 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())',[userId,titleId]);if(duplicate.rowCount)throw new HttpError(409,'居民已经持有该称号');
  const id=uuid();await client.query("INSERT INTO town_service_grants(id,user_id,title_id,source,application_id,actor_id,snapshot,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,CASE WHEN $8::int=0 THEN NULL ELSE now()+make_interval(days=>$8::int) END)",[id,userId,titleId,applicationId?'application':'manual',applicationId,actor.id,JSON.stringify(config),config.days]);
  await notify(client,userId,`你已获得「${config.name}」。${reason}`,applicationId);
  await audit(client,actor.id,'service.grant',userId,{reason,titleId,grantId:id,applicationId,permissions:config.permissions});return id;
}
export function exposeAuthority(a:ServiceAuthority){return {...a,actions:a.super?Object.keys(serviceActions):a.policy.actions};}
