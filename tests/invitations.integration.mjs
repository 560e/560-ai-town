import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomInt,randomUUID,createHash} from 'node:crypto';
import {Pool} from 'pg';
import {localHttp as fetch} from './local-http.mjs';
const target=new URL(process.env.DATABASE_URL),base=process.env.PASSWORD_TEST_URL;
assert.equal(process.env.TOWN_DISPOSABLE_TEST_DB,'1');
assert.ok(target.hostname==='127.0.0.1'&&/^\/town_verify_[a-z0-9_]+$/.test(target.pathname));
const db=new Pool({connectionString:target.href}),password='Test'+randomUUID()+'42';
let checks=0,ip=10;
const check=(v,label)=>{assert.ok(v,label);checks++;console.log('PASS '+label);};
const phone=()=>`+86197${randomInt(10000000,99999999)}`;
async function call(path,{data,cookie,method=data?'POST':'GET'}={}){
  if(path.startsWith('/api/auth/'))await db.query('DELETE FROM "rateLimit"');
  const r=await fetch(base+path,{method,headers:{Host:'town-password.test','x-forwarded-host':'town-password.test','x-forwarded-proto':'https','x-real-ip':`127.0.1.${ip++}`,Origin:'https://town-password.test',...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
  return {status:r.status,body:await r.json(),cookie:r.headers.getSetCookie().map(x=>x.split(';')[0]).join('; ')};
}
const reg=(inviteCode,phoneNumber=phone(),name='测试'+Math.random().toString(36).slice(2,12))=>call('/api/auth/password/register',{data:{name,phoneNumber,password,...(inviteCode===undefined?{}:{inviteCode})}});
try{
  const adminPhone=phone(),registered=await reg(undefined,adminPhone);
  assert.equal(registered.status,200);
  const id=(await db.query('SELECT id FROM "user" WHERE "phoneNumber"=$1',[adminPhone])).rows[0].id;
  check((await call('/api/system/invitations')).status===401,'anonymous cannot read invitations');
  check((await call('/api/system/invitations',{cookie:registered.cookie})).status===403,'resident cannot read invitations');
  await db.query("UPDATE \"user\" SET role='super_admin' WHERE id=$1",[id]);
  const cookie=registered.cookie;
  check((await call('/api/system/invitations',{cookie,data:{count:101}})).status===400,'generation count limited');
  const generated=await call('/api/system/invitations',{cookie,data:{count:6}});
  check(generated.status===200&&generated.body.codes.length===6,'super admin generates batch');
  const codes=generated.body.codes;
  const listing=await call('/api/system/invitations',{cookie});
  check(listing.body.items.length===6&&!JSON.stringify(listing.body).includes(codes[0]),'listing exposes hints only');
  const record=await call('/api/system/registration',{cookie});
  check((await call('/api/system/registration',{cookie,method:'PATCH',data:{version:record.body.version,smsRequired:false,inviteRequired:true}})).status===200,'enable invitations');
  check((await call('/api/account/registration')).body.inviteRequired,'public policy advertises requirement');
  check((await reg()).status===400,'missing invitation rejected');
  check((await reg('F'.repeat(24))).status===400,'unknown invitation rejected');
  check((await reg(codes[0],adminPhone)).status===409,'duplicate phone rejected without consuming invitation');
  const existingName=(await db.query('SELECT name FROM "user" WHERE id=$1',[id])).rows[0].name;
  const collision=await reg(codes[3],phone(),existingName.toUpperCase());
  check(collision.status===409&&collision.body.error.includes('昵称'),'duplicate canonical nickname returns friendly conflict');
  const unused=(await db.query('SELECT used_at FROM town_registration_invites WHERE code_hash=$1',[createHash('sha256').update(codes[3].replaceAll('-','')).digest('hex')])).rows[0];
  check(unused.used_at===null,'nickname collision leaves invitation unused');
  const sharedName='并发名字'+randomInt(100000,999999);
  const nicknameRace=await Promise.all([reg(codes[3],phone(),sharedName),reg(codes[4],phone(),sharedName)]);
  check(nicknameRace.filter(r=>r.status===200).length===1&&nicknameRace.filter(r=>r.status===409).length===1,'concurrent same nickname creates one resident');
  const two=await Promise.all([reg(codes[0]),reg(codes[0])]);
  check(two.filter(r=>r.status===200).length===1&&two.filter(r=>r.status===400).length===1,'one invitation only creates one account under concurrency');
  check((await reg(codes[0])).status===400,'used invitation rejected');
  // Force a later registration write to fail, proving invite consumption shares its transaction.
  await db.query("CREATE FUNCTION invitation_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'intentional test rollback'; END $$; CREATE TRIGGER invitation_test_failure BEFORE INSERT ON town_profiles FOR EACH ROW EXECUTE FUNCTION invitation_test_failure();");
  try{check((await reg(codes[1])).status===503,'failed account creation rolls back');}
  finally{await db.query('DROP TRIGGER invitation_test_failure ON town_profiles; DROP FUNCTION invitation_test_failure();');}
  const rollbackRow=(await db.query('SELECT used_at FROM town_registration_invites WHERE code_hash=$1',[createHash('sha256').update(codes[1].replaceAll('-','')).digest('hex')])).rows[0];
  check(rollbackRow.used_at===null,'rollback preserves unused invitation');
  const retry=await reg(codes[1]);assert.equal(retry.status,200,JSON.stringify(retry.body));check(retry.status===200,'failed registration leaves invitation reusable');
  const hash=createHash('sha256').update(codes[2].replaceAll('-','')).digest('hex');
  const invite=(await db.query('SELECT id FROM town_registration_invites WHERE code_hash=$1',[hash])).rows[0];
  check((await call('/api/system/invitations',{cookie,method:'DELETE',data:{id:invite.id}})).status===200,'unused code can be disabled');
  check((await reg(codes[2])).status===400,'disabled code rejected');
  check((await call('/api/auth/password/login',{data:{phoneNumber:adminPhone,password}})).status===200,'existing account still logs in without invite');
  const now=await call('/api/system/registration',{cookie});
  check((await call('/api/system/registration',{cookie,method:'PATCH',data:{version:now.body.version,smsRequired:false,inviteRequired:false}})).status===200,'disable invitation requirement');
  check((await reg()).status===200,'registration without invitation restored');
  const all=await db.query('SELECT code_hash,display_hint FROM town_registration_invites');
  check(all.rows.every(r=>r.code_hash.length===64)&&!codes.some(code=>JSON.stringify(all.rows).includes(code.replaceAll('-',''))),'raw invitations not persisted');
  const audit=await db.query("SELECT details FROM town_audit WHERE action LIKE 'registration.invites.%'");
  check(audit.rowCount>=2&&!codes.some(code=>JSON.stringify(audit.rows).includes(code)),'generation and revoke audited without raw codes');
  await db.query("UPDATE \"user\" SET role='admin' WHERE id=$1",[id]);
  check((await call('/api/system/invitations',{cookie,data:{count:1}})).status===403,'operator cannot generate codes');
  console.log(`${checks} invitation integration checks passed`);
}finally{await db.end();}
