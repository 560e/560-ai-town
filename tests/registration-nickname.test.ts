import assert from 'node:assert/strict';
import test from 'node:test';
import {nicknameInput,profileInput} from '../lib/account.ts';
test('registration and profile use the same normalized nickname rules',()=>{
 assert.equal(nicknameInput('  ＡＩ   学员  '),'AI 学员');
 assert.equal(profileInput({name:'  ＡＩ   学员  ',avatar:'wave'}).name,nicknameInput('  ＡＩ   学员  '));
 for(const value of [undefined,123,'','a','a'.repeat(21),'名\u200b字','<名字>'])assert.throws(()=>nicknameInput(value));
 assert.equal(nicknameInput('😀'.repeat(20)),'😀'.repeat(20));
});
