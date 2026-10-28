import test from 'node:test';
import assert from 'node:assert/strict';
import {isLocalTestResident,localTestResidentPhone} from '../lib/server/local-test-resident.ts';
test('fixed test OTP is restricted to its opted-in loopback development account',()=>{
 const enabled={NODE_ENV:'development',TOWN_LOCAL_AUTH:'1',TOWN_LOCAL_TEST_RESIDENT:'1',BETTER_AUTH_URL:'http://localhost:3000'} as NodeJS.ProcessEnv;
 assert.equal(isLocalTestResident(localTestResidentPhone,enabled),true);
 assert.equal(isLocalTestResident('+8613800138001',enabled),false);
 for(const override of [{NODE_ENV:'production'},{TOWN_LOCAL_AUTH:'0'},{TOWN_LOCAL_TEST_RESIDENT:undefined},{BETTER_AUTH_URL:'https://560e.com'},{BETTER_AUTH_URL:'http://localhost.example.com'}]){
  assert.equal(isLocalTestResident(localTestResidentPhone,{...enabled,...override}),false);
 }
});
