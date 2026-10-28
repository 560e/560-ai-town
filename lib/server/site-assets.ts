import sharp from "sharp";
import {mkdir,writeFile,readFile} from "node:fs/promises";
import {join} from "node:path";
import {randomUUID} from "node:crypto";
import {database,transaction,audit} from "./db.ts";
import {HttpError} from "./http.ts";
export const siteAssetDirectory=()=>join(process.cwd(),".local","site-assets");
export async function saveSiteImage(actorId:string,bytes:Buffer){
  const png=bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  const jpg=bytes[0]===255&&bytes[1]===216&&bytes[2]===255;
  const webp=bytes.toString("ascii",0,4)==="RIFF"&&bytes.toString("ascii",8,12)==="WEBP";
  if(!png&&!jpg&&!webp)throw new HttpError(400,"只支持真实的 PNG、JPEG 或 WebP 图片");
  let encoded:Buffer,width:number,height:number;
  try{
    const image=sharp(bytes,{limitInputPixels:16000000,failOn:"warning"});
    const meta=await image.metadata();
    if(!meta.width||!meta.height||meta.width>4096||meta.height>4096||(meta.pages||1)>1)throw Error();
    // Decode and re-encode: discard metadata and never serve user-supplied active content.
    const result=await image.rotate().resize({width:1920,height:1920,fit:"inside",withoutEnlargement:true}).webp({quality:90}).toBuffer({resolveWithObject:true});
    encoded=result.data;width=result.info.width;height=result.info.height;
  }catch{throw new HttpError(400,"无法读取图片，请使用4096像素以内的静态图片");}
  const id=randomUUID();await mkdir(siteAssetDirectory(),{recursive:true});
  await transaction(async client=>{
    const actor=await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR UPDATE',[actorId]);
    if(actor.rows[0]?.role!=="super_admin"||actor.rows[0]?.banned)throw new HttpError(403,"超级管理员权限已失效");
    const count=await client.query("SELECT count(*)::int AS count FROM town_site_assets WHERE actor_id=$1 AND created_at>now()-interval '1 hour'",[actorId]);
    if(count.rows[0].count>=30)throw new HttpError(429,"图片上传过于频繁，请稍后重试");
    await writeFile(join(siteAssetDirectory(),`${id}.webp`),encoded,{flag:"wx"});
    await client.query("INSERT INTO town_site_assets(id,actor_id,width,height,bytes) VALUES($1,$2,$3,$4,$5)",[id,actorId,width,height,encoded.length]);
    await audit(client,actorId,"site.asset",null,{reason:"上传站点图片",assetId:id,width,height});
  });
  return {path:`/api/site-assets/${id}`,width,height};
}
export async function loadSiteImage(id:string){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))throw new HttpError(404,"图片不存在");
  const asset=await database().query("SELECT id FROM town_site_assets WHERE id=$1",[id]);
  if(!asset.rowCount)throw new HttpError(404,"图片不存在");
  try{return await readFile(join(siteAssetDirectory(),`${id}.webp`));}catch{throw new HttpError(404,"图片文件暂不可用");}
}
