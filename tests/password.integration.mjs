import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomInt,randomUUID,createHash,createHmac} from 'node:crypto';
import {Pool} from 'pg';
import {localHttp as fetch} from './local-http.mjs';
const base=process.env.PASSWORD_TEST_URL||'http://127.0.0.1:3318',origin='https://town-password.test';
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname),'Only local disposable test traffic');
const db=new Pool({connectionString:process.env.DATABASE_URL});
const target=new URL(process.env.DATABASE_URL);
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1');
assert.ok(['127.0.0.1','localhost'].includes(target.hostname)&&/^\/town_verify_[a-z0-9_]+$/.test(target.pathname),'Disposable database required');
const phones=Array.from({length:4},()=>`+86199${randomInt(10000000,99999999)}`),password='TownTest'+randomUUID()+'42',changed='Changed'+randomUUID()+'42';
let checks=0;const check=(v,label)=>{assert.ok(v,label);checks++;console.log('PASS '+label);};
async function call(path,{data,cookie,headers={}}={}){if(path==='/api/auth/password/login')await db.query('DELETE FROM "rateLimit"');const r=await fetch(base+path,{method:data?'POST':'GET',headers:{Host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':'127.0.0.2',Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:data?JSON.stringify(data):undefined});return {status:r.status,body:await r.json(),cookies:r.headers.getSetCookie(),cookie:r.headers.getSetCookie().map(c=>c.split(';')[0]).join('; ')};}
try{
  const info=await call('/api/account');check(info.body.password&&!info.body.local,'production password auth enabled and local OTP disabled');
  check((await call('/api/auth/phone-number/send-otp',{data:{phoneNumber:phones[0]}})).status===403,'public OTP delivery rejected');
  check((await call('/api/auth/phone-number/verify',{data:{phoneNumber:phones[0],code:'5600'}})).status===403,'fixed/test OTP cannot sign in');
  check((await call('/api/auth/sign-up/email',{data:{}})).status===404,'raw framework signup is unavailable');
  check((await call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:phones[0],password,role:'super_admin'}})).status===400,'registration cannot supply role');
  check((await call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:phones[0],password:'1234567890'}})).status===400,'weak password rejected');
  check((await call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:phones[0],password},headers:{Origin:'https://evil.test'}})).status===403,'cross-origin registration rejected');
  check((await call('/api/auth/password/register',{data:{phoneNumber:phones[3],password}})).status===400,'nickname is required at registration');
  const registered=await call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:phones[0],password}});
  check(registered.status===200,'new registration signs in');check(registered.cookies.some(c=>c.includes('Secure')&&c.includes('HttpOnly')),'production session cookie is Secure and HttpOnly');
  check(!JSON.stringify(registered.body).includes(password)&&!registered.body.token,'no password or session token in JSON');
  const resident=(await call('/api/account',{cookie:registered.cookie})).body.user;
  check(resident.role==='user'&&resident.identity==='小镇居民'&&!resident.phoneVerified&&resident.hasPassword,'new account is unverified resident with password');
  const stored=(await db.query('SELECT password FROM account WHERE "userId"=$1',[resident.id])).rows[0];check(stored.password!==password&&stored.password.length>64,'password stored as salted hash');
  for(const path of ['/api/system/overview','/api/manage/overview','/api/admin/users'])check((await call(path,{cookie:registered.cookie})).status===403,'resident denied '+path);
  check((await call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:phones[0],password:changed}})).status===409,'duplicate registration does not overwrite account');
  check((await call('/api/auth/password/login',{data:{phoneNumber:phones[0],password:changed}})).status===401,'wrong password rejected');
  const second=await call('/api/auth/password/login',{data:{phoneNumber:phones[0],password}});check(second.status===200,'correct password works');
  check((await call('/api/auth/password/change',{cookie:registered.cookie,data:{currentPassword:'wrong',newPassword:changed}})).status===400,'password change requires current password');
  check((await call('/api/auth/password/change',{cookie:registered.cookie,data:{currentPassword:password,newPassword:changed}})).status===200,'password change succeeds');
  check(!(await call('/api/account',{cookie:registered.cookie})).body.user&&!(await call('/api/account',{cookie:second.cookie})).body.user,'password change revokes every session');
  const oldPassword=await call('/api/auth/password/login',{data:{phoneNumber:phones[0],password}});
  assert.equal(oldPassword.status,401,`old password response: ${JSON.stringify(oldPassword.body)}`);check(true,'old password stops working');
  check((await call('/api/auth/password/login',{data:{phoneNumber:phones[0],password:changed}})).status===200,'new password works');
  await db.query('UPDATE "user" SET banned=true WHERE id=$1',[resident.id]);check((await call('/api/auth/password/login',{data:{phoneNumber:phones[0],password:changed}})).status===401,'banned account cannot obtain session');
  // Simulate a pre-existing OTP resident with no credential account.
  const oldId=randomUUID();await db.query('INSERT INTO "user"(id,name,email,"emailVerified","createdAt","updatedAt","phoneNumber","phoneNumberVerified",role,banned) VALUES($1,$2,$3,false,now(),now(),$4,false,\'user\',false)',[oldId,'兼容测试'+randomInt(100000,999999),createHash('sha256').update(phones[1]).digest('hex')+'@phone.560.invalid',phones[1]]);
  check((await call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:phones[1],password}})).status===409,'existing OTP user cannot be taken over through registration');
  check((await call('/api/auth/password/login',{data:{phoneNumber:phones[1],password}})).status===401,'existing OTP user has no implicit default password');
  const r=await Promise.all([1,2].map(()=>call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:phones[2],password}})));
  check(r.filter(v=>v.status===200).length===1&&r.filter(v=>v.status===409).length===1,'concurrent duplicate signup creates one user');
  const legacyCookie=r.find(v=>v.status===200).cookie;
  const legacyId=(await db.query('SELECT id FROM "user" WHERE "phoneNumber"=$1',[phones[2]])).rows[0].id;
  await db.query('DELETE FROM account WHERE "userId"=$1',[legacyId]);
  await db.query('UPDATE session SET "createdAt"=now()-interval \'16 minutes\' WHERE "userId"=$1',[legacyId]);
  check((await call('/api/auth/password/change',{cookie:legacyCookie,data:{newPassword:changed}})).status===401,'initial password requires recent authenticated session');
  await db.query('UPDATE session SET "createdAt"=now() WHERE "userId"=$1',[legacyId]);
  check((await call('/api/auth/password/change',{cookie:legacyCookie,data:{newPassword:changed}})).status===200,'recent passwordless account can set initial password');
  check(!(await call('/api/account',{cookie:legacyCookie})).body.user,'initial password also revokes sessions');
  check((await call('/api/auth/password/login',{data:{phoneNumber:phones[2],password:changed}})).status===200,'initial password then supports login');
  const hash=createHmac('sha256',process.env.BETTER_AUTH_SECRET).update(phones[3]).digest('hex');
  await db.query('INSERT INTO town_limits(key,started_at,last_at,count) VALUES($1,$2,$2,20) ON CONFLICT(key) DO UPDATE SET started_at=$2,last_at=$2,count=20',[`password:login:phone:${hash}`,Date.now()]);
  check((await call('/api/auth/password/login',{data:{phoneNumber:phones[3],password}})).status===429,'persistent phone rate limit enforced');
  console.log(`${checks} password integration checks passed`);
}finally{
  const ids=(await db.query('SELECT id FROM "user" WHERE "phoneNumber"=ANY($1)',[phones])).rows.map(r=>r.id);
  if(ids.length){await db.query('DELETE FROM town_audit WHERE actor_id=ANY($1) OR target_id=ANY($1)',[ids]);await db.query('DELETE FROM "user" WHERE id=ANY($1)',[ids]);}
  for(const value of [...phones,'127.0.0.2']){const hash=createHmac('sha256',process.env.BETTER_AUTH_SECRET).update(value).digest('hex');await db.query('DELETE FROM town_limits WHERE key LIKE $1',[`password:%:${hash}`]);}
  await db.end();
}
