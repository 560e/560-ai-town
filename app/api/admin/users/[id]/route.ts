import {database} from "@/lib/server/db";
import {guard, handle, HttpError, json} from "@/lib/server/http";
import {requireUser} from "@/lib/server/session";
import {maskPhone} from "@/lib/account";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{
  guard(request);await requireUser(request.headers,true);const {id}=await params;
  const {rows}=await database().query('SELECT u.id,u.name,u."phoneNumber",u.role,coalesce(u.banned,false) AS banned,u."banReason",u."createdAt",p.avatar,p.last_login FROM "user" u LEFT JOIN town_profiles p ON p.user_id=u.id WHERE u.id=$1',[id]);
  if(!rows[0])throw new HttpError(404,"用户不存在");
  const logs=await database().query('SELECT a.id,a.action,a.details,a.created_at,u.name AS actor FROM town_audit a LEFT JOIN "user" u ON a.actor_id=u.id WHERE a.target_id=$1 ORDER BY a.created_at DESC LIMIT 30',[id]);
  return json({user:{...rows[0],phoneNumber:maskPhone(rows[0].phoneNumber)},logs:logs.rows});
});}
