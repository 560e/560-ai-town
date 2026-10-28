import {createHash,createHmac,randomUUID} from 'node:crypto';
import {isIP} from 'node:net';
import {hashPassword,verifyPassword} from 'better-auth/crypto';
import {transaction,audit} from './db.ts';
import {HttpError} from './http.ts';
import {nicknameInput} from '../account.ts';
import {validatePassword} from '../password-policy.ts';
import {lockInvitation} from './invitations.ts';
import {assertPasswordRegistration} from './registration-policy.ts';

export async function passwordLimit(request:Request,operation:string,phone:string){
  const ip=process.env.TOWN_TRUST_PROXY==='1'?request.headers.get('x-real-ip'):'127.0.0.1';
  if(!ip||!isIP(ip))throw new HttpError(400,'无法识别请求来源');
  for(const [kind,value,max] of [['ip',ip,operation==='register'?10:80],['phone',phone,operation==='register'?5:20]] as const){
    const key=`password:${operation}:${kind}:`+createHmac('sha256',process.env.BETTER_AUTH_SECRET!).update(value).digest('hex');
    const limited=await transaction(async client=>{
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[key]);
      const row=(await client.query('SELECT * FROM town_limits WHERE key=$1 FOR UPDATE',[key])).rows[0];
      const now=Date.now(),fresh=!row||now-Number(row.started_at)>= (operation==='register'?3600000:600000),count=fresh?0:row.count;
      if(count>=max)return true;
      await client.query('INSERT INTO town_limits(key,started_at,last_at,count) VALUES($1,$2,$3,$4) ON CONFLICT(key) DO UPDATE SET started_at=$2,last_at=$3,count=$4',[key,fresh?now:row.started_at,now,count+1]);return false;
    });
    if(limited)throw new HttpError(429,'尝试次数过多，请稍后重试');
  }
}
export async function registerPassword(phone:string,password:string,nickname:unknown,inviteCode?:unknown){
  let name:string;try{name=nicknameInput(nickname);}catch(error){throw new HttpError(400,(error as Error).message);}
  const hash=await hashPassword(validatePassword(password));
  try{return await transaction(async client=>{
    const policy=await assertPasswordRegistration(client);
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`password-register:${phone}`]);
    if((await client.query('SELECT id FROM "user" WHERE "phoneNumber"=$1',[phone])).rowCount)throw new HttpError(409,'该手机号已注册，请登录；已有账号请通过原登录方式设置密码或联系管理员');
    const inviteId=policy.inviteRequired?await lockInvitation(client,inviteCode):null;
    const id=randomUUID(),email=`${createHash('sha256').update(phone).digest('hex')}@phone.560.invalid`;
    await client.query('INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt","phoneNumber","phoneNumberVerified",role,banned) VALUES($1,$2,$3,false,now(),now(),$4,false,\'user\',false)',[id,name,email,phone]);
    await client.query('INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,\'credential\',$2,$3,now(),now())',[randomUUID(),id,hash]);
    await client.query('INSERT INTO town_profiles(user_id) VALUES($1)',[id]);
    if(inviteId)await client.query('UPDATE town_registration_invites SET used_at=now(),used_by=$1 WHERE id=$2',[id,inviteId]);
    await audit(client,id,'register',id,{method:'phone-password',phoneVerified:false,inviteId});return id;
  });}catch(error){
    if((error as {code?:string;constraint?:string}).code==='23505'&&(error as {constraint?:string}).constraint==='town_user_nickname_unique')throw new HttpError(409,'这个昵称已被使用，请换一个昵称');
    throw error;
  }
}
export async function changeResidentPassword(id:string,newPassword:string,currentPassword:string|undefined,initialAllowed=false,adminReset=false){
  const hash=await hashPassword(validatePassword(newPassword));
  await transaction(async client=>{
    const user=(await client.query('SELECT id,banned FROM "user" WHERE id=$1 FOR UPDATE',[id])).rows[0];
    if(!user||user.banned)throw new HttpError(403,'账户不可用');
    const account=(await client.query('SELECT id,password FROM account WHERE "userId"=$1 AND "providerId"=\'credential\' FOR UPDATE',[id])).rows[0];
    if(!adminReset){
      if(account?.password){if(!currentPassword||!await verifyPassword({hash:account.password,password:currentPassword}))throw new HttpError(400,'当前密码不正确');}
      else if(!initialAllowed)throw new HttpError(401,'请重新登录后设置初始密码');
    }
    if(account)await client.query('UPDATE account SET password=$1,"updatedAt"=now() WHERE id=$2',[hash,account.id]);
    else await client.query('INSERT INTO account(id,"accountId","providerId","userId",password,"createdAt","updatedAt") VALUES($1,$2,\'credential\',$2,$3,now(),now())',[randomUUID(),id,hash]);
    await client.query('DELETE FROM "session" WHERE "userId"=$1',[id]);
    await audit(client,adminReset?null:id,adminReset?'password.reset.cli':'password.change',id,{sessionsRevoked:true});
  });
}
