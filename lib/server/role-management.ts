import {transaction,audit} from "./db.ts";
import {HttpError} from "./http.ts";
import {accountRoles,type AccountRole} from "../roles.ts";

export async function changeAccountRole(actorId:string,targetId:string,role:AccountRole,reason:string){
  if(!accountRoles.includes(role))throw new HttpError(400,"请选择有效角色");
  if(!reason.trim()||reason.length>200)throw new HttpError(400,"请填写1–200字的授权或撤权原因");
  await transaction(async client=>{
    // Serialize role changes so concurrent revocations cannot remove all super admins.
    await client.query("SELECT pg_advisory_xact_lock(hashtext('town:role-management'))");
    const actor=await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR UPDATE',[actorId]);
    if(actor.rows[0]?.role!=="super_admin"||actor.rows[0].banned)throw new HttpError(403,"超级管理员权限已变更");
    if(actorId===targetId)throw new HttpError(400,"不能修改自己的管理角色");
    const {rows}=await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR UPDATE',[targetId]);
    if(!rows[0])throw new HttpError(404,"账户不存在");
    if(rows[0].banned&&role!=="user")throw new HttpError(400,"请先恢复该账户，再授予管理权限");
    if(rows[0].role===role)return;
    if(rows[0].role==="super_admin"&&role!=="super_admin"){
      const count=await client.query('SELECT count(*)::int AS count FROM "user" WHERE role=\'super_admin\' AND coalesce(banned,false)=false');
      if(count.rows[0].count<=1)throw new HttpError(400,"必须保留至少一位正常的超级管理员");
    }
    await client.query('UPDATE "user" SET role=$1,"updatedAt"=now() WHERE id=$2',[role,targetId]);
    await client.query('DELETE FROM town_service_staff WHERE user_id=$1',[targetId]);
    await client.query('DELETE FROM "session" WHERE "userId"=$1',[targetId]);
    await audit(client,actorId,"role.update",targetId,{before:rows[0].role||"user",after:role,reason:reason.trim()});
  });
}
