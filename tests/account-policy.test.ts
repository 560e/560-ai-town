import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePhone,maskPhone,profileInput} from '../lib/account.ts';
import {authConfig,isLoopback} from '../lib/server/config.ts';

test('phone normalization shares one identity and profile changes cannot escalate permissions',()=>{
  assert.equal(normalizePhone('138 0000 0000'),normalizePhone('+8613800000000'));
  assert.equal(maskPhone('+8613800000000'),'138****0000');
  assert.throws(()=>normalizePhone('12345'));
  assert.throws(()=>profileInput({name:'居民',avatar:'wave',role:'admin'}));
  assert.throws(()=>profileInput({name:'<script>',avatar:'wave'}));
  assert.throws(()=>profileInput({name:'居民',avatar:'https://tracking.invalid/image'}));
  assert.deepEqual(profileInput({name:' 海边居民 ',avatar:'leaf'}),{name:'海边居民',avatar:'leaf'});
});
test('local auth fails closed in production even if the local flag was copied',()=>{
  const before={...process.env};
  try{
    process.env.TOWN_LOCAL_AUTH='1';process.env.TOWN_PASSWORD_AUTH='0';(process.env as Record<string,string|undefined>).NODE_ENV='production';process.env.DATABASE_URL='test';process.env.BETTER_AUTH_SECRET='test';
    assert.equal(authConfig().local,false);assert.equal(authConfig().enabled,false);
    assert.equal(isLoopback('https://localhost.attacker.invalid'),false);
    assert.equal(isLoopback('http://127.0.0.1:3000'),true);
  }finally{for(const key of Object.keys(process.env))if(!(key in before))delete process.env[key];Object.assign(process.env,before);}
});
