import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomInt,randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import {localHttp as fetch} from './local-http.mjs';
const target=new URL(process.env.DATABASE_URL),base=process.env.PASSWORD_TEST_URL;
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1','Run through the disposable local verification runner');
assert.ok(['127.0.0.1','localhost'].includes(target.hostname)&&/^\/town_verify_[a-z0-9_]+$/.test(target.pathname));
assert.ok(base&&new URL(base).hostname==='127.0.0.1');
const db=new Pool({connectionString:target.href}),password='Test'+randomUUID()+'42';
let checks=0;const check=(value,label)=>{assert.ok(value,label);checks++;console.log('PASS '+label);};
async function call(path,{data,cookie,method=data?'POST':'GET'}={}){
  // Isolate functional cases from Better Auth's short burst window, only in the disposable DB.
  if(path==='/api/auth/password/login')await db.query('DELETE FROM "rateLimit"');
  const r=await fetch(base+path,{method,headers:{Host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':'127.0.0.3',Origin:'https://town-password.test',...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
  return {status:r.status,body:await r.json(),cookie:r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')};
}
try{
  const info=await call('/api/account/registration');
  check(info.status===200&&info.body.passwordRegistrationAllowed===true&&info.body.smsConfigured===false,'default policy allows password registration without claiming SMS');
  check(Object.keys(info.body).sort().join(',')==='inviteRequired,passwordRegistrationAllowed,smsConfigured,smsRequired','public policy does not expose audit or secrets');
  check((await call('/api/system/registration')).status===401,'anonymous cannot read administrator policy');
  const people=[];
  for(const role of ['user','admin','super_admin']){
    const phoneNumber=`+86198${randomInt(10000000,99999999)}`;
    const reg=await call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber,password}});assert.equal(reg.status,200);
    const id=(await db.query('SELECT id FROM "user" WHERE "phoneNumber"=$1',[phoneNumber])).rows[0].id;
    if(role!=='user')await db.query('UPDATE "user" SET role=$1 WHERE id=$2',[role,id]);
    people.push({role,id,cookie:reg.cookie,phoneNumber});
  }
  for(const p of people.slice(0,2))for(const method of ['GET','PATCH'])check((await call('/api/system/registration',{cookie:p.cookie,method,...(method==='PATCH'?{data:{version:0,smsRequired:false}}:{})})).status===403,p.role+' cannot '+method+' registration policy');
  const superCookie=people[2].cookie;
  const current=await call('/api/system/registration',{cookie:superCookie});check(current.status===200&&current.body.version===0,'super admin can read initialized settings');
  check((await call('/api/system/registration',{cookie:superCookie,method:'PATCH',data:{version:0,smsRequired:true}})).status===400,'server rejects enabling nonexistent SMS provider');
  check((await call('/api/system/registration',{cookie:superCookie,method:'PATCH',data:{version:999,smsRequired:false}})).status===409,'stale settings cannot overwrite');
  check((await call('/api/system/registration',{cookie:superCookie,method:'PATCH',data:{version:0,smsRequired:false,secret:'fake'}})).status===400,'unknown settings rejected');
  // Simulate a legacy required setting. Only this disposable database may be modified directly.
  await db.query('UPDATE town_registration_settings SET sms_required=true,version=1 WHERE id=1');
  check(!(await call('/api/account/registration')).body.passwordRegistrationAllowed,'public form sees updated requirement');
  const blockedPhone=`+86198${randomInt(10000000,99999999)}`;
  check((await call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:blockedPhone,password}})).status===403,'password registration rechecks current policy');
  check(!(await db.query('SELECT id FROM "user" WHERE "phoneNumber"=$1',[blockedPhone])).rowCount,'blocked registration creates no account');
  check((await call('/api/auth/password/login',{data:{phoneNumber:people[0].phoneNumber,password}})).status===200,'registration requirement does not lock existing users out');
  const writes=await Promise.all([1,2].map(()=>call('/api/system/registration',{cookie:superCookie,method:'PATCH',data:{version:1,smsRequired:false}})));
  check(writes.filter(r=>r.status===200).length===1&&writes.filter(r=>r.status===409).length===1,'concurrent policy saves use optimistic version checks');
  const audit=await db.query("SELECT details FROM town_audit WHERE actor_id=$1 AND action='registration.update'",[people[2].id]);check(audit.rowCount===1&&audit.rows[0].details.afterRequired===false,'successful policy update audited once');
  await db.query('DELETE FROM town_registration_settings WHERE id=1');
  check((await call('/api/account/registration')).status===503,'missing policy unavailable rather than permissive default');
  check((await call('/api/auth/password/register',{data:{name:'测试'+Math.random().toString(36).slice(2,12),phoneNumber:blockedPhone,password}})).status===503,'missing policy fails registration closed');
  check((await call('/api/auth/password/login',{data:{phoneNumber:people[0].phoneNumber,password}})).status===200,'missing registration policy does not disable password login');
  await db.query('INSERT INTO town_registration_settings(id) VALUES(1)');
  await db.query('UPDATE "user" SET role=\'user\' WHERE id=$1',[people[2].id]);
  check((await call('/api/system/registration',{cookie:superCookie,method:'PATCH',data:{version:0,smsRequired:false}})).status===403,'revoked administrator role checked live');
  console.log(`${checks} registration integration checks passed`);
}finally{await db.end();}
