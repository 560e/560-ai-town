import test from 'node:test';
import assert from 'node:assert/strict';
import {chatText} from '../lib/town-chat.ts';
import {matchedWord,normalizedChat,parseWordImport,wordRule} from '../lib/moderation.ts';
test('chat validates complete graphemes and rejects blank/oversize input',()=>{
 assert.equal(chatText('  你好\n小镇 ',60),'你好 小镇');assert.equal(chatText('👨‍👩‍👧‍👦'.repeat(60),60),'👨‍👩‍👧‍👦'.repeat(60));
 assert.equal(chatText('你好\r\n小镇',300,true),'你好\n小镇');
 assert.throws(()=>chatText(' \n\t ',60));assert.throws(()=>chatText('好'.repeat(61),60));assert.throws(()=>chatText(12,60));assert.throws(()=>chatText('a'.repeat(6001),300));
});
test('literal moderation normalizes fullwidth, separators and zero-width characters',()=>{
 const rules=[{term:'测试屏蔽',category:'其他',enabled:true},{term:'ＡＢＣ',category:'其他',enabled:true}];
 assert.ok(matchedWord('测 \u200b试-屏。蔽',rules));assert.ok(matchedWord('abc',rules));assert.equal(matchedWord('正常交流学习 AI',rules),null);assert.equal(matchedWord('测试屏蔽',[{...rules[0],enabled:false}]),null);
 assert.equal(normalizedChat('Ａ-Ｂ Ｃ'),'abc');assert.throws(()=>wordRule({term:'!!!',category:'其他',enabled:true}));
});
test('imports validate all rows, deduplicate variants and preserve disabled CSV rules',()=>{
 const txt=parseWordImport('\uFEFF测试\n测 试\n另一个','txt');assert.equal(txt.rules.length,2);assert.equal(txt.duplicates,1);
 const csv=parseWordImport('词语,分类,启用\r\n"你好,世界",其他,停用\r\n"引用""词",辱骂,启用','csv');assert.equal(csv.errors.length,0);assert.equal(csv.rules[0].enabled,false);assert.equal(csv.rules[1].term,'引用"词');
 const invalid=parseWordImport('词语,分类,启用\n正常,其他,启用\n异常,未知,启用','csv');assert.equal(invalid.errors[0].line,3);
 assert.throws(()=>parseWordImport('word,category,enabled\na,其他,1','csv'));assert.throws(()=>parseWordImport('词语,分类,启用\n"未结束','csv'));assert.throws(()=>parseWordImport('a\n'.repeat(1001),'txt'));
});
