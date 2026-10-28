import {database} from "@/lib/server/db";
import {guard,handle,json,body,HttpError} from "@/lib/server/http";
import {requireSuperAdmin} from "@/lib/server/session";
import {changeAccountRole} from "@/lib/server/role-management";
import {maskPhone} from "@/lib/account";
import {accountRoles,type AccountRole} from "@/lib/roles";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handle(async()=>{
  guard(request);await requireSuperAdmin(request.headers);
  const url=new URL(request.url),q=(url.searchParams.get("q")||"").trim().slice(0,80),filter=url.searchParams.get("role")||"all",page=Math.min(100000,Math.max(1,Math.floor(Number(url.searchParams.get("page"))||1)));
  if(filter!=="all"&&!accountRoles.includes(filter as AccountRole))throw new HttpError(400,"角色筛选条件无效");
  const needle=`%${q.replace(/[\\%_]/g,"\\$&")}%`,where='(name ILIKE $1 OR "phoneNumber" LIKE $1) AND ($2=\'all\' OR coalesce(role,\'user\')=$2)';
  const [count,list]=await Promise.all([database().query(`SELECT count(*)::int AS count FROM "user" WHERE ${where}`,[needle,filter]),database().query(`SELECT id,name,"phoneNumber",coalesce(role,'user') AS role,coalesce(banned,false) AS banned FROM "user" WHERE ${where} ORDER BY "createdAt" DESC,id LIMIT 15 OFFSET $3`,[needle,filter,(page-1)*15])]);
  return json({users:list.rows.map(user=>({...user,phoneNumber:maskPhone(user.phoneNumber)})),total:count.rows[0].count,page});
});}
export async function PATCH(request:Request){return handle(async()=>{
  guard(request,true);const actor=await requireSuperAdmin(request.headers),data=await body(request);
  if(Object.keys(data).some(key=>!["id","role","reason"].includes(key))||typeof data.id!=="string"||!accountRoles.includes(data.role as AccountRole)||typeof data.reason!=="string")throw new HttpError(400,"角色变更参数不正确");
  await changeAccountRole(actor.id,data.id,data.role as AccountRole,data.reason);
  return json({ok:true});
});}
