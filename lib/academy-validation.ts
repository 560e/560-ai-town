import type {ExternalCourse} from './academy.ts';
import {HttpError} from './server/http.ts';
const fail=():never=>{throw new HttpError(400,'请检查课程名称、简介、网校地址、排序和上下架设置');};
export function uuid(value:unknown){if(typeof value!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value))return fail();return value;}
function text(value:unknown,max:number,required=true){if(typeof value!=='string'||value.length>max||required&&!value.trim())return fail();return value.trim();}
export type ExternalCourseInput=Pick<ExternalCourse,'title'|'summary'|'url'|'coverAssetId'|'sort'|'published'>&{id?:string;revision?:number};
export function validateExternalCourse(value:unknown):ExternalCourseInput{
 if(!value||typeof value!=='object'||Array.isArray(value))return fail();
 const v=value as Record<string,unknown>;
 if(Object.keys(v).some(k=>!['id','revision','title','summary','url','coverAssetId','sort','published'].includes(k)))return fail();
 if(typeof v.published!=='boolean'||!Number.isSafeInteger(v.sort)||(v.sort as number)<0||(v.sort as number)>100000)return fail();
 const title=text(v.title,120),summary=text(v.summary,2000,v.published),url=text(v.url,2048,v.published);
 if(typeof v.url==='string'&&/[\x00-\x1f\x7f]/.test(v.url))return fail();
 let normalized=url;
 if(url){let parsed:URL;try{parsed=new URL(url);}catch{return fail();}if(!['https:','http:'].includes(parsed.protocol)||parsed.username||parsed.password)return fail();normalized=parsed.href;}
 const coverAssetId=v.coverAssetId===null?null:uuid(v.coverAssetId);
 let id:string|undefined,revision:number|undefined;
 if(v.id!==undefined){id=uuid(v.id);if(!Number.isSafeInteger(v.revision)||(v.revision as number)<1)return fail();revision=v.revision as number;}else if(v.revision!==undefined)return fail();
 return {title,summary,url:normalized,coverAssetId,sort:v.sort as number,published:v.published,...(id?{id,revision}:{})};
}
