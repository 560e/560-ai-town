import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {validateIdentitySelection,validateBadgeStyle,identityPresets,residentBadge,activeBadges} from '../lib/identity-display.ts';
import {emptyTitle,validateTitle,titlePolicy} from '../lib/service.ts';
test('identity selection caps at ten including resident and rejects duplicate/forged values',()=>{
 const ids=['resident',...Array.from({length:9},()=>randomUUID())];assert.deepEqual(validateIdentitySelection(ids),ids);
 for(const bad of [[...ids,randomUUID()],['resident','resident'],['超级管理员'],[{name:'金牌'}],null])assert.throws(()=>validateIdentitySelection(bad));
 assert.deepEqual(validateIdentitySelection([]),[]);
});
test('appearance accepts only bounded hex colors, never arbitrary CSS',()=>{
 for(const preset of Object.values(identityPresets))assert.deepEqual(validateBadgeStyle(preset.style),preset.style);
 for(const colors of [[],['url(https://bad.invalid)'],['red'],['#fff'],Array(4).fill('#FFFFFF')])assert.throws(()=>validateBadgeStyle({colors,text:'#FFFFFF',border:'#FFFFFF'}));
 assert.throws(()=>validateBadgeStyle({...residentBadge.style,animation:'evil'}));
});
test('legacy titles require explicit display opt-in; styling never changes permission/application policy',()=>{
 const c={...emptyTitle(),name:'学习先锋',summary:'学习称号'};delete c.overheadAllowed;delete c.overheadStyle;
 const validated=validateTitle(c);assert.equal(validated.overheadAllowed,false);
 assert.equal(titlePolicy(c),titlePolicy({...validated,overheadAllowed:true,overheadStyle:identityPresets.gold.style}));
 assert.throws(()=>validateTitle({...c,overheadAllowed:'true'}));
});
test('expired labels disappear on the client even without another snapshot',()=>{
 assert.deepEqual(activeBadges([residentBadge,{...residentBadge,id:'old',expiresAt:new Date(10).toISOString()}],20),[residentBadge]);
});
