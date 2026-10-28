export const defaultSiteSettings = {
  brand: {text:"五六零人工智能科技",logo:"",icon:"",title:"五六零人工智能AI小镇 · 学习、创业与生活",description:"探索五六零AI学院、创业园、商业街与AI社区，俯瞰七个街区，走进三维小镇。",shareImage:""},
  footer: {company:"五六零人工智能科技（北海）有限公司",copyright:"",icp:"",icpUrl:"",police:"",policeUrl:""},
};
export type SiteSettings=typeof defaultSiteSettings;
export type SettingsGroup=keyof SiteSettings;
export const assetPathPattern=/^\/api\/site-assets\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const settingLabels:Record<string,string>={text:"品牌文字",logo:"首页Logo",icon:"浏览器图标",title:"页面标题",description:"站点简介",shareImage:"分享封面",company:"公司全称",copyright:"版权说明",icp:"ICP备案号",icpUrl:"ICP查询链接",police:"公安联网备案号",policeUrl:"公安备案查询链接"};
export const fieldLimits:Record<string,number>={text:24,title:80,description:200,company:80,copyright:100,icp:50,police:60,icpUrl:500,policeUrl:500,logo:100,icon:100,shareImage:100};
export function safeFilingLink(value:string){try{const url=new URL(value);return url.protocol==="https:"&&!url.username&&!url.password&&url.hostname.includes(".");}catch{return false;}}
export function validateGroup(group:SettingsGroup,value:unknown):SiteSettings[SettingsGroup]{
  if(!value||typeof value!=="object"||Array.isArray(value))throw Error("配置格式错误");
  const data=value as Record<string,unknown>,keys=Object.keys(defaultSiteSettings[group]);
  if(Object.keys(data).length!==keys.length||Object.keys(data).some(key=>!keys.includes(key)))throw Error("配置字段不完整或包含未知字段");
  const clean:Record<string,string>={};
  for(const key of keys){
    if(typeof data[key]!=="string")throw Error(`${settingLabels[key]}应为文字`);
    const text=data[key].trim();
    if(text.length>fieldLimits[key]||/[\u0000-\u001f\u007f]/.test(text))throw Error(`${settingLabels[key]}过长或包含无效字符`);
    if(["text","title","description","company"].includes(key)&&!text)throw Error(`请填写${settingLabels[key]}`);
    if(["logo","icon","shareImage"].includes(key)&&text&&!assetPathPattern.test(text))throw Error("请选择本站上传的图片");
    if(key.endsWith("Url")&&text&&!safeFilingLink(text))throw Error("备案链接必须为有效的HTTPS地址");
    clean[key]=text;
  }
  if(group==="footer")for(const prefix of ["icp","police"])if(Boolean(clean[prefix])!==Boolean(clean[`${prefix}Url`]))throw Error("备案号码与查询链接需要一起填写，或一起留空");
  return clean as SiteSettings[SettingsGroup];
}
