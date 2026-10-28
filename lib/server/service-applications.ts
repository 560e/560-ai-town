import type {PoolClient} from 'pg';
import {database,audit} from './db.ts';
import {HttpError} from './http.ts';
import {validateAnswers,keysOnly,textValue,titlePolicy,type TitleConfig} from '../service.ts';
import {serviceTransaction,uuid,idValue,checkVersion,validate,need,notify,award,effectivePermissions,may,revision,type ServiceAuthority} from './service-core.ts';
const perPage=20;
export function pageValue(value:string|null){return Math.max(1,Math.min(10000,Math.floor(Number(value)||1)));}
async function event(client:PoolClient,id:string,actorId:string,action:string,message:string,snapshot:unknown=null){await client.query('INSERT INTO town_service_events(application_id,actor_id,action,message,snapshot) VALUES($1,$2,$3,$4,$5)',[id,actorId,action,message,snapshot?JSON.stringify(snapshot):null]);}
export async function myService(userId:string,page=1){
  const [apps,grants,notices,count,rights,open]=await Promise.all([
    database().query('SELECT a.*,t.published AS latest,t.published_version AS latest_version FROM town_service_applications a JOIN town_service_titles t ON t.id=a.title_id WHERE a.user_id=$1 AND a.deleted_at IS NULL ORDER BY a.updated_at DESC LIMIT $2 OFFSET $3',[userId,perPage,(page-1)*perPage]),
    database().query('SELECT g.*,t.published AS current, (g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>now())) AS active FROM town_service_grants g JOIN town_service_titles t ON t.id=g.title_id WHERE g.user_id=$1 ORDER BY g.created_at DESC',[userId]),
    database().query('SELECT id,message,application_id,created_at,read_at FROM town_service_notices WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[userId]),
    database().query('SELECT count(*)::int AS count FROM town_service_applications WHERE user_id=$1 AND deleted_at IS NULL',[userId]),effectivePermissions(userId),
    database().query("SELECT a.id,a.title_id,a.status,COALESCE(a.draft_snapshot->'config'->>'name',a.snapshot->'config'->>'name') AS name FROM town_service_applications a WHERE a.user_id=$1 AND a.deleted_at IS NULL AND a.status IN ('draft','pending','returned') ORDER BY a.updated_at DESC",[userId])]);
  const gids=rights.map(p=>p.split(':')[1]);const guides=gids.length?(await database().query("SELECT id,published->>'name' AS name FROM town_service_guides WHERE id=ANY($1::uuid[]) AND published IS NOT NULL",[gids])).rows:[];
  return {applications:apps.rows,openApplications:open.rows,grants:grants.rows,notices:notices.rows,total:count.rows[0].count,page,guides};
}
export async function applicationDetail(actor:ServiceAuthority,id:string,manage=false){
  const row=(await database().query('SELECT a.*,u.name AS resident,t.published AS latest,t.published_version AS latest_version FROM town_service_applications a JOIN "user" u ON u.id=a.user_id JOIN town_service_titles t ON t.id=a.title_id WHERE a.id=$1',[id])).rows[0];
  if(!row||row.deleted_at)throw new HttpError(404,'申请不存在或已删除');
  if(manage){need(actor,'review',row.title_id);if(row.status==='draft')throw new HttpError(404,'申请尚未提交');delete row.draft_answers;delete row.draft_snapshot;}
  else if(row.user_id!==actor.id)throw new HttpError(404,'申请不存在');
  const events=(await database().query('SELECT id,action,message,snapshot,created_at FROM town_service_events WHERE application_id=$1 ORDER BY created_at,id',[id])).rows;
  return {application:row,events};
}
export async function mutateApplication(actorId:string,input:Record<string,unknown>){return serviceTransaction(actorId,async(client,actor)=>{
  const op=input.op;
  if(op==='read'){validate(()=>keysOnly(input,['op','id']));const id=String(input.id);if(!/^\d+$/.test(id))throw new HttpError(400,'通知编号无效');await client.query('UPDATE town_service_notices SET read_at=now() WHERE id=$1 AND user_id=$2',[id,actor.id]);return {ok:true};}
  validate(()=>keysOnly(input,['op','id','titleId','version','answers','termsVersion','confirmTerms']));
  if(!['draft','submit','withdraw'].includes(op as string))throw new HttpError(400,'申请操作无效');
  const existing=input.id?(await client.query('SELECT * FROM town_service_applications WHERE id=$1 AND user_id=$2',[idValue(input.id),actor.id])).rows[0]:null;
  if(input.id&&(!existing||existing.deleted_at))throw new HttpError(404,'申请不存在');if(existing)checkVersion(existing,input.version);
  if(op==='withdraw'){
    if(!existing||!['draft','pending','returned'].includes(existing.status))throw new HttpError(409,'当前申请不能撤回');
    await client.query("UPDATE town_service_applications SET status='withdrawn',version=version+1,updated_at=now() WHERE id=$1",[existing.id]);
    await event(client,existing.id,actor.id,'withdrawn','申请人撤回申请');await audit(client,actor.id,'service.apply',actor.id,{reason:'撤回申请',applicationId:existing.id});return {id:existing.id};
  }
  if(existing&&!['draft','returned'].includes(existing.status))throw new HttpError(409,'当前申请不可编辑，请先查看处理结果');
  const titleId=existing?.title_id||idValue(input.titleId);
  const title=(await client.query('SELECT * FROM town_service_titles WHERE id=$1',[titleId])).rows[0];
  const config=title?.published as TitleConfig|null;
  if(!config)throw new HttpError(404,'称号尚未开放');
  if((!existing||existing.status==='draft')&&(!config.visible||!config.accepting||config.archived))throw new HttpError(403,'此称号目前不开放新申请');
  if(!existing){const duplicate=await client.query("SELECT id FROM town_service_applications WHERE user_id=$1 AND title_id=$2 AND deleted_at IS NULL AND status IN('draft','pending','returned')",[actor.id,titleId]);if(duplicate.rowCount)throw new HttpError(409,'已有进行中的申请，请到我的申请继续办理');}
  const active=await client.query('SELECT id FROM town_service_grants WHERE user_id=$1 AND title_id=$2 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())',[actor.id,titleId]);if(active.rowCount)throw new HttpError(409,'你已持有该称号');
  if(input.termsVersion!==title.published_version)throw new HttpError(409,'条件或表单已更新，请重新读取并确认当前版本');
  if(op==='submit'&&input.confirmTerms!==true)throw new HttpError(400,'请确认当前申请条件和权益');
  const answers=validate(()=>validateAnswers(config,input.answers,op==='submit'));
  const snapshot={config,version:title.published_version},id=existing?.id||uuid(),submit=op==='submit',status=submit?'pending':existing?.status||'draft';
  if(existing)await client.query('UPDATE town_service_applications SET status=$2,version=version+1,answers=CASE WHEN $3 THEN $4::jsonb ELSE answers END,snapshot=CASE WHEN $3 THEN $5::jsonb ELSE snapshot END,draft_answers=CASE WHEN $3 THEN NULL ELSE $4::jsonb END,draft_snapshot=CASE WHEN $3 THEN NULL ELSE $5::jsonb END,updated_at=now() WHERE id=$1',[id,status,submit,JSON.stringify(answers),JSON.stringify(snapshot)]);
  else await client.query('INSERT INTO town_service_applications(id,user_id,title_id,status,answers,snapshot,draft_answers,draft_snapshot) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,actor.id,titleId,status,JSON.stringify(submit?answers:{}),JSON.stringify(snapshot),submit?null:JSON.stringify(answers),submit?null:JSON.stringify(snapshot)]);
  if(submit){await event(client,id,actor.id,'pending','申请已提交，等待审核',{answers,...snapshot});await audit(client,actor.id,'service.apply',actor.id,{reason:`提交「${config.name}」申请`,applicationId:id});}
  return {id};
});}
export async function managedApplications(actor:ServiceAuthority,query:URLSearchParams){
  const view=query.get('view')||'applications',action=view==='grants'?'revoke':'review';
  if(!may(actor,action)&&!(view==='grants'&&may(actor,'grant')))throw new HttpError(403,'没有此列表的服务中心权限');
  const page=pageValue(query.get('page')),status=(query.get('status')||'').slice(0,20),q=(query.get('q')||'').trim().slice(0,80),title=query.get('title')?idValue(query.get('title')):null;
  const params=[actor.super||actor.policy.allTitles,actor.policy.titles,status,q,title];
  if(view==='grants'){
    const where=`WHERE ($1::boolean OR g.title_id=ANY($2::uuid[])) AND ($3='' OR ($3='active' AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>now())) OR ($3='revoked' AND g.revoked_at IS NOT NULL) OR ($3='expired' AND g.revoked_at IS NULL AND g.expires_at<=now())) AND ($4='' OR u.name ILIKE '%'||$4||'%' OR g.id::text=$4) AND ($5::uuid IS NULL OR g.title_id=$5)`;
    const from=`FROM town_service_grants g JOIN "user" u ON u.id=g.user_id JOIN town_service_titles t ON t.id=g.title_id ${where}`;
    const [list,count]=await Promise.all([database().query(`SELECT g.*,u.name AS resident,t.published AS current,(g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>now())) AS active ${from} ORDER BY g.created_at DESC LIMIT 20 OFFSET $6`,[...params,(page-1)*20]),database().query(`SELECT count(*)::int AS count ${from}`,params)]);return {items:list.rows,total:count.rows[0].count,page};
  }
  const where=`WHERE a.deleted_at IS NULL AND a.status<>'draft' AND ($1::boolean OR a.title_id=ANY($2::uuid[])) AND ($3='' OR a.status=$3) AND ($4='' OR u.name ILIKE '%'||$4||'%' OR a.id::text=$4) AND ($5::uuid IS NULL OR a.title_id=$5)`;
  const from=`FROM town_service_applications a JOIN "user" u ON u.id=a.user_id ${where}`;
  const [list,count,counts]=await Promise.all([database().query(`SELECT a.id,a.user_id,a.title_id,a.version,a.status,a.snapshot->'config'->>'name' AS title_name,a.updated_at,u.name AS resident ${from} ORDER BY a.updated_at DESC LIMIT 20 OFFSET $6`,[...params,(page-1)*20]),database().query(`SELECT count(*)::int AS count ${from}`,params),database().query("SELECT status,count(*)::int AS count FROM town_service_applications WHERE deleted_at IS NULL AND status<>'draft' AND ($1::boolean OR title_id=ANY($2::uuid[])) GROUP BY status",params.slice(0,2))]);
  return {items:list.rows,total:count.rows[0].count,page,counts:Object.fromEntries(counts.rows.map(r=>[r.status,r.count]))};
}
async function decide(client:PoolClient,actor:ServiceAuthority,input:Record<string,unknown>){
  const op=input.op,reason=validate(()=>textValue(input.reason,'处理原因',500,true));
  if(op==='review'){
    validate(()=>keysOnly(input,['op','id','version','decision','reason']));const id=idValue(input.id),row=(await client.query('SELECT * FROM town_service_applications WHERE id=$1',[id])).rows[0];if(!row||row.deleted_at)throw new HttpError(404,'申请不存在或已删除');need(actor,'review',row.title_id);checkVersion(row,input.version);
    if(row.status!=='pending')throw new HttpError(409,'申请已被处理或不在待审核状态');
    if(!['approved','returned','rejected'].includes(input.decision as string))throw new HttpError(400,'审核结果无效');
    const title=(await client.query('SELECT published FROM town_service_titles WHERE id=$1',[row.title_id])).rows[0];let status=input.decision as string,message=reason;
    if(status==='approved'){
      if(titlePolicy(row.snapshot.config)!==titlePolicy(title.published)){status='returned';message='申请条件或权益已更新，请在申请详情确认新版本并重新提交。';}
      else await award(client,actor,row.user_id,row.title_id,title.published,reason,id);
    }
    await client.query('UPDATE town_service_applications SET status=$2,version=version+1,updated_at=now() WHERE id=$1',[id,status]);await event(client,id,actor.id,status,message);if(status!=='approved')await notify(client,row.user_id,`「${row.snapshot.config.name}」：${message}`,id);
    await audit(client,actor.id,'service.review',row.user_id,{reason:message,applicationId:id,result:status});return {status};
  }
  if(op==='deleteApplication'){
    validate(()=>keysOnly(input,['op','id','version','reason']));
    const id=idValue(input.id),row=(await client.query('SELECT * FROM town_service_applications WHERE id=$1',[id])).rows[0];
    if(!row||row.status==='draft')throw new HttpError(404,'申请不存在或尚未提交');
    need(actor,'review',row.title_id);checkVersion(row,input.version);
    if(row.deleted_at)throw new HttpError(409,'申请已经删除');
    await client.query('UPDATE town_service_applications SET deleted_at=now(),deleted_by=$2,deleted_reason=$3,version=version+1,updated_at=now() WHERE id=$1',[id,actor.id,reason]);
    await event(client,id,actor.id,'deleted',reason);
    await audit(client,actor.id,'service.application.delete',row.user_id,{reason,applicationId:id,previousStatus:row.status});
    await client.query('UPDATE town_service_notices SET application_id=NULL WHERE application_id=$1',[id]);
    await notify(client,row.user_id,`「${row.snapshot.config.name}」申请记录已删除。${reason}`);
    return {status:'deleted'};
  }
  if(op==='grant'){
    validate(()=>keysOnly(input,['op','titleId','userId','version','reason']));const titleId=idValue(input.titleId);need(actor,'grant',titleId);const title=(await client.query('SELECT * FROM town_service_titles WHERE id=$1',[titleId])).rows[0];if(!title?.published||title.published.archived)throw new HttpError(400,'请选择未归档的已发布称号');checkVersion(title,input.version);
    const userId=validate(()=>textValue(input.userId,'居民编号',128,true));const id=await award(client,actor,userId,titleId,title.published,reason);return {id};
  }
  if(op==='revoke'){
    validate(()=>keysOnly(input,['op','id','reason']));const id=idValue(input.id),grant=(await client.query('SELECT * FROM town_service_grants WHERE id=$1',[id])).rows[0];if(!grant)throw new HttpError(404,'授予记录不存在');need(actor,'revoke',grant.title_id);if(grant.revoked_at)throw new HttpError(409,'该称号已撤销');
    await client.query('UPDATE town_service_grants SET revoked_at=now(),revoke_reason=$2 WHERE id=$1',[id,reason]);await notify(client,grant.user_id,`「${grant.snapshot.name}」已撤销。${reason}`);await audit(client,actor.id,'service.revoke',grant.user_id,{reason,grantId:id,titleId:grant.title_id});return {ok:true};
  }
  throw new HttpError(400,'未知处理操作');
}
export async function manageDecision(actorId:string,input:Record<string,unknown>){
  return serviceTransaction(actorId,(client,actor)=>decide(client,actor,input));
}
export async function batchApplications(actorId:string,input:Record<string,unknown>){
  validate(()=>keysOnly(input,['op','items','decision','reason']));
  const reason=validate(()=>textValue(input.reason,'处理原因',500,true));
  if(!['approved','returned','rejected','deleted'].includes(input.decision as string))throw new HttpError(400,'批量操作无效');
  if(!Array.isArray(input.items)||input.items.length<1||input.items.length>50)throw new HttpError(400,'每批请选择1–50条申请');
  const items=input.items.map(value=>{
    if(!value||typeof value!=='object'||Array.isArray(value))throw new HttpError(400,'申请参数无效');
    validate(()=>keysOnly(value,['id','version']));
    return {id:idValue(value.id),version:revision(value.version)};
  });
  if(new Set(items.map(item=>item.id)).size!==items.length)throw new HttpError(400,'不能重复选择同一申请');
  return serviceTransaction(actorId,async(client,actor)=>{
    need(actor,'review');
    const results:{id:string;ok:boolean;status?:string;error?:string}[]=[];
    for(const item of items){
      await client.query('SAVEPOINT application_item');
      try{
        const result=await decide(client,actor,{...item,reason,op:input.decision==='deleted'?'deleteApplication':'review',...(input.decision==='deleted'?{}:{decision:input.decision})});
        results.push({id:item.id,ok:true,status:'status'in result?result.status:undefined});
        await client.query('RELEASE SAVEPOINT application_item');
      }catch(error){
        await client.query('ROLLBACK TO SAVEPOINT application_item');
        if(!(error instanceof HttpError))throw error;
        results.push({id:item.id,ok:false,error:error.message});
        await client.query('RELEASE SAVEPOINT application_item');
      }
    }
    return {results};
  });
}
