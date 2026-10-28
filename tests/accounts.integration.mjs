import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
import {randomInt} from 'node:crypto';
import {Pool} from 'pg';
import {setTimeout as delay} from 'node:timers/promises';
import {checkSiteSettings} from './site-settings-checks.mjs';
import {checkService} from './service-checks.mjs';
import {checkCharacters} from './character-checks.mjs';
const base=process.env.BETTER_AUTH_URL||'http://localhost:3000';
assert.equal(process.env.TOWN_LOCAL_AUTH,'1','Integration tests require the local test environment');
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const db=new Pool({connectionString:process.env.DATABASE_URL});
const phones=Array.from({length:4},()=>`199${randomInt(10000000,99999999)}`), ids=[];
let checks=0;
async function call(path,{data,cookie,method=data?'POST':'GET',origin=base,headers={}}={}){
  const response=await fetch(base+path,{method,headers:{Origin:origin,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{}),...headers},body:data?JSON.stringify(data):undefined});
  return {status:response.status,body:await response.json(),cookie:response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')};
}
function check(condition,label){assert.ok(condition,label);checks++;console.log(`✓ ${label}`);}
async function send(phone){let result=await call('/api/auth/phone-number/send-otp',{data:{phoneNumber:phone}});if(result.status===429){console.log('Local request limit active; waiting for the existing cooldown before one retry.');await delay(62000);result=await call('/api/auth/phone-number/send-otp',{data:{phoneNumber:phone}});}assert.equal(result.status,200,JSON.stringify(result.body));return result.body.localCode;}
async function signIn(phone,code){return call('/api/auth/phone-number/verify',{data:{phoneNumber:phone,code}});}
try{
  const guest=await call('/api/account');check(guest.body.enabled&&guest.body.user===null,'guest remains unauthenticated');
  const oldEntries=await Promise.all(['/admin','/manage'].map(path=>fetch(base+path,{redirect:'manual'})));
  check(oldEntries.every(response=>response.status===404&&!response.headers.has('location')),'old management paths return 404 without revealing new entries');
  check((await call('/api/admin/users')).status===401,'unauthenticated admin API is denied');
  check((await call('/api/manage/overview')).status===401,'unauthenticated operations overview is denied');
  check((await call('/api/system/overview')).status===401,'super-admin API rejects anonymous requests');
  check((await call('/api/auth/phone-number/send-otp',{data:{phoneNumber:phones[0]},origin:'https://other.invalid'})).status===403,'cross-origin OTP request is denied');
  check((await call('/api/auth/phone-number/send-otp',{data:{phoneNumber:'123'}})).status===400,'invalid phone is rejected');
  check((await call('/api/account',{headers:{'x-forwarded-for':'203.0.113.10'}})).status===403,'non-loopback forwarded request is rejected');
  const code=await send(phones[0]);check(/^\d{6}$/.test(code),'local delivery returns a generated six digit code');
  const plaintext=await db.query('SELECT count(*) FROM verification WHERE identifier=$1',[`+86${phones[0]}`]);check(Number(plaintext.rows[0].count)===0,'plaintext OTP is removed from framework verification storage');
  check((await call('/api/auth/phone-number/send-otp',{data:{phoneNumber:phones[0]}})).status===429,'resend cooldown is enforced on the server');
  const tamper=await call('/api/auth/phone-number/verify',{data:{phoneNumber:phones[0],code,role:'admin'}});check(tamper.status===400,'role injection during sign-up is rejected');
  const result=await signIn(phones[0],code);assert.equal(result.status,200,JSON.stringify(result.body));
  const cookie=result.cookie;const account=(await call('/api/account',{cookie})).body.user;assert.ok(account);ids.push(account.id);
  check(account.role==='user'&&account.identity==='小镇居民'&&!account.phone.includes(phones[0]),'registration creates a resident and masks the phone');
  check(!('managementPath' in account),'ordinary resident receives no private management entry');
  check((await signIn(phones[0],code)).status===400,'consumed OTP cannot be replayed');
  check((await call('/api/admin/users',{cookie})).status===403,'resident cannot call admin APIs');
  check((await call('/api/manage/overview',{cookie})).status===403,'resident cannot read management statistics or work logs');
  check((await call('/api/system/users',{cookie})).status===403,'resident cannot read system account authorization list');
  check((await call('/api/auth/admin/set-role',{cookie,data:{userId:account.id,role:'admin'}})).status===404,'unused framework admin endpoints are not exposed');
  check((await call('/api/account',{cookie,method:'PATCH',data:{name:'测试居民',avatar:'leaf',role:'admin'}})).status===400,'profile endpoint rejects permission fields');
  const profile=await call('/api/account',{cookie,method:'PATCH',data:{name:'验收测试居民',avatar:'leaf'}});check(profile.status===200,'resident can update nickname and avatar');
  check((await call('/api/account',{cookie})).body.user.avatar==='leaf','profile persists across requests');
  const adminCode=await send(phones[1]);const adminResult=await signIn(phones[1],adminCode);assert.equal(adminResult.status,200,JSON.stringify(adminResult.body));const adminCookie=adminResult.cookie;
  const adminId=(await call('/api/account',{cookie:adminCookie})).body.user.id;ids.push(adminId);
  await db.query('UPDATE "user" SET role=\'admin\' WHERE id=$1',[adminId]);
  const list=await call(`/api/admin/users?q=${phones[0]}`,{cookie:adminCookie});check(list.status===200&&list.body.total===1,'admin search is authorized using fresh database role');
  const adminAccount=(await call('/api/account',{cookie:adminCookie})).body.user;
  check(adminAccount.managementPath===`/${process.env.TOWN_MANAGE_ENTRY}`,'authorized administrator receives the configured operations entry');
  check(!('systemPath' in adminAccount),'ordinary operator does not receive the super-admin entry');
  check((await call('/api/system/overview',{cookie:adminCookie})).status===403,'ordinary operator cannot access system overview');
  check((await call('/api/system/audit',{cookie:adminCookie})).status===403,'ordinary operator cannot access global audit');
  check((await call('/api/system/users',{cookie:adminCookie,method:'PATCH',data:{id:account.id,role:'super_admin',reason:'test'}})).status===403,'ordinary operator cannot grant super-admin privileges');
  const entryPage=await fetch(base+adminAccount.managementPath,{headers:{Cookie:adminCookie}});
  check(entryPage.status===200,'configured operations entry serves the current management page');
  check((await entryPage.text()).includes('OPERATIONS'),'private route renders the operations centre rather than the legacy page');
  const overview=await call('/api/manage/overview',{cookie:adminCookie});
  const actualCounts=await db.query('SELECT count(*)::int AS total FROM "user"');
  check(overview.status===200&&overview.body.counts.total===actualCounts.rows[0].total,'operations overview reports real database totals');
  const ownLogs=await db.query('SELECT id::text FROM town_audit WHERE actor_id=$1 ORDER BY created_at DESC,id DESC LIMIT 30',[adminId]);
  check(JSON.stringify(overview.body.logs.map(log=>String(log.id)))===JSON.stringify(ownLogs.rows.map(log=>log.id)),'work records include only the signed-in administrator actions');
  const reservedPage=await fetch(`${base}/${process.env.TOWN_SYSTEM_ENTRY}`);
  check(reservedPage.status===200,'private system entry serves its guarded login page');
  check((await call('/api/admin/users',{cookie:adminCookie,method:'PATCH',data:{id:adminId,banned:true,reason:'test'}})).status===400,'administrator cannot ban their own account');
  check((await call('/api/admin/users',{cookie:adminCookie,method:'PATCH',data:{id:account.id,banned:true,reason:'本地自动验收'}})).status===200,'admin can suspend a resident');
  check((await call('/api/account',{cookie})).body.user===null,'suspension immediately invalidates an existing session');
  const detail=await call(`/api/admin/users/${account.id}`,{cookie:adminCookie});check(detail.body.logs.some(log=>log.action==='user.ban'),'suspension is recorded in the audit trail');
  check((await call('/api/admin/users',{cookie:adminCookie,method:'PATCH',data:{id:account.id,banned:false,reason:''}})).status===200,'admin can restore a resident');
  check((await call('/api/account',{cookie})).body.user===null,'restoring an account does not resurrect its revoked session');
  await db.query('DELETE FROM town_limits WHERE key=$1',[`send:+86${phones[0]}`]);
  const again=await signIn(phones[0],await send(phones[0]));check((await call('/api/account',{cookie:again.cookie})).body.user.id===account.id,'repeat phone login reuses the same account');
  await call('/api/auth/sign-out',{cookie:again.cookie,data:{}});check((await call('/api/account',{cookie:again.cookie})).body.user===null,'sign-out revokes the server session');
  await send(phones[2]);await db.query('UPDATE town_otp SET expires_at=now()-interval \'1 second\' WHERE phone=$1',[`+86${phones[2]}`]);check((await signIn(phones[2],'123456')).status===400,'expired code cannot authenticate');
  const limitedCode=await send(phones[3]);const wrongCode=limitedCode==='000000'?'111111':'000000';
  for(let i=0;i<5;i++)await signIn(phones[3],wrongCode);
  check((await signIn(phones[3],limitedCode)).status===400,'five wrong attempts invalidate even the correct code');
  // Parallel redemption must only create one session from the one-time code.
  await db.query('DELETE FROM town_limits WHERE key=$1',[`send:+86${phones[2]}`]);const parallelCode=await send(phones[2]);
  const parallel=await Promise.all([signIn(phones[2],parallelCode),signIn(phones[2],parallelCode)]);check(parallel.filter(item=>item.status===200).length===1,'parallel OTP redemption succeeds at most once');
  const targetCookie=parallel.find(item=>item.status===200).cookie;
  const targetId=(await call('/api/account',{cookie:targetCookie})).body.user.id;
  await db.query('UPDATE "user" SET role=\'super_admin\' WHERE id=$1',[adminId]);
  const superAccount=(await call('/api/account',{cookie:adminCookie})).body.user;
  check(superAccount.role==='super_admin'&&superAccount.systemPath===`/${process.env.TOWN_SYSTEM_ENTRY}`,'super-admin receives its independent private entry');
  const systemOverview=await call('/api/system/overview',{cookie:adminCookie});
  check(systemOverview.status===200&&systemOverview.body.counts.superAdmins>=1,'super-admin reads actual system status');
  check(!JSON.stringify(systemOverview.body).includes(process.env.BETTER_AUTH_SECRET),'system status does not expose authentication secrets');
  await checkSiteSettings({base,db,call,check,adminId,adminCookie,residentCookie:targetCookie});
  await checkCharacters({db,call,check,adminId,adminCookie,targetId,targetCookie});
  await checkService({db,call,check,adminId,adminCookie,targetId,targetCookie});
  check((await call('/api/system/users',{cookie:adminCookie,method:'PATCH',data:{id:adminId,role:'user',reason:'test'}})).status===400,'super-admin cannot revoke their own role');
  check((await call('/api/system/users',{cookie:adminCookie,method:'PATCH',data:{id:targetId,role:'owner',reason:'test'}})).status===400,'system rejects undefined roles');
  check((await call('/api/system/users',{cookie:adminCookie,method:'PATCH',data:{id:targetId,role:'admin',reason:''}})).status===400,'role changes require a reason');
  check((await call('/api/system/users',{cookie:adminCookie,method:'PATCH',origin:'https://other.invalid',data:{id:targetId,role:'admin',reason:'test'}})).status===403,'cross-origin role changes are rejected');
  check((await call('/api/system/users',{cookie:adminCookie,method:'PATCH',data:{id:targetId,role:'admin',reason:'本地授权验收'}})).status===200,'super-admin can grant an operations role');
  check((await call('/api/account',{cookie:targetCookie})).body.user===null,'role changes immediately revoke target sessions');
  const audit=await call('/api/system/audit?action=role.update',{cookie:adminCookie});
  check(audit.status===200&&audit.body.logs.some(log=>log.details.reason==='本地授权验收'&&log.details.before==='user'&&log.details.after==='admin'),'global audit records role before/after and reason');
  check((await call('/api/system/users',{cookie:adminCookie,method:'PATCH',data:{id:targetId,role:'super_admin',reason:'本地超管验收'}})).status===200,'super-admin can explicitly grant a second super-admin');
  check((await call('/api/admin/users',{cookie:adminCookie,method:'PATCH',data:{id:targetId,banned:true,reason:'test'}})).status===400,'operations cannot suspend a super-admin account');
  check((await call('/api/system/users',{cookie:adminCookie,method:'PATCH',data:{id:targetId,role:'user',reason:'收回测试权限'}})).status===200,'super-admin can revoke another account management role');
  await db.query('UPDATE "user" SET role=\'admin\' WHERE id=$1',[adminId]);
  check((await call('/api/system/overview',{cookie:adminCookie})).status===403,'system authorization reads a fresh role on every request');
  console.log(`Passed ${checks} account integration checks.`);
}finally{
  // Remove only this run's generated test accounts. Never touch manually created users/admins.
  const found=await db.query('SELECT id FROM "user" WHERE "phoneNumber"=ANY($1::text[])',[phones.map(p=>`+86${p}`)]);
  const ownIds=found.rows.map(row=>row.id);
  if(ownIds.length){await db.query('DELETE FROM town_audit WHERE actor_id=ANY($1::text[]) OR target_id=ANY($1::text[])',[ownIds]);await db.query('DELETE FROM "user" WHERE id=ANY($1::text[])',[ownIds]);}
  await db.query('DELETE FROM town_otp WHERE phone=ANY($1::text[])',[phones.map(p=>`+86${p}`)]);
  await db.query('DELETE FROM town_limits WHERE key=ANY($1::text[])',[phones.flatMap(p=>[`send:+86${p}`,`verify:+86${p}`])]);
  await db.end();
}
