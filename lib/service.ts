import {validateBadgeStyle,identityPresets,type BadgeStyle} from './identity-display.ts';
export const serviceActions={edit:"维护称号",publish:"发布称号",review:"审核申请",grant:"定向授予",revoke:"撤销称号",content:"维护展示板、向导与资料"};
export type ServiceAction=keyof typeof serviceActions;
export const districtOptions=[['civic-hall','AI服务中心'],['learning-campus','AI学院'],['office-campus','AI创业园'],['creative-street','AI商业街'],['task-square','任务广场'],['ai-community','AI社区'],['town-square','五六零AI广场']] as const;
export const badges={star:"★",wave:"≈",spark:"✦",leaf:"❧",book:"▤",diamond:"◇"};
export const colors={blue:"#287cba",green:"#278975",orange:"#bf782e",purple:"#8062ac"};
export const statuses:Record<string,string>={draft:"草稿",pending:"待审核",returned:"需补充",approved:"已通过",rejected:"未通过",withdrawn:"已撤回"};
export type FormField={id:string;label:string;kind:"short"|"long"|"single"|"multi"|"url";required:boolean;help:string;options:string[]};
export type TitleConfig={overheadAllowed?:boolean;overheadStyle?:BadgeStyle;name:string;category?:string;kind:"honor"|"permission";badge:keyof typeof badges;color:keyof typeof colors;summary:string;description:string;district:string;visible:boolean;accepting:boolean;archived:boolean;featured:boolean;order:number;days:number;conditions:string;npc:string;fields:FormField[];permissions:string[]};
export type TitleRecord={id:string;version:number;draft:TitleConfig;published:TitleConfig|null;published_version:number|null;holders:number;internal_note:string;updated_at:string};
export type PublicTitle={id:string;version:number;config:TitleConfig;benefits:{id:string;name:string}[]};
export type GuideConfig={name:string;body:string;public:boolean};
export type ServiceCategory={id:string;name:string;enabled:boolean};
export type ServiceCatalog={categories:ServiceCategory[];districts:string[]};
export type ServiceContent={intro:string;welcome:string;faq:string;catalog?:ServiceCatalog};
export const initialServiceCatalog:ServiceCatalog={categories:[],districts:['civic-hall']};
export function serviceCatalog(content:ServiceContent):ServiceCatalog{return content.catalog||initialServiceCatalog;}
export function validateServiceCatalog(input:unknown):ServiceCatalog{
 keysOnly(input,['categories','districts']);
 if(!Array.isArray(input.categories)||input.categories.length>40||!Array.isArray(input.districts))throw Error('分类最多40项，开放版块必须为列表');
 const ids=new Set<string>(),names=new Set<string>();
 const categories=input.categories.map(raw=>{keysOnly(raw,['id','name','enabled']);if(typeof raw.id!=='string'||!/^cat_[a-z0-9_]{1,40}$/.test(raw.id)||ids.has(raw.id)||typeof raw.enabled!=='boolean')throw Error('分类标识重复或无效');const name=textValue(raw.name,'分类名称',20,true);if(names.has(name))throw Error('分类名称不能重复');ids.add(raw.id);names.add(name);return {id:raw.id,name,enabled:raw.enabled};});
 const districts=input.districts as string[];if(new Set(districts).size!==districts.length||districts.some(id=>!districtOptions.some(([key])=>key===id)))throw Error('开放版块包含重复或未知的版块');
 return {categories,districts};
}
export function publicServiceCatalog(content:ServiceContent){const catalog=serviceCatalog(content);return {categories:catalog.categories.filter(c=>c.enabled).map(({id,name})=>({id,name})),districts:catalog.districts.map(id=>({id,name:districtOptions.find(([key])=>key===id)![1]}))};}
export function onServiceBoard(config:TitleConfig,content:ServiceContent){const catalog=serviceCatalog(content);return config.visible&&!config.archived&&catalog.districts.includes(config.district)&&(!config.category||catalog.categories.some(c=>c.id===config.category&&c.enabled));}
export const initialServiceContent:ServiceContent={intro:"在这里了解小镇身份、申请所需服务，开启你的学习与共创之旅。",welcome:"你好，我是服务向导。想了解某个称号的用途和申请条件，可以在展示板选择它，我来为你介绍。",faq:"注册后即为小镇居民。荣誉称号用于表彰与展示；权限称号提供具体业务资格。你可以同时拥有多个称号。"};
export function emptyTitle():TitleConfig{return {overheadAllowed:false,overheadStyle:identityPresets.blue.style,name:"",category:"",kind:"honor",badge:"star",color:"blue",summary:"",description:"",district:"civic-hall",visible:false,accepting:false,archived:false,featured:false,order:0,days:0,conditions:"",npc:"",fields:[],permissions:[]};}
export function keysOnly(value:unknown,keys:string[]):asserts value is Record<string,unknown>{if(!value||typeof value!=="object"||Array.isArray(value)||Object.keys(value).some(key=>!keys.includes(key)))throw Error("提交内容包含未知字段或格式不正确");}
export function textValue(value:unknown,label:string,max:number,required=false){if(typeof value!=="string")throw Error(`${label}格式不正确`);const text=value.trim();if((required&&!text)||text.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(text))throw Error(`${label}不能为空或超出${max}字限制`);return text;}
export function validateTitle(input:unknown):TitleConfig{
  const defaults=emptyTitle();keysOnly(input,Object.keys(defaults));
  const c={...defaults,...input} as TitleConfig;
  if(typeof c.overheadAllowed!=='boolean')throw Error('头顶展示状态无效');
  c.overheadStyle=validateBadgeStyle(c.overheadStyle);
  if(typeof c.category!=='string'||(c.category&&!/^cat_[a-z0-9_]{1,40}$/.test(c.category)))throw Error('称号分类标识无效');
  for(const [key,max,required] of [['name',30,true],['summary',100,true],['description',2000,false],['conditions',1500,false],['npc',500,false]] as const)c[key]=textValue(c[key],key==='name'?'称号名称':key==='summary'?'简要介绍':'说明',max,required);
  if(!['honor','permission'].includes(c.kind)||!Object.hasOwn(badges,c.badge)||!Object.hasOwn(colors,c.color)||!districtOptions.some(([id])=>id===c.district))throw Error("称号分类、徽章或所属版块无效");
  for(const key of ['visible','accepting','archived','featured'] as const)if(typeof c[key]!=="boolean")throw Error("展示状态无效");
  if(!Number.isInteger(c.days)||c.days<0||c.days>3650||!Number.isInteger(c.order)||Math.abs(c.order)>9999)throw Error("有效天数或排序无效");
  if(!Array.isArray(c.permissions)||c.permissions.length>30||c.permissions.some(p=>typeof p!=="string"||!/^guide:[0-9a-f-]{36}:read$/.test(p)))throw Error("权限绑定无效");
  c.permissions=[...new Set(c.permissions)].sort();
  if(c.kind==="honor"&&c.permissions.length)throw Error("荣誉称号不能绑定业务权限");
  if(c.archived&&(c.accepting||c.visible))throw Error("归档称号必须关闭公开和申请");
  if(!Array.isArray(c.fields)||c.fields.length>12)throw Error("申请字段最多12项");
  const ids=new Set<string>();c.fields=c.fields.map(field=>{
    keysOnly(field,['id','label','kind','required','help','options']);
    if(typeof field.id!=="string"||!/^f_[a-z0-9_]{1,32}$/.test(field.id)||ids.has(field.id))throw Error("字段标识无效或重复");ids.add(field.id);
    if(!['short','long','single','multi','url'].includes(field.kind as string)||typeof field.required!=="boolean")throw Error("字段类型无效");
    if(!Array.isArray(field.options)||field.options.length>12)throw Error("选项最多12项");
    const options=field.options.map(option=>textValue(option,'选项',60,true));
    if(new Set(options).size!==options.length||(['single','multi'].includes(field.kind as string)&&options.length<2))throw Error("选择字段至少需要两个不同的选项");
    return {...field,label:textValue(field.label,'字段名称',60,true),help:textValue(field.help,'填写说明',160),options} as FormField;
  });return c;
}
export function validateAnswers(config:TitleConfig,input:unknown,submit:boolean){
  keysOnly(input,config.fields.map(f=>f.id));const result:Record<string,string|string[]>={};
  for(const f of config.fields){const value=input[f.id]??(f.kind==='multi'?[]:'');
    if(f.kind==='multi'){if(!Array.isArray(value)||value.length>12||value.some(v=>typeof v!=='string'||!f.options.includes(v))||new Set(value).size!==value.length)throw Error(`${f.label}选项无效`);if(submit&&f.required&&!value.length)throw Error(`请填写${f.label}`);result[f.id]=value;}
    else {const clean=textValue(value,f.label,f.kind==='long'?2000:f.kind==='url'?500:200,submit&&f.required);if(f.kind==='single'&&clean&&!f.options.includes(clean))throw Error(`${f.label}选项无效`);if(f.kind==='url'&&clean){let url;try{url=new URL(clean);}catch{throw Error('作品链接格式不正确');}if(url.protocol!=='https:'||url.username||url.password)throw Error('作品链接必须为HTTPS地址');}result[f.id]=clean;}
  }return result;
}
export function titlePolicy(c:TitleConfig){return JSON.stringify({kind:c.kind,days:c.days,conditions:c.conditions,fields:c.fields.map(f=>({id:f.id,label:f.label,kind:f.kind,required:f.required,help:f.help,options:f.options})),permissions:[...c.permissions].sort()});}
export type StaffPolicy={actions:ServiceAction[];titles:string[];allTitles:boolean;permissions:string[]};
export const noStaffPolicy:StaffPolicy={actions:[],titles:[],allTitles:false,permissions:[]};
