import type {PoolClient} from 'pg';
import {database,audit} from './db.ts';
import {HttpError} from './http.ts';
import {serviceTransaction,validate} from './service-core.ts';
import {keysOnly,type TitleConfig} from '../service.ts';
import {residentBadge,identityPresets,validateIdentitySelection,type IdentityBadge,type IdentityChoice,type IdentityPreferences} from '../identity-display.ts';
type Reader=Pick<PoolClient,'query'>;
export async function identityChoices(userIds:string[],client:Reader=database()){
 const result=new Map<string,IdentityChoice[]>();
 const {rows}=await client.query(`SELECT g.id,g.user_id,g.expires_at,t.published FROM town_service_grants g JOIN town_service_titles t ON t.id=g.title_id JOIN "user" u ON u.id=g.user_id WHERE g.user_id=ANY($1::text[]) AND COALESCE(u.banned,false)=false AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>now()) AND t.published IS NOT NULL ORDER BY g.created_at,g.id`,[userIds]);
 for(const row of rows){const c=row.published as TitleConfig;const list=result.get(row.user_id)||[];list.push({id:row.id,name:c.name,style:c.overheadStyle||identityPresets.blue.style,expiresAt:row.expires_at?new Date(row.expires_at).toISOString():null,allowed:c.overheadAllowed===true,kind:c.kind});result.set(row.user_id,list);}
 return result;
}
export async function publicIdentityBadges(userIds:string[],client:Reader=database()):Promise<Map<string,IdentityBadge[]>>{
 if(!userIds.length)return new Map();
 const {rows}=await client.query(`SELECT u.id AS user_id,pick.id,pick.ord,g.expires_at,t.published FROM "user" u LEFT JOIN town_profiles p ON p.user_id=u.id CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(p.identity_display,'["resident"]'::jsonb)) WITH ORDINALITY AS pick(id,ord) LEFT JOIN town_service_grants g ON g.id::text=pick.id AND g.user_id=u.id AND g.revoked_at IS NULL AND (g.expires_at IS NULL OR g.expires_at>now()) LEFT JOIN town_service_titles t ON t.id=g.title_id WHERE u.id=ANY($1::text[]) AND COALESCE(u.banned,false)=false AND pick.ord<=10 ORDER BY u.id,pick.ord`,[userIds]);
 const result=new Map<string,IdentityBadge[]>();
 for(const row of rows){let badge:IdentityBadge;const c=row.published as TitleConfig|null;
  if(row.id==='resident')badge=residentBadge;
  else if(c?.overheadAllowed===true)badge={id:row.id,name:c.name,style:c.overheadStyle||identityPresets.blue.style,expiresAt:row.expires_at?new Date(row.expires_at).toISOString():null};
  else continue;
  const list=result.get(row.user_id)||[];list.push(badge);result.set(row.user_id,list);
 }
 return result;
}
export async function myIdentityPreferences(userId:string,client:Reader=database()):Promise<IdentityPreferences>{
 const [prefs,all]=await Promise.all([client.query('SELECT identity_display,identity_display_version FROM town_profiles WHERE user_id=$1',[userId]),identityChoices([userId],client)]);
 const choices:IdentityChoice[]=[{...residentBadge,allowed:true,kind:'resident'},...(all.get(userId)||[])],eligible=new Set(choices.filter(c=>c.allowed).map(c=>c.id));
 return {version:prefs.rows[0]?.identity_display_version??0,selected:(prefs.rows[0]?.identity_display??['resident']).filter((id:string)=>eligible.has(id)),choices};
}
export async function saveIdentityPreferences(userId:string,input:Record<string,unknown>){
 validate(()=>keysOnly(input,['selected','version']));const selected=validate(()=>validateIdentitySelection(input.selected));
 if(!Number.isSafeInteger(input.version)||Number(input.version)<0)throw new HttpError(400,'展示设置版本无效');
 return serviceTransaction(userId,async(client)=>{
  await client.query('INSERT INTO town_profiles(user_id) VALUES($1) ON CONFLICT DO NOTHING',[userId]);
  const current=await myIdentityPreferences(userId,client);
  if(current.version!==input.version)throw new HttpError(409,'展示设置已在其他页面更新，请重新读取后保存');
  if(selected.some(id=>!current.choices.some(c=>c.id===id&&c.allowed)))throw new HttpError(400,'所选身份已失效或未开放头顶展示，请重新读取');
  await client.query('UPDATE town_profiles SET identity_display=$2,identity_display_version=identity_display_version+1 WHERE user_id=$1',[userId,JSON.stringify(selected)]);
  await audit(client,userId,'identity.display.update',userId,{selected});
  return myIdentityPreferences(userId,client);
 });
}
