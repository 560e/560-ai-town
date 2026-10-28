import {database} from "@/lib/server/db";
import {guard,handle,json} from "@/lib/server/http";
import {requireUser} from "@/lib/server/session";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(request:Request){return handle(async()=>{
  guard(request);const actor=await requireUser(request.headers,true);
  const [counts,logs]=await Promise.all([
    database().query(`SELECT count(*)::int AS total,
      count(*) FILTER (WHERE NOT coalesce(banned,false))::int AS active,
      count(*) FILTER (WHERE banned=true)::int AS suspended,
      count(*) FILTER (WHERE "createdAt">=now()-interval '7 days')::int AS recent
      FROM "user"`),
    database().query(`SELECT id,action,created_at,details FROM town_audit
      WHERE actor_id=$1 ORDER BY created_at DESC,id DESC LIMIT 30`,[actor.id]),
  ]);
  return json({counts:counts.rows[0],logs:logs.rows,updatedAt:new Date().toISOString()});
});}
