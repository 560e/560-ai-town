import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyTitle,validateTitle,validateAnswers,titlePolicy} from '../lib/service.ts';
import {createTownRuntime,canUseService,nearestNpc} from '../data/town-runtime.ts';
import {walkSpawns} from '../data/town-config.ts';
import {canStand} from '../data/district-plan.ts';

test('dynamic applications reject unknown fields, invalid choices and unsafe links while allowing incomplete drafts',()=>{
 const config=validateTitle({...emptyTitle(),name:'测试称号',summary:'测试说明',fields:[
  {id:'f_goal',label:'方向',kind:'multi',required:true,help:'',options:['学习','共创']},
  {id:'f_work',label:'作品',kind:'url',required:false,help:'',options:[]}]});
 assert.deepEqual(validateAnswers(config,{},false),{f_goal:[],f_work:''});
 for(const answers of [{},{f_goal:['其他']},{f_goal:['学习','学习']},{role:'admin'},{f_goal:['学习'],f_work:'javascript:alert(1)'},{f_goal:['学习'],f_work:'https://user:pass@example.com'}])assert.throws(()=>validateAnswers(config,answers,true));
 assert.deepEqual(validateAnswers(config,{f_goal:['学习'],f_work:'https://example.com/作品'},true),{f_goal:['学习'],f_work:'https://example.com/作品'});
});
test('title policy detects substantive changes without treating appearance or visibility as new consent terms',()=>{
 const config={...emptyTitle(),name:'身份',summary:'说明'};
 assert.equal(titlePolicy(config),titlePolicy({...config,name:'新名称',visible:true,color:'orange'}));
 assert.notEqual(titlePolicy(config),titlePolicy({...config,days:30}));
 assert.notEqual(titlePolicy(config),titlePolicy({...config,conditions:'新条件'}));
 assert.throws(()=>validateTitle({...config,permissions:['system:admin']}));
 assert.throws(()=>validateTitle({...config,archived:true,visible:true}));
});
test('service gateway is reachable, takes priority over random NPCs and respects movement modes',()=>{
 const r=createTownRuntime();r.player.exists=r.player.walking=true;[r.player.x,r.player.z]=walkSpawns.service;
 assert.ok(canStand(r.player.x,r.player.z));assert.ok(canUseService(r));
 r.npcs[0].x=r.player.x+1;r.npcs[0].z=r.player.z;assert.equal(nearestNpc(r),null);
 r.player.typing=true;assert.equal(canUseService(r),false);r.player.typing=false;
 r.talkingId='service-guide';assert.equal(canUseService(r),false);r.talkingId=null;
 r.player.walking=false;assert.equal(canUseService(r),false);r.player.walking=true;r.player.x=0;assert.equal(canUseService(r),false);
});
