import {database,audit} from './db.ts';
import {HttpError} from './http.ts';
import {validateTitle,keysOnly,textValue,titlePolicy,initialServiceContent,serviceCatalog,validateServiceCatalog,publicServiceCatalog,onServiceBoard,type TitleConfig,type GuideConfig,type ServiceContent} from '../service.ts';
import {serviceTransaction,uuid,idValue,checkVersion,validate,need,capabilities,checkBindings,may,type ServiceAuthority} from './service-core.ts';

export async function publicService(titleId?:string){
  const [titles,content,guides,choices]=await Promise.all([
    database().query("SELECT id,published_version AS version,published AS config FROM town_service_titles WHERE published IS NOT NULL AND published->>'visible'='true' AND published->>'archived'='false' AND ($1::uuid IS NULL OR id=$1) ORDER BY (published->>'featured')::boolean DESC,(published->>'order')::int,id",[titleId||null]),
    database().query('SELECT published FROM town_service_content WHERE id=1'),
    database().query("SELECT id,published->>'name' AS name FROM town_service_guides WHERE published IS NOT NULL AND published->>'public'='true' ORDER BY updated_at DESC LIMIT 200"),capabilities()]);
  if(titleId&&!titles.rowCount)throw new HttpError(404,'该称号未公开或已归档');
  const published:ServiceContent=content.rows[0]?.published||initialServiceContent;
  return {titles:titles.rows.filter(row=>titleId||onServiceBoard(row.config,published)).map(row=>({...row,benefits:choices.filter(c=>row.config.permissions.includes(c.id)).map(({id,name})=>({id,name}))})),content:{intro:published.intro,welcome:published.welcome,faq:published.faq},filters:publicServiceCatalog(published),guides:guides.rows};
}
export async function managedTitles(actor:ServiceAuthority){
  if(!actor.super&&!actor.policy.actions.length)throw new HttpError(403,'尚未获得服务中心岗位授权');
  const [titles,choices,guides,content]=await Promise.all([
    database().query(`SELECT t.*,(SELECT count(*)::int FROM town_service_grants g WHERE g.title_id=t.id AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>now())) AS holders FROM town_service_titles t WHERE $1::boolean OR id=ANY($2::uuid[]) ORDER BY updated_at DESC`,[actor.super||actor.policy.allTitles,actor.policy.titles]),capabilities(),
    may(actor,'content')?database().query('SELECT * FROM town_service_guides ORDER BY updated_at DESC LIMIT 200'):Promise.resolve({rows:[]}),
    may(actor,'content')?database().query('SELECT * FROM town_service_content WHERE id=1'):Promise.resolve({rows:[]})]);
  const published=(await database().query('SELECT published FROM town_service_content WHERE id=1')).rows[0]?.published||initialServiceContent;
  return {titles:titles.rows,capabilities:choices.filter(c=>actor.super||actor.policy.permissions.includes(c.id)),guides:guides.rows,content:content.rows[0]||null,catalog:serviceCatalog(published)};
}
export async function mutateTitles(actorId:string,input:Record<string,unknown>){
  return serviceTransaction(actorId,async(client,actor)=>{
    const op=input.op;
    if(op==='save'||op==='publish'){
      validate(()=>keysOnly(input,['op','id','version','config','impact','internalNote']));
      const id=input.id?idValue(input.id):null;need(actor,'edit',id||undefined);if(!id&&!actor.super&&!actor.policy.allTitles)throw new HttpError(403,'当前岗位不能新建称号');
      if(op==='publish')need(actor,'publish',id||undefined);
      const config=validate(()=>validateTitle(input.config));await checkBindings(client,actor,config.permissions);
      const existing=id?(await client.query('SELECT * FROM town_service_titles WHERE id=$1',[id])).rows[0]:null;
      const catalog=serviceCatalog((await client.query('SELECT published FROM town_service_content WHERE id=1')).rows[0]?.published||initialServiceContent);
      if(config.category&&!catalog.categories.some(c=>c.id===config.category&&(c.enabled||existing?.draft.category===c.id)))throw new HttpError(400,'请选择后台已发布的称号分类');
      if(id&&!existing)throw new HttpError(404,'称号不存在');if(existing)checkVersion(existing,input.version);
      if(existing?.published&&existing.published.kind!==config.kind)throw new HttpError(400,'发布后的称号类型不可变更，请另建称号');
      if(!existing){const count=await client.query('SELECT count(*)::int AS count FROM town_service_titles');if(count.rows[0].count>=500)throw new HttpError(400,'称号数量已达到本期500项上限');}
      const internalNote=input.internalNote===undefined?(existing?.internal_note||''):validate(()=>textValue(input.internalNote,'内部备注',2000));
      const currentId=id||uuid(),version=existing?existing.version+1:1;
      if(op==='publish'&&existing?.published&&JSON.stringify(existing.published.permissions)!==JSON.stringify(config.permissions)){
        const count=await client.query('SELECT count(*)::int AS count FROM town_service_grants WHERE title_id=$1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())',[id]);
        if(count.rows[0].count>0&&input.impact!==count.rows[0].count)throw new HttpError(409,`权限变更将影响${count.rows[0].count}位有效持有人，请重新读取并确认影响人数`);
        await client.query("INSERT INTO town_service_notices(user_id,message) SELECT DISTINCT user_id,$2 FROM town_service_grants WHERE title_id=$1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())",[id,`「${config.name}」的业务权益已更新，请在我的身份中查看。`]);
      }
      if(existing)await client.query('UPDATE town_service_titles SET version=$2,draft=$3,published=CASE WHEN $4 THEN $3::jsonb ELSE published END,published_version=CASE WHEN $4 THEN $2 ELSE published_version END,updated_at=now() WHERE id=$1',[currentId,version,JSON.stringify(config),op==='publish']);
      else await client.query('INSERT INTO town_service_titles(id,version,draft,published,published_version) VALUES($1,$2,$3,$4,$5)',[currentId,version,JSON.stringify(config),op==='publish'?JSON.stringify(config):null,op==='publish'?version:null]);
      await client.query('UPDATE town_service_titles SET internal_note=$2 WHERE id=$1',[currentId,internalNote]);
      if(op==='publish')await client.query('INSERT INTO town_service_title_versions(title_id,version,config,actor_id) VALUES($1,$2,$3,$4)',[currentId,version,JSON.stringify(config),actor.id]);
      await audit(client,actor.id,op==='publish'?'service.publish':'service.edit',null,{reason:`${op==='publish'?'发布':'保存'}称号「${config.name}」`,titleId:currentId,version,policyChanged:existing?.published?titlePolicy(existing.published)!==titlePolicy(config):false,previous:existing?.published||null,current:config});
      return {id:currentId,version};
    }
    if(op==='content'){
      validate(()=>keysOnly(input,['op','version','config','publish']));need(actor,'content');validate(()=>keysOnly(input.config,['intro','welcome','faq','catalog']));const data=input.config as Record<string,unknown>;
      const config={intro:validate(()=>textValue(data.intro,'服务介绍',1000,true)),welcome:validate(()=>textValue(data.welcome,'向导欢迎语',1000,true)),faq:validate(()=>textValue(data.faq,'办理说明',5000))};
      if(typeof input.publish!=='boolean')throw new HttpError(400,'发布方式无效');const row=(await client.query('SELECT * FROM town_service_content WHERE id=1')).rows[0];checkVersion(row,input.version);
      const catalog=data.catalog===undefined?serviceCatalog(row.draft):validate(()=>validateServiceCatalog(data.catalog));
      if(input.publish){const used=await client.query("SELECT DISTINCT category FROM town_service_titles CROSS JOIN LATERAL (VALUES(draft->>'category'),(published->>'category')) AS refs(category) WHERE category IS NOT NULL AND category<>''");if(used.rows.some(r=>!catalog.categories.some(c=>c.id===r.category)))throw new HttpError(400,'已有称号使用该分类，请关闭展示而不是删除分类');}
      const updated={...config,catalog};await client.query('UPDATE town_service_content SET version=version+1,draft=$1,published=CASE WHEN $2 THEN $1::jsonb ELSE published END WHERE id=1',[JSON.stringify(updated),input.publish]);
      await audit(client,actor.id,'service.content',null,{reason:input.publish?'发布展示板、分类、开放版块与NPC介绍':'保存服务展示配置草稿',previous:row.published,current:updated});return {ok:true};
    }
    if(op==='guide'){
      validate(()=>keysOnly(input,['op','id','version','config','publish']));need(actor,'content');validate(()=>keysOnly(input.config,['name','body','public']));const d=input.config as GuideConfig;
      const config={name:validate(()=>textValue(d.name,'资料名称',60,true)),body:validate(()=>textValue(d.body,'资料正文',10000,true)),public:d.public};
      if(typeof d.public!=='boolean'||typeof input.publish!=='boolean')throw new HttpError(400,'资料展示方式无效');
      const id=input.id?idValue(input.id):uuid(),row=input.id?(await client.query('SELECT * FROM town_service_guides WHERE id=$1',[id])).rows[0]:null;
      if(input.id&&!row)throw new HttpError(404,'资料不存在');if(row)checkVersion(row,input.version);
      if(row?.published&&row.published.public!==config.public)throw new HttpError(400,'已发布资料的公开方式不可变更，请创建新的资料以避免意外扩大访问范围');
      if(row)await client.query('UPDATE town_service_guides SET version=version+1,draft=$2,published=CASE WHEN $3 THEN $2::jsonb ELSE published END,updated_at=now() WHERE id=$1',[id,JSON.stringify(config),input.publish]);
      else {const count=await client.query('SELECT count(*)::int AS count FROM town_service_guides');if(count.rows[0].count>=200)throw new HttpError(400,'资料数量已达到本期200项上限');await client.query('INSERT INTO town_service_guides(id,draft,published) VALUES($1,$2,$3)',[id,JSON.stringify(config),input.publish?JSON.stringify(config):null]);}
      await audit(client,actor.id,'service.content',null,{reason:`${input.publish?'发布':'保存'}资料「${config.name}」`,guideId:id});return {id};
    }
    throw new HttpError(400,'未知操作');
  });
}
