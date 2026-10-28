import {database, transaction, audit} from "@/lib/server/db";
import {body, guard, handle, HttpError, json} from "@/lib/server/http";
import {requireUser} from "@/lib/server/session";
import {maskPhone} from "@/lib/account";
import {isOperator} from "@/lib/roles";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handle(async()=>{
  guard(request);await requireUser(request.headers,true);
  const url=new URL(request.url),q=(url.searchParams.get("q")||"").trim().slice(0,80),page=Math.min(100000,Math.max(1,Number(url.searchParams.get("page"))||1));
  const state=url.searchParams.get("state")||"all";
  const needle=`%${q.replace(/[\\%_]/g,"\\$&")}%`;
  const conditions='(u.name ILIKE $1 OR u."phoneNumber" LIKE $1) AND ($2=\'all\' OR ($2=\'banned\' AND u.banned=true) OR ($2=\'active\' AND coalesce(u.banned,false)=false))';
  const count=await database().query(`SELECT count(*) FROM "user" u WHERE ${conditions}`,[needle,state]);
  const {rows}=await database().query(`SELECT u.id,u.name,u."phoneNumber",u.role,coalesce(u.banned,false) AS banned,u."banReason",u."createdAt",p.avatar,p.last_login FROM "user" u LEFT JOIN town_profiles p ON p.user_id=u.id WHERE ${conditions} ORDER BY u."createdAt" DESC,u.id LIMIT 15 OFFSET $3`,[needle,state,(Math.floor(page)-1)*15]);
  return json({users:rows.map(user=>({...user,phoneNumber:maskPhone(user.phoneNumber)})),total:Number(count.rows[0].count),page:Math.floor(page)});
});}
export async function PATCH(request:Request){return handle(async()=>{
  guard(request,true);const actor=await requireUser(request.headers,true),data=await body(request);
  if (Object.keys(data).some(key=>!["id","banned","reason"].includes(key)) || typeof data.id!=="string" || typeof data.banned!=="boolean") throw new HttpError(400,"账户操作参数不正确");
  const reason=typeof data.reason==="string"?data.reason.trim():"";
  if (reason.length>200 || (data.banned&&!reason)) throw new HttpError(400,"停用账户时请填写 1–200 字的原因");
  await transaction(async client=>{
    const current=await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR UPDATE',[actor.id]);
    if(!isOperator(current.rows[0]?.role)||current.rows[0].banned)throw new HttpError(403,"管理员权限已变更，请重新登录");
    const {rows}=await client.query('SELECT id,role,banned FROM "user" WHERE id=$1 FOR UPDATE',[data.id]);
    if (!rows[0]) throw new HttpError(404,"用户不存在");
    if (isOperator(rows[0].role)||data.id===actor.id) throw new HttpError(400,"此页面不能停用管理员账户，请先由超管收回管理权限");
    await client.query('UPDATE "user" SET banned=$1,"banReason"=$2,"banExpires"=NULL,"updatedAt"=now() WHERE id=$3',[data.banned,data.banned?reason:null,data.id]);
    if (data.banned) await client.query('DELETE FROM "session" WHERE "userId"=$1',[data.id]);
    await audit(client,actor.id,data.banned?"user.ban":"user.restore",data.id as string,{reason});
  });
  return json({ok:true});
});}
