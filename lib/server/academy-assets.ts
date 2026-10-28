import sharp from 'sharp';
import {mkdir,writeFile,unlink,open} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID,createHash} from 'node:crypto';
import {database,transaction,audit} from './db.ts';
import {HttpError} from './http.ts';
import {assetUploadInput,byteRange} from '../academy-assets.ts';
import {assetAccess} from './academy.ts';
export const academyAssetDirectory=()=>join(process.cwd(),'.local','academy-assets');
/** Storage boundary uses opaque object keys. Cloud adapters can later implement these methods. */
export interface AcademyStorage{put(key:string,data:Buffer):Promise<void>;remove(key:string):Promise<void>;read(key:string,start:number,end:number):Promise<Buffer>}
export const localAcademyStorage:AcademyStorage={
 async put(key,data){await mkdir(academyAssetDirectory(),{recursive:true});await writeFile(join(academyAssetDirectory(),key),data,{flag:'wx'});},
 async remove(key){await unlink(join(academyAssetDirectory(),key)).catch(()=>{});},
 async read(key,start,end){const file=await open(join(academyAssetDirectory(),key),'r');try{const bytes=Buffer.alloc(end-start+1);let offset=0;while(offset<bytes.length){const read=await file.read(bytes,offset,bytes.length-offset,start+offset);if(!read.bytesRead)throw Error('truncated asset');offset+=read.bytesRead;}return bytes;}finally{await file.close();}}
};
function assetId(value:unknown){if(typeof value!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value))throw new HttpError(400,'素材编号无效');return value;}
async function operator(client:Parameters<Parameters<typeof transaction>[0]>[0],id:string){const {rows}=await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR UPDATE',[id]);if(!rows[0]||rows[0].banned||!['admin','super_admin'].includes(rows[0].role))throw new HttpError(403,'需要学院运营权限');}
export async function uploadAcademyAsset(actorId:string,input:Record<string,unknown>){
 let parsed:ReturnType<typeof assetUploadInput>;try{parsed=assetUploadInput(input);}catch(e){throw new HttpError(400,(e as Error).message);}
 let {bytes,mime}=parsed;let width:number|null=null,height:number|null=null;
 if(mime.startsWith('image/')){try{const image=sharp(bytes,{limitInputPixels:16000000,failOn:'warning'}),meta=await image.metadata();if(!['png','jpeg','webp'].includes(meta.format||'')||(meta.pages||1)>1)throw Error();const out=await image.rotate().resize({width:2560,height:2560,fit:'inside',withoutEnlargement:true}).webp({quality:88}).toBuffer({resolveWithObject:true});bytes=out.data;width=out.info.width;height=out.info.height;mime='image/webp';}catch{throw new HttpError(400,'图片无法解码或尺寸过大，请使用静态PNG/JPEG/WebP');}}

 const id=randomUUID(),key=id+'.asset';let wrote=false;
 try{return await transaction(async client=>{await operator(client,actorId);const recent=await client.query("SELECT count(*)::int AS n FROM academy_assets WHERE actor_id=$1 AND created_at>now()-interval '1 hour'",[actorId]);if(recent.rows[0].n>=60)throw new HttpError(429,'上传过于频繁，请稍后再试');await localAcademyStorage.put(key,bytes);wrote=true;const row=(await client.query("INSERT INTO academy_assets(id,actor_id,name,mime,bytes,storage_key,sha256,width,height,status) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'approved') RETURNING id,name,mime,bytes::int,status,created_at AS \"createdAt\"",[id,actorId,parsed.name,mime,bytes.length,key,createHash('sha256').update(bytes).digest('hex'),width,height])).rows[0];await audit(client,actorId,'academy.asset.upload',null,{assetId:id,name:parsed.name,bytes:bytes.length});return {asset:row};});}catch(e){if(wrote)await localAcademyStorage.remove(key);throw e;}
}
export async function serveAcademyAsset(user:{id:string;role:string},idValue:unknown,request:Request){
 const id=assetId(idValue),admin=['admin','super_admin'].includes(user.role),row=(await database().query('SELECT * FROM academy_assets WHERE id=$1',[id])).rows[0];
 if(!row||!row.mime.startsWith('image/')||(!admin&&(row.status!=='approved'||!await assetAccess(user.id,id))))throw new HttpError(404,'素材不存在或无权访问');
 if(!/^[0-9a-f-]{36}\.asset$/.test(row.storage_key))throw new HttpError(404,'素材文件不可用');
 const size=Number(row.bytes);let range:ReturnType<typeof byteRange>;
 try{range=byteRange(request.headers.get('range'),size);}catch{return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`,'Cache-Control':'private, no-store'}});}
 const start=range?.start??0,end=range?.end??size-1;
 const inline=row.mime.startsWith('image/')||row.mime==='video/mp4'||row.mime==='text/vtt';
 const headers:Record<string,string>={'Content-Type':row.mime,'Content-Length':String(end-start+1),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Security-Policy':"default-src 'none'; sandbox",'Content-Disposition':`${inline?'inline':'attachment'}; filename*=UTF-8''${encodeURIComponent(row.name)}`};
 if(range)headers['Content-Range']=`bytes ${start}-${end}/${size}`;
 if(request.method==='HEAD')return new Response(null,{status:range?206:200,headers});
 try{const bytes=await localAcademyStorage.read(row.storage_key,start,end);return new Response(new Uint8Array(bytes),{status:range?206:200,headers});}catch{throw new HttpError(404,'素材文件暂不可用');}
}
