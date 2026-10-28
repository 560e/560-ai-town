import {database} from "@/lib/server/db";
import {guard,handle,json} from "@/lib/server/http";
import {requireSuperAdmin} from "@/lib/server/session";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handle(async()=>{
  guard(request);await requireSuperAdmin(request.headers);
  const url=new URL(request.url),action=(url.searchParams.get("action")||"").slice(0,60),page=Math.min(100000,Math.max(1,Math.floor(Number(url.searchParams.get("page"))||1)));
  const [count,list]=await Promise.all([database().query('SELECT count(*)::int AS count FROM town_audit WHERE ($1=\'\' OR action=$1)',[action]),database().query(`SELECT a.id,a.action,a.created_at,a.details,u.name AS actor,t.name AS target FROM town_audit a LEFT JOIN "user" u ON a.actor_id=u.id LEFT JOIN "user" t ON a.target_id=t.id WHERE ($1='' OR a.action=$1) ORDER BY a.created_at DESC,a.id DESC LIMIT 25 OFFSET $2`,[action,(page-1)*25])]);
  return json({logs:list.rows.map(log=>({...log,details:{reason:log.details.reason,before:log.details.before,after:log.details.after}})),total:count.rows[0].count,page});
});}
