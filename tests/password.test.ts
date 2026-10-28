import test from 'node:test';
import assert from 'node:assert/strict';
import {authConfig} from '../lib/server/config.ts';
import {guard} from '../lib/server/http.ts';
import {validatePassword} from '../lib/password-policy.ts';
import {newConfig,envText,unitText,accountHealthy,healthHeaders,proxyLocationText} from '../scripts/deploy/config.mjs';
test('public password mode requires HTTPS, trusted proxy host and exact mutation Origin',()=>{
  const keys=['NODE_ENV','TOWN_LOCAL_AUTH','TOWN_PASSWORD_AUTH','BETTER_AUTH_URL','DATABASE_URL','BETTER_AUTH_SECRET','TOWN_TRUST_PROXY'];const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
  try{
    Object.assign(process.env,{NODE_ENV:'production',TOWN_LOCAL_AUTH:'1',TOWN_PASSWORD_AUTH:'1',BETTER_AUTH_URL:'https://test.example',DATABASE_URL:'postgresql://example',BETTER_AUTH_SECRET:'a'.repeat(48),TOWN_TRUST_PROXY:'1'});
    assert.ok(authConfig().password);assert.equal(authConfig().local,false);
    const headers={Host:'test.example','x-forwarded-host':'test.example','x-forwarded-proto':'https',Origin:'https://test.example','Content-Type':'application/json'};
    guard(new Request('http://127.0.0.1/api/account',{method:'POST',headers}),true);
    for(const bad of [{Origin:'https://evil.example'},{Host:'evil.example'},{'x-forwarded-proto':'http'},{'x-forwarded-host':'evil.example'},{'sec-fetch-site':'cross-site'}])assert.throws(()=>guard(new Request('http://127.0.0.1/api/account',{method:'POST',headers:{...headers,...bad} as Record<string,string>}),true));
    process.env.BETTER_AUTH_URL='http://test.example';assert.equal(authConfig().enabled,false);
    process.env.BETTER_AUTH_URL='https://test.example';process.env.TOWN_PASSWORD_AUTH='0';assert.equal(authConfig().enabled,false);
  }finally{for(const k of keys){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
});
test('password policy and production deployment do not re-enable development OTPs',()=>{
  for(const value of ['123456789012','abcdefghijk','Abc123',null,'A1'.repeat(65)])assert.throws(()=>validatePassword(value));
  assert.equal(validatePassword('TestPass123!'),'TestPass123!');
  const c=newConfig({projectRoot:'/srv/town',mode:'password',appPort:56043,host:'opc.560e.com',databaseUrl:'postgresql://example'});
  assert.match(envText(c),/BETTER_AUTH_URL=https:\/\/opc.560e.com/);assert.match(envText(c),/TOWN_LOCAL_AUTH=0/);assert.match(envText(c),/TOWN_PASSWORD_AUTH=1/);assert.match(unitText(c),/next start/);assert.ok(accountHealthy('password',{enabled:true,password:true,local:false}));
});

test('password deployment health probe uses trusted origin headers without weakening the account guard',()=>{
 const keys=['NODE_ENV','TOWN_LOCAL_AUTH','TOWN_PASSWORD_AUTH','BETTER_AUTH_URL','DATABASE_URL','BETTER_AUTH_SECRET','TOWN_TRUST_PROXY'];const before=Object.fromEntries(keys.map(k=>[k,process.env[k]]));
 try{
  Object.assign(process.env,{NODE_ENV:'production',TOWN_LOCAL_AUTH:'0',TOWN_PASSWORD_AUTH:'1',BETTER_AUTH_URL:'https://test.example',DATABASE_URL:'postgresql://example',BETTER_AUTH_SECRET:'a'.repeat(48),TOWN_TRUST_PROXY:'1'});
  const c=newConfig({projectRoot:'/srv/town',mode:'password',appPort:56043,host:'test.example',databaseUrl:'postgresql://example'});
  assert.throws(()=>guard(new Request('http://127.0.0.1:56043/api/account')));
  guard(new Request('http://127.0.0.1:56043/api/account',{headers:healthHeaders(c)}));
  assert.deepEqual(healthHeaders({...c,mode:'test'}),{});
  assert.match(proxyLocationText(c),/client_max_body_size 8m;/);
 }finally{for(const k of keys){if(before[k]===undefined)delete process.env[k];else process.env[k]=before[k];}}
});
