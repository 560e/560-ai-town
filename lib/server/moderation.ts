import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {audit,database,transaction} from './db.ts';
import {HttpError} from './http.ts';
import {isOperator} from '../roles.ts';
import {matchedWord,normalizedChat,wordRule,parseWordImport,type WordRule} from '../moderation.ts';
function validated<T>(fn:()=>T){try{return fn();}catch(e){throw new HttpError(400,(e as Error).message);}}
export async function assertAllowedMessage(client:PoolClient,text:string){
 const {rows}=await client.query('SELECT term,category,enabled FROM town_sensitive_words WHERE enabled');
 if(matchedWord(text,rows))throw new HttpError(422,'消息包含屏蔽词，请修改后再发送');
}
export async function managedWords(q:URLSearchParams){
 const page=Math.max(1,Math.min(10000,Number(q.get('page'))||1)),search=(q.get('q')||'').trim().slice(0,64),category=q.get('category')||'',status=q.get('status')||'';
 const args=[search,category,status],where="WHERE ($1='' OR position(lower($1) in lower(term))>0) AND ($2='' OR category=$2) AND ($3='' OR enabled=($3='enabled'))";
 const [list,total,counts]=await Promise.all([database().query(`SELECT id,term,category,enabled,version,updated_at FROM town_sensitive_words ${where} ORDER BY updated_at DESC,id LIMIT 50 OFFSET $4`,[...args,(Math.floor(page)-1)*50]),database().query(`SELECT count(*)::int AS total FROM town_sensitive_words ${where}`,args),database().query('SELECT count(*)::int AS total,count(*) FILTER(WHERE enabled)::int AS enabled FROM town_sensitive_words')]);
 return {items:list.rows,total:total.rows[0].total,page:Math.floor(page),counts:counts.rows[0]};
}
export async function mutateWords(actorId:string,input:Record<string,unknown>){return transaction(async client=>{
 const actor=(await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR SHARE',[actorId])).rows[0];
 if(!actor||actor.banned||!isOperator(actor.role))throw new HttpError(403,'仅运营管理员或超级管理员可维护词库');
 const fields:Record<string,string[]>={save:['id','version','rule'],batch:['items','action'],preview:['source','format'],import:['source','format'],test:['text']};
 const op=typeof input.op==='string'?input.op:'';
 if(!Object.hasOwn(fields,op)||Object.keys(input).some(k=>!['op',...fields[op]].includes(k)))throw new HttpError(400,'词库操作参数无效');
 if(op==='test'){
  if(typeof input.text!=='string'||input.text.length>2000)throw new HttpError(400,'测试文本最多 2000 个字符');
  const match=matchedWord(input.text,(await client.query('SELECT term,category,enabled FROM town_sensitive_words WHERE enabled')).rows);
  return {match:match?{term:match.term,category:match.category}:null};
 }
 await client.query("SELECT pg_advisory_xact_lock(hashtext('town:sensitive-words'))");
 if(op==='preview'||op==='import'){
  const parsed=validated(()=>parseWordImport(input.source,input.format));
  const existing=new Set((await client.query('SELECT canonical FROM town_sensitive_words')).rows.map(r=>r.canonical));
  const rules=parsed.rules.filter(r=>!existing.has(normalizedChat(r.term))),skipped=parsed.duplicates+parsed.rules.length-rules.length;
  if(op==='preview')return {rules:rules.slice(0,20),count:rules.length,skipped,errors:parsed.errors};
  if(parsed.errors.length)throw new HttpError(400,`第 ${parsed.errors[0].line} 行：${parsed.errors[0].error}。请修正后再导入，未写入任何词语。`);
  if(existing.size+rules.length>10000)throw new HttpError(400,'词库最多 10000 条，请先清理不需要的词语');
  for(const rule of rules)await client.query('INSERT INTO town_sensitive_words(id,term,canonical,category,enabled,updated_by) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),rule.term,normalizedChat(rule.term),rule.category,rule.enabled,actorId]);
  await audit(client,actorId,'moderation.import',null,{added:rules.length,skipped});return {ok:true,added:rules.length,skipped};
 }
 if(op==='save'){
  const rule=validated(()=>wordRule(input.rule));
  const current=input.id?(await client.query('SELECT * FROM town_sensitive_words WHERE id::text=$1',[String(input.id)])).rows[0]:null;
  if(input.id&&(!current||current.version!==input.version))throw new HttpError(409,'词条已更新或删除，请刷新后再编辑');
  if((await client.query('SELECT id FROM town_sensitive_words WHERE canonical=$1 AND id::text<>$2',[normalizedChat(rule.term),current?.id||''])).rowCount)throw new HttpError(409,'该词语已存在（忽略全半角、大小写、空格及标点）');
  if(!current&&(await client.query('SELECT count(*)::int AS count FROM town_sensitive_words')).rows[0].count>=10000)throw new HttpError(400,'词库已达 10000 条上限');
  if(current)await client.query('UPDATE town_sensitive_words SET term=$2,canonical=$3,category=$4,enabled=$5,version=version+1,updated_by=$6,updated_at=now() WHERE id=$1',[current.id,rule.term,normalizedChat(rule.term),rule.category,rule.enabled,actorId]);
  else await client.query('INSERT INTO town_sensitive_words(id,term,canonical,category,enabled,updated_by) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),rule.term,normalizedChat(rule.term),rule.category,rule.enabled,actorId]);
  await audit(client,actorId,'moderation.save',null,{before:current?{term:current.term,category:current.category,enabled:current.enabled}:null,after:rule});return {ok:true};
 }
 if(!['enable','disable','delete'].includes(input.action as string)||!Array.isArray(input.items)||!input.items.length||input.items.length>50)throw new HttpError(400,'每次请选择 1–50 个词条');
 const before:WordRule[]=[];const ids=new Set<string>();
 for(const item of input.items){
  if(!item||typeof item.id!=='string'||ids.has(item.id)||!Number.isInteger(item.version))throw new HttpError(400,'选择的词条无效或重复');ids.add(item.id);
  const current=(await client.query('SELECT * FROM town_sensitive_words WHERE id::text=$1',[item.id])).rows[0];
  if(!current||current.version!==item.version)throw new HttpError(409,'部分词条已更新，请刷新后重试；此次操作未保存');
  before.push({term:current.term,category:current.category,enabled:current.enabled});
  if(input.action==='delete')await client.query('DELETE FROM town_sensitive_words WHERE id=$1',[current.id]);
  else await client.query('UPDATE town_sensitive_words SET enabled=$2,version=version+1,updated_by=$3,updated_at=now() WHERE id=$1',[current.id,input.action==='enable',actorId]);
 }
 await audit(client,actorId,'moderation.batch',null,{action:input.action,count:before.length,before});return {ok:true};
});}
