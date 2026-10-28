import test from 'node:test';
import assert from 'node:assert/strict';
import {appearanceInput,defaultAppearance,hairStyles,hairColors,shirtColors,normalizeNickname,savedAppearance} from '../lib/character.ts';
import {profileInput} from '../lib/account.ts';
test('nickname canonicalization and profile validation',()=>{
  assert.equal(normalizeNickname('  ＡＩ  居民  '),'AI 居民');
  assert.equal(profileInput({name:'  ＡＩ居民 ',avatar:'wave'}).name,'AI居民');
  assert.throws(()=>profileInput({name:'居民\u200b',avatar:'wave'}));
  assert.throws(()=>profileInput({name:'居民',avatar:'wave',role:'admin'}));
});
test('character preset validation accepts all styles and rejects arbitrary data',()=>{
  for(const hair of hairStyles)for(const color of hairColors)for(const shirt of shirtColors){
    const look={hairStyle:hair.id,hairColor:color.id,shirtColor:shirt.id};assert.deepEqual(appearanceInput(look),look);
  }
  for(const value of [null,[],{}, {...defaultAppearance,shirtColor:'#000'}, {...defaultAppearance,model:'remote'}, {...defaultAppearance,hairStyle:'missing'}])assert.throws(()=>appearanceInput(value));
  assert.deepEqual(savedAppearance(undefined),defaultAppearance);
  assert.deepEqual(profileInput({name:'海湾居民',avatar:'wave',character:defaultAppearance}).character,defaultAppearance);
});
