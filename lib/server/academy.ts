import {randomUUID} from 'node:crypto';
import type {AcademyCatalog} from '../academy.ts';
import {validateExternalCourse,uuid} from '../academy-validation.ts';
import {database,transaction,audit} from './db.ts';
import {HttpError} from './http.ts';
import {isOperator} from '../roles.ts';
const columns='id,title,summary,url,cover_asset_id AS "coverAssetId",sort,published,revision,created_at AS "createdAt",updated_at AS "updatedAt"';
export async function catalog():Promise<AcademyCatalog>{return {courses:(await database().query(`SELECT ${columns} FROM academy_external_courses WHERE published ORDER BY sort,created_at DESC,id`)).rows};}
export async function managed():Promise<AcademyCatalog>{return {courses:(await database().query(`SELECT ${columns} FROM academy_external_courses ORDER BY sort,created_at DESC,id`)).rows};}
export async function manageMutation(userId:string,input:Record<string,unknown>){
 if(input.op!=='save')throw new HttpError(410,'站内课程编辑、审核和路径功能已下线，请维护外链课程');
 const c=validateExternalCourse(input.course);
 return transaction(async client=>{
  const actor=(await client.query('SELECT role,banned FROM "user" WHERE id=$1 FOR SHARE',[userId])).rows[0];
  if(!actor||actor.banned||!isOperator(actor.role))throw new HttpError(403,'需要学院运营权限');
  const previous=c.id?(await client.query('SELECT * FROM academy_external_courses WHERE id=$1 FOR UPDATE',[c.id])).rows[0]:null;
  if(c.id&&!previous)throw new HttpError(404,'课程不存在');
  if(previous&&previous.revision!==c.revision)throw new HttpError(409,'课程已被其他工作人员修改，请刷新后再试');
  if(c.coverAssetId){const asset=(await client.query("SELECT id FROM academy_assets WHERE id=$1 AND status='approved' AND mime IN('image/png','image/jpeg','image/webp') FOR SHARE",[c.coverAssetId])).rows[0];if(!asset)throw new HttpError(400,'封面必须为有效的已上传图片');}
  const id=c.id||randomUUID();
  if(previous)await client.query('UPDATE academy_external_courses SET title=$2,summary=$3,url=$4,cover_asset_id=$5,sort=$6,published=$7,revision=revision+1,updated_at=now(),actor_id=$8 WHERE id=$1',[id,c.title,c.summary,c.url,c.coverAssetId,c.sort,c.published,userId]);
  else await client.query('INSERT INTO academy_external_courses(id,title,summary,url,cover_asset_id,sort,published,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,c.title,c.summary,c.url,c.coverAssetId,c.sort,c.published,userId]);
  await audit(client,userId,'academy.external.save',null,{courseId:id,before:previous?{title:previous.title,url:previous.url,published:previous.published,revision:previous.revision}:null,after:c});
  return {ok:true,id,revision:previous?previous.revision+1:1};
 });
}
export async function assetAccess(_userId:string,assetId:string):Promise<boolean>{uuid(assetId);return (await database().query('SELECT 1 FROM academy_external_courses WHERE published AND cover_asset_id=$1 LIMIT 1',[assetId])).rowCount!==0;}
