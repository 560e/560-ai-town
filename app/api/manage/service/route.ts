import {handle,json,guard,body,HttpError} from '@/lib/server/http';
import {serviceActor,exposeAuthority,may,idValue} from '@/lib/server/service-core';
import {managedTitles,mutateTitles} from '@/lib/server/service-titles';
import {applicationDetail,managedApplications,manageDecision,batchApplications} from '@/lib/server/service-applications';
import {database} from '@/lib/server/db';
import {maskPhone,normalizePhone} from '@/lib/account';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{
  guard(request);const actor=await serviceActor(request.headers),q=new URL(request.url).searchParams,view=q.get('view')||'titles';
  if(view==='titles')return json({...await managedTitles(actor),authority:exposeAuthority(actor)});
  if(view==='application')return json(await applicationDetail(actor,idValue(q.get('id')),true));
  if(view==='resident'){
    if(!may(actor,'grant'))throw new HttpError(403,'没有定向授予权限');const phone=q.get('q')||'';if(!/^1[3-9]\d{9}$/.test(phone))throw new HttpError(400,'请输入完整的11位注册手机号查找居民');
    const row=(await database().query('SELECT id,name,"phoneNumber" FROM "user" WHERE "phoneNumber"=$1 AND NOT coalesce(banned,false)',[normalizePhone(phone)])).rows[0];return json({resident:row?{...row,phoneNumber:maskPhone(row.phoneNumber)}:null});
  }
  if(!['applications','grants'].includes(view))throw new HttpError(400,'未知列表');return json(await managedApplications(actor,q));
});}
export async function POST(request:Request){return handle(async()=>{guard(request,true);const actor=await serviceActor(request.headers),input=await body(request,65536);return json(input.op==='batchApplications'?await batchApplications(actor.id,input):['review','grant','revoke','deleteApplication'].includes(input.op as string)?await manageDecision(actor.id,input):await mutateTitles(actor.id,input));});}
