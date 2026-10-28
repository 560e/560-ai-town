import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationUpdate,registrationAccess} from '../lib/registration-policy.ts';

test('registration setting accepts only explicit boolean and safe version',()=>{
  assert.deepEqual(registrationUpdate({version:0,smsRequired:false}),{version:0,smsRequired:false});
  for(const input of [null,[],{}, {version:-1,smsRequired:false},{version:1.2,smsRequired:false},{version:'0',smsRequired:false},{version:0,smsRequired:'false'},{version:0,smsRequired:0},{version:0,smsRequired:false,role:'super_admin'}])assert.throws(()=>registrationUpdate(input));
});
test('real SMS cannot be enabled before a provider exists',()=>{
  assert.throws(()=>registrationUpdate({version:0,smsRequired:true}),/短信/);
  // Can disable a pre-existing requirement without changing account verification.
  assert.equal(registrationUpdate({version:5,smsRequired:false}).smsRequired,false);
});

test('invitation switch uses explicit booleans and supports existing clients without resetting it',()=>{
  assert.equal(registrationUpdate({version:0,smsRequired:false,inviteRequired:true}).inviteRequired,true);
  assert.equal(registrationUpdate({version:0,smsRequired:false}).inviteRequired,undefined);
  assert.throws(()=>registrationUpdate({version:0,smsRequired:false,inviteRequired:'false'}));
  assert.equal(registrationAccess({sms_required:false,invite_required:true}).inviteRequired,true);
});
test('missing or malformed policy fails closed rather than allowing password registration',()=>{
  for(const row of [undefined,null,{}, {sms_required:'false'}, {sms_required:null}])assert.throws(()=>registrationAccess(row),/注册配置/);
  assert.deepEqual(registrationAccess({sms_required:false}),{smsRequired:false,inviteRequired:false,smsConfigured:false,passwordRegistrationAllowed:true});
  assert.deepEqual(registrationAccess({sms_required:true}),{smsRequired:true,inviteRequired:false,smsConfigured:false,passwordRegistrationAllowed:false});
});
