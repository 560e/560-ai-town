import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeInvite,inviteCount} from '../lib/invitations.ts';
test('invitation formatting is canonical and batch size is bounded',()=>{
  assert.equal(normalizeInvite(' ABCDEF-012345-abcdef-012345 '),'ABCDEF012345ABCDEF012345');
  for(const bad of ['',null,123,'Z'.repeat(24),'A'.repeat(200),'A;DROP'])assert.throws(()=>normalizeInvite(bad));
  assert.equal(inviteCount(1),1);assert.equal(inviteCount(100),100);
  for(const bad of [0,101,1.5,'10',null])assert.throws(()=>inviteCount(bad));
});
