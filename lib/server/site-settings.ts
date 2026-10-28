import {cache} from "react";
import {database,transaction,audit} from "./db.ts";
import {HttpError} from "./http.ts";
import {defaultSiteSettings,validateGroup,type SiteSettings,type SettingsGroup} from "../site-settings.ts";

export async function readSiteSettings(){
  const {rows}=await database().query('SELECT s.version,s.settings,s.updated_at,u.name AS actor FROM town_site_settings s LEFT JOIN "user" u ON u.id=s.actor_id WHERE s.id=1');
  return rows[0] as {version:number;settings:SiteSettings;updated_at:string;actor:string|null}|undefined;
}
// Only this allowlisted public value is ever passed to the root client provider.
export const publicSiteSettings=cache(async():Promise<SiteSettings>=>{
  try{if(!process.env.DATABASE_URL)return defaultSiteSettings;const row=await readSiteSettings();if(!row)return defaultSiteSettings;return {brand:validateGroup("brand",row.settings.brand) as SiteSettings["brand"],footer:validateGroup("footer",row.settings.footer) as SiteSettings["footer"]};}
  catch{return defaultSiteSettings;}
});
export async function settingsHistory(){
  const row=await readSiteSettings();
  if(!row)throw new HttpError(503,"请先运行 npm run db:migrate 更新站点配置结构");
  const history=await database().query('SELECT h.settings,h.version,h.changed_group,h.restored_from,h.created_at,u.name AS actor FROM town_site_versions h LEFT JOIN "user" u ON u.id=h.actor_id ORDER BY h.version DESC LIMIT 20');
  const previous:Partial<Record<SettingsGroup,{version:number;value:SiteSettings[SettingsGroup]}>>={};
  for(const group of ["brand","footer"] as const){const result=await database().query("SELECT version,settings->$1 AS value FROM town_site_versions WHERE settings->$1 IS DISTINCT FROM $2::jsonb ORDER BY version DESC LIMIT 1",[group,JSON.stringify(row.settings[group])]);if(result.rows[0])previous[group]=result.rows[0];}
  return {...row,history:history.rows,previous};
}
export async function writeSiteSettings(actorId:string,input:Record<string,unknown>){
  if(Object.keys(input).some(key=>!["version","group","value","restore"].includes(key)))throw new HttpError(400,"未知设置字段");
  const group=input.group as SettingsGroup;
  if(!["brand","footer"].includes(group)||!Number.isSafeInteger(input.version)||(input.version as number)<0)throw new HttpError(400,"配置版本或分类无效");
  if(input.restore!==undefined&&input.restore!==true)throw new HttpError(400,"恢复参数无效");
  if(input.restore&&input.value!==undefined)throw new HttpError(400,"恢复时不能提交其他设置");
  return transaction(async client=>{
    const actor=await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR UPDATE',[actorId]);
    if(actor.rows[0]?.role!=="super_admin"||actor.rows[0]?.banned)throw new HttpError(403,"超级管理员权限已失效");
    const {rows}=await client.query("SELECT version,settings FROM town_site_settings WHERE id=1 FOR UPDATE");
    const row=rows[0];if(!row)throw new HttpError(503,"站点配置尚未初始化");
    if(row.version!==input.version)throw new HttpError(409,"其他管理员已更新配置，请重新读取后再编辑；当前输入已保留");
    let value=input.value,restoredFrom:number|null=null;
    if(input.restore){const previous=await client.query("SELECT version,settings->$1 AS value FROM town_site_versions WHERE settings->$1 IS DISTINCT FROM $2::jsonb ORDER BY version DESC LIMIT 1",[group,JSON.stringify(row.settings[group])]);if(!previous.rows[0])throw new HttpError(400,"没有可恢复的上一版");value=previous.rows[0].value;restoredFrom=previous.rows[0].version;}
    let clean:SiteSettings[SettingsGroup];try{clean=validateGroup(group,value);}catch(error){throw new HttpError(400,(error as Error).message);}
    if(group==="brand")for(const key of ["logo","icon","shareImage"] as const){const path=(clean as SiteSettings["brand"])[key];if(path){const asset=await client.query("SELECT id FROM town_site_assets WHERE id=$1",[path.split("/").pop()]);if(!asset.rowCount)throw new HttpError(400,"图片不存在，请重新上传");}}
    if(Object.entries(clean).every(([key,value])=>row.settings[group][key]===value))return {version:row.version,unchanged:true};
    const settings={...row.settings,[group]:clean},version=row.version+1;
    await client.query("UPDATE town_site_settings SET version=$1,settings=$2,actor_id=$3,updated_at=now() WHERE id=1",[version,JSON.stringify(settings),actorId]);
    await client.query("INSERT INTO town_site_versions(version,settings,actor_id,changed_group,restored_from) VALUES($1,$2,$3,$4,$5)",[version,JSON.stringify(settings),actorId,group,restoredFrom]);
    await audit(client,actorId,input.restore?"site.restore":"site.update",null,{reason:`${group==="brand"?"站点品牌":"公司与备案"}：版本 ${row.version} → ${version}${restoredFrom!==null?`，恢复自版本 ${restoredFrom}`:""}`,beforeSettings:row.settings[group],afterSettings:clean,version,group});
    return {version};
  });
}
