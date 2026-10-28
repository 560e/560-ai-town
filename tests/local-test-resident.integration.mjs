import '../scripts/account-env.mjs';
import assert from 'node:assert/strict';
const base=process.env.BETTER_AUTH_URL||'http://localhost:3000';
assert.equal(process.env.TOWN_LOCAL_TEST_RESIDENT,'1');
assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const phoneNumber='13800138000';
async function call(path,data,cookie){
 const response=await fetch(base+path,{method:data?'POST':'GET',headers:{Origin:base,...(data?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:data?JSON.stringify(data):undefined});
 return {status:response.status,body:await response.json(),cookie:response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ')};
}
const sent=await call('/api/auth/phone-number/send-otp',{phoneNumber});
assert.equal(sent.status,200,JSON.stringify(sent.body));assert.equal(sent.body.localCode,'5600');
const wrong=await call('/api/auth/phone-number/verify',{phoneNumber,code:'0000'});assert.equal(wrong.status,400);
const login=await call('/api/auth/phone-number/verify',{phoneNumber,code:'5600'});assert.equal(login.status,200,JSON.stringify(login.body));
try{
 const account=(await call('/api/account',null,login.cookie)).body.user;
 assert.equal(account.role,'user');assert.equal(account.identity,'小镇居民');
 assert.equal(account.managementPath,undefined);assert.equal(account.systemPath,undefined);
 for(const path of ['/api/admin/users','/api/manage/overview','/api/system/overview'])assert.equal((await call(path,null,login.cookie)).status,403);
 assert.equal((await call('/api/auth/phone-number/verify',{phoneNumber,code:'5600'})).status,400);
 assert.equal((await call('/api/auth/phone-number/verify',{phoneNumber:'13800138001',code:'5600'})).status,400);
 console.log('指定测试账号可使用5600验证登录；普通居民权限、错误码拒绝、单次使用和号码隔离均通过。');
}finally{assert.equal((await call('/api/auth/sign-out',{},login.cookie)).status,200);}

