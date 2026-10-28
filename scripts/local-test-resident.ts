import './account-env.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {database,transaction,audit} from '../lib/server/db.ts';
import {isLocalTestResident,localTestResidentPhone} from '../lib/server/local-test-resident.ts';
import {isLoopback} from '../lib/server/config.ts';
if(!isLocalTestResident(localTestResidentPhone)||!isLoopback(process.env.DATABASE_URL||''))throw new Error('只允许在显式启用的本地测试环境建立测试居民');
try{
 await transaction(async client=>{
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[localTestResidentPhone]);
  const existing=(await client.query('SELECT id,role,banned FROM "user" WHERE "phoneNumber"=$1 FOR UPDATE',[localTestResidentPhone])).rows[0];
  if(existing){if((existing.role||'user')!=='user'||existing.banned)throw new Error('该号码不是可用普通用户，拒绝覆盖已有账号');console.log('测试普通用户已存在，保留其资料。');return;}
  const id=randomUUID(),email=`${createHash('sha256').update(localTestResidentPhone).digest('hex')}@phone.560.invalid`;
  await client.query('INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt","phoneNumber","phoneNumberVerified",role,banned) VALUES($1,$2,$3,false,now(),now(),$4,true,\'user\',false)',[id,'测试居民',email,localTestResidentPhone]);
  await client.query('INSERT INTO town_profiles(user_id) VALUES($1)',[id]);
  await audit(client,null,'test-resident.create',id,{source:'local-cli',role:'user'});
  console.log('已建立本地普通测试用户：13800138000（小镇居民）。');
 });
}finally{await database().end();}
