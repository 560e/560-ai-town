import './account-env.mjs';
import {randomUUID,createHash} from 'node:crypto';
import {database,transaction,audit} from '../lib/server/db.ts';
import {normalizePhone} from '../lib/account.ts';
const args=process.argv.slice(2);
if(!args.includes('--phone'))throw new Error('使用 --phone 指定已经注册的手机号');
const phone=normalizePhone(args[args.indexOf('--phone')+1]),role=args.includes('--super-admin')?'super_admin':'admin';
const createLocal=args.includes('--create-local');
if(createLocal&&(process.env.TOWN_LOCAL_AUTH!=='1'||process.env.NODE_ENV==='production'))throw new Error('测试管理员只能在本地测试环境创建');
try{
  await transaction(async client=>{
    await client.query("SELECT pg_advisory_xact_lock(hashtext('town:role-management'))");
    let {rows}=await client.query('SELECT id,banned,role FROM "user" WHERE "phoneNumber"=$1 FOR UPDATE',[phone]);
    if(!rows.length&&createLocal){
      const id=randomUUID(),email=`${createHash('sha256').update(phone).digest('hex')}@phone.560.invalid`;
      await client.query('INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt","phoneNumber","phoneNumberVerified",role,banned) VALUES($1,$2,$3,false,now(),now(),$4,true,\'user\',false)',[id,'本地测试管理员',email,phone]);
      await client.query('INSERT INTO town_profiles(user_id) VALUES($1)',[id]);rows=[{id,banned:false}];
    }
    if(!rows.length)throw new Error('请先通过页面注册该手机号，再执行管理员授权');
    if(rows[0].banned)throw new Error('不能向已停用账户授予管理员身份');
    if(rows[0].role==='super_admin'&&role!=='super_admin')throw new Error('维护授权命令不会降低超级管理员权限，请在系统后台处理');
    if(rows[0].role===role)return;
    await client.query('UPDATE "user" SET role=$1,"updatedAt"=now() WHERE id=$2',[role,rows[0].id]);
    await client.query('DELETE FROM town_service_staff WHERE user_id=$1',[rows[0].id]);
    await client.query('DELETE FROM "session" WHERE "userId"=$1',[rows[0].id]);
    await audit(client,null,'admin.grant',rows[0].id,{source:'local-cli',testAccount:createLocal,before:rows[0].role||'user',after:role});
  });console.log('管理角色授权完成。请重新登录 /account，通过个人中心进入相应管理页面。');
}finally{await database().end();}
