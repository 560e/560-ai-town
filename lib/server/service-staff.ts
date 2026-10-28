import {database,audit} from './db.ts';
import {HttpError} from './http.ts';
import {maskPhone} from '../account.ts';
import {keysOnly,textValue,serviceActions,type StaffPolicy} from '../service.ts';
import {serviceTransaction,validate,capabilities,checkVersion} from './service-core.ts';
export async function serviceStaff(q:string,page:number){const term=q.trim().slice(0,80),where=`WHERE role='admin' AND ($1='' OR name ILIKE '%'||$1||'%' OR "phoneNumber" LIKE '%'||$1||'%')`;
  const [list,count,titles,choices]=await Promise.all([database().query(`SELECT u.id,u.name,u."phoneNumber",u.banned,s.policy,coalesce(s.version,0) AS version FROM "user" u LEFT JOIN town_service_staff s ON s.user_id=u.id ${where} ORDER BY u."createdAt" DESC LIMIT 15 OFFSET $2`,[term,(page-1)*15]),database().query(`SELECT count(*)::int AS count FROM "user" ${where}`,[term]),database().query("SELECT id,draft->>'name' AS name FROM town_service_titles ORDER BY updated_at DESC"),capabilities()]);
  return {users:list.rows.map(u=>({...u,phoneNumber:maskPhone(u.phoneNumber)})),total:count.rows[0].count,page,titles:titles.rows,capabilities:choices};
}
export async function updateServiceStaff(actorId:string,input:Record<string,unknown>){return serviceTransaction(actorId,async(client,actor)=>{
  if(!actor.super)throw new HttpError(403,'仅超级管理员可分配服务岗位');validate(()=>keysOnly(input,['userId','version','policy','reason']));validate(()=>keysOnly(input.policy,['actions','titles','allTitles','permissions']));
  const userId=validate(()=>textValue(input.userId,'工作人员编号',128,true)),reason=validate(()=>textValue(input.reason,'授权原因',300,true)),policy=input.policy as StaffPolicy;
  if(!Array.isArray(policy.actions)||policy.actions.some(a=>!Object.hasOwn(serviceActions,a))||new Set(policy.actions).size!==policy.actions.length||!Array.isArray(policy.titles)||policy.titles.length>500||policy.titles.some(t=>typeof t!=='string')||!Array.isArray(policy.permissions)||policy.permissions.length>200||policy.permissions.some(p=>typeof p!=='string')||typeof policy.allTitles!=='boolean')throw new HttpError(400,'岗位配置无效');
  const target=(await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR UPDATE',[userId])).rows[0];if(!target||target.role!=='admin'||target.banned)throw new HttpError(400,'请先在工作人员授权中将正常账户设为运营管理员');
  const titles=(await client.query('SELECT id::text FROM town_service_titles')).rows.map(row=>row.id),choices=await capabilities(client);
  if(policy.titles.some(id=>!titles.includes(id))||policy.permissions.some(p=>!choices.some(c=>c.id===p)))throw new HttpError(400,'称号范围或允许分配的权限无效');
  const current=(await client.query('SELECT * FROM town_service_staff WHERE user_id=$1',[userId])).rows[0];checkVersion({version:current?.version||0},input.version);
  await client.query('INSERT INTO town_service_staff(user_id,policy,version) VALUES($1,$2,1) ON CONFLICT(user_id) DO UPDATE SET policy=$2,version=town_service_staff.version+1',[userId,JSON.stringify(policy)]);
  await audit(client,actor.id,'service.staff',userId,{reason,beforePolicy:current?.policy||null,afterPolicy:policy});return {ok:true};
});}
