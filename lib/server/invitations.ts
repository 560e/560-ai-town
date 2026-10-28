import {createHash,randomBytes,randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {database,transaction,audit} from './db.ts';
import {HttpError} from './http.ts';
import {normalizeInvite,inviteCount} from '../invitations.ts';

export async function lockInvitation(client:PoolClient,value:unknown){
  let code;try{code=normalizeInvite(value);}catch{throw new HttpError(400,'请填写有效邀请码');}
  const row=(await client.query('SELECT id,used_at,revoked_at FROM town_registration_invites WHERE code_hash=$1 FOR UPDATE',[createHash('sha256').update(code).digest('hex')])).rows[0];
  if(!row||row.used_at||row.revoked_at)throw new HttpError(400,'邀请码无效、已使用或已停用');
  return row.id as string;
}
async function assertManager(client:PoolClient,id:string){
  const row=(await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR UPDATE',[id])).rows[0];
  if(row?.role!=='super_admin'||row.banned)throw new HttpError(403,'超级管理员权限已失效');
}
export async function listInvitations(page:number){
  const result=await database().query(`SELECT i.id,i.display_hint AS hint,i.created_at AS "createdAt",i.used_at AS "usedAt",i.revoked_at AS "revokedAt",u.name AS "usedBy"
    FROM town_registration_invites i LEFT JOIN "user" u ON u.id=i.used_by ORDER BY i.created_at DESC,i.id LIMIT 50 OFFSET $1`,[(page-1)*50]);
  const counts=(await database().query('SELECT count(*)::int AS total,count(*) FILTER(WHERE used_at IS NOT NULL)::int AS used,count(*) FILTER(WHERE used_at IS NULL AND revoked_at IS NULL)::int AS available FROM town_registration_invites')).rows[0];
  return {items:result.rows,page,...counts};
}
export async function generateInvitations(actorId:string,value:unknown){
  let count;try{count=inviteCount(value);}catch(e){throw new HttpError(400,(e as Error).message);}
  return transaction(async client=>{
    await assertManager(client,actorId);
    const codes:string[]=[];
    for(let i=0;i<count;i++){
      const code=randomBytes(12).toString('hex').toUpperCase();
      await client.query('INSERT INTO town_registration_invites(id,code_hash,display_hint,created_by) VALUES($1,$2,$3,$4)',[randomUUID(),createHash('sha256').update(code).digest('hex'),`${code.slice(0,6)}…${code.slice(-4)}`,actorId]);
      codes.push(code.match(/.{6}/g)!.join('-'));
    }
    await audit(client,actorId,'registration.invites.generate',null,{count});
    return {codes};
  });
}
export async function revokeInvitation(actorId:string,id:unknown){
  if(typeof id!=='string'||!/^[0-9a-f-]{36}$/i.test(id))throw new HttpError(400,'邀请码记录无效');
  return transaction(async client=>{
    await assertManager(client,actorId);
    const r=await client.query('UPDATE town_registration_invites SET revoked_at=now() WHERE id=$1 AND used_at IS NULL AND revoked_at IS NULL RETURNING id',[id]);
    if(!r.rowCount)throw new HttpError(409,'邀请码已使用、已停用或不存在');
    await audit(client,actorId,'registration.invites.revoke',null,{inviteId:id});return {ok:true};
  });
}
