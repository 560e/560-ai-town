import type {PoolClient} from 'pg';
import {registrationAccess,registrationUpdate} from '../registration-policy.ts';
import {database,transaction,audit} from './db.ts';
import {HttpError} from './http.ts';

export async function publicRegistrationPolicy(){
  const row=(await database().query('SELECT sms_required,invite_required FROM town_registration_settings WHERE id=1')).rows[0];
  try{return registrationAccess(row);}catch(e){throw new HttpError(503,(e as Error).message);}
}
export async function registrationSettings(){
  const row=(await database().query('SELECT s.version,s.sms_required,s.invite_required,s.updated_at,u.name AS actor FROM town_registration_settings s LEFT JOIN "user" u ON u.id=s.actor_id WHERE s.id=1')).rows[0];
  if(!row)throw new HttpError(503,'注册配置尚未初始化，请运行数据库迁移');
  return {...registrationAccess(row),version:row.version,updatedAt:row.updated_at,actor:row.actor};
}
export async function assertPasswordRegistration(client:PoolClient){
  // Shared lock holds through user creation; a policy update cannot overtake this decision.
  const row=(await client.query('SELECT sms_required,invite_required FROM town_registration_settings WHERE id=1 FOR SHARE')).rows[0];
  let policy;try{policy=registrationAccess(row);}catch(e){throw new HttpError(503,(e as Error).message);}
  if(!policy.passwordRegistrationAllowed)throw new HttpError(403,'当前注册要求短信验证，短信服务尚未接入，请联系管理员');
  return policy;
}
export async function writeRegistrationSettings(actorId:string,input:unknown){
  let value;try{value=registrationUpdate(input);}catch(e){throw new HttpError(400,(e as Error).message);}
  return transaction(async client=>{
    const actor=(await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR UPDATE',[actorId])).rows[0];
    if(actor?.role!=='super_admin'||actor.banned)throw new HttpError(403,'超级管理员权限已失效');
    const row=(await client.query('SELECT version,sms_required,invite_required FROM town_registration_settings WHERE id=1 FOR UPDATE')).rows[0];
    if(!row)throw new HttpError(503,'注册配置尚未初始化');
    if(row.version!==value.version)throw new HttpError(409,'其他管理员已更新注册配置，请重新读取后再保存');
    const inviteRequired=value.inviteRequired??row.invite_required;
    if(row.sms_required===value.smsRequired&&row.invite_required===inviteRequired)return {version:row.version,unchanged:true};
    const version=row.version+1;
    await client.query('UPDATE town_registration_settings SET sms_required=$1,version=$2,actor_id=$3,invite_required=$4,updated_at=now() WHERE id=1',[value.smsRequired,version,actorId,inviteRequired]);
    await audit(client,actorId,'registration.update',null,{reason:`注册短信验证：${row.sms_required?'开启':'关闭'} → ${value.smsRequired?'开启':'关闭'}；邀请码：${row.invite_required?'开启':'关闭'} → ${inviteRequired?'开启':'关闭'}`,beforeRequired:row.sms_required,afterRequired:value.smsRequired,beforeInviteRequired:row.invite_required,afterInviteRequired:inviteRequired,version});
    return {version};
  });
}
