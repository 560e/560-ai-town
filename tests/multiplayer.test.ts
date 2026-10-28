import test from 'node:test';
import {roomNumber,roomPassword} from '../lib/rooms.ts';
import assert from 'node:assert/strict';
import {acceptMovement,poseInput,spawnInput,spawnPose,validPose,visibleCharacters,restorePresencePose} from '../lib/multiplayer.ts';
import {walkSpawns} from '../data/town-config.ts';
import {benches} from '../data/district-plan.ts';
import {createTownRuntime,movePlayer,nearestNpc} from '../data/town-runtime.ts';
test('network coordinates and fixed destinations are validated',()=>{
  for(const key of Object.keys(walkSpawns))assert.ok(validPose(spawnPose(spawnInput(key))));
  assert.throws(()=>spawnInput('toString'));assert.throws(()=>poseInput({...spawnPose(),x:Infinity}));
  assert.throws(()=>poseInput({...spawnPose(),name:'spoof'}));assert.throws(()=>poseInput({...spawnPose(),seat:999}));
  assert.throws(()=>poseInput({...spawnPose(),moving:1}));
});
test('network input accepts expanded town edges and rejects coordinates beyond the layout',()=>{
  const p=spawnPose();
  for(const point of [{x:90,z:0},{x:-90,z:0},{x:0,z:80},{x:0,z:-78}])assert.deepEqual(poseInput({...p,...point}),{...p,...point});
  for(const point of [{x:96,z:0},{x:-96,z:0},{x:0,z:85},{x:0,z:-81}])assert.throws(()=>poseInput({...p,...point}));
});
test('invalid persisted seat indices are rejected without throwing',()=>{
 assert.equal(validPose({...spawnPose(),seat:999}),false);
});
test('joining repairs persisted poses blocked by a changed layout while preserving valid positions',()=>{
 const good=spawnPose('retail');
 assert.deepEqual(restorePresencePose(good),good);
 for(const value of [null,{}, {...good,x:500}, {...good,seat:999}, {...good,x:benches[0][0],z:benches[0][1],seat:null}])assert.deepEqual(restorePresencePose(value),spawnPose());
});
test('network movement bounds speed and prevents crossing pond or wall',()=>{
  const p=spawnPose();assert.ok(acceptMovement(p,{...p,x:p.x+.5,moving:true},250));
  assert.equal(acceptMovement(p,{...p,x:40,moving:true},250),false);
  assert.equal(acceptMovement(p,{...p,x:40,moving:true},60000),false);
  const a={x:-6,z:4,yaw:0,moving:true,seat:null};assert.equal(acceptMovement(a,{...a,x:6},1200),false);
});
test('network movement accepts faster approved running while rejecting impossible jumps',()=>{
 const p=spawnPose();
 assert.ok(acceptMovement(p,{...p,z:p.z-18,moving:true},1000));
 assert.equal(acceptMovement(p,{...p,z:p.z-30,moving:true},1000),false);
});
test('network sitting uses existing benches and permits nearby standing',()=>{
  const [x,z]=benches[0],p={x,z:z+1.4,yaw:0,moving:false,seat:null};
  const seat={...p,z,seat:0};assert.ok(acceptMovement(p,seat,250));assert.ok(acceptMovement(seat,p,250));
  assert.equal(acceptMovement(seat,{...seat,x:20},250),false);
  assert.equal(acceptMovement(seat,{...seat,seat:1},250),false);
});
test('room numbers and optional passwords have strict bounds',()=>{
 assert.equal(roomNumber(1),1);assert.equal(roomNumber(999999),999999);
 for(const value of [0,-1,1000000,1.2,'1',NaN])assert.throws(()=>roomNumber(value));
 assert.equal(roomPassword(undefined),'');assert.equal(roomPassword('朋友 560'),'朋友 560');
 assert.throws(()=>roomPassword('x'.repeat(65)));assert.throws(()=>roomPassword('换\n行'));
});
test('render budget prioritizes users and interaction and stabilizes distance selection',()=>{
  const candidates=Array.from({length:40},(_,i)=>({id:`npc-${i}`,x:i,z:0,kind:'npc' as const}));
  const selected=visibleCharacters([...candidates,{id:'user',x:100,z:0,kind:'user'},{id:'talking',x:101,z:0,kind:'npc',priority:true}],{x:0,z:0},new Set());
  assert.equal(selected.size,29);assert.ok(selected.has('user'));assert.ok(selected.has('talking'));
  assert.deepEqual([...visibleCharacters(candidates.slice(0,2),{x:0,z:0},new Set(['npc-1']),1)],['npc-1']);
});
test('NPCs hidden by the render budget neither block movement nor offer invisible dialogue',()=>{
  const r=createTownRuntime();r.player.exists=true;r.player.walking=true;r.traffic.cars=[];
  r.npcs[0].x=r.player.x+1;r.npcs[0].z=r.player.z;r.visibleCharacterIds=new Set();
  assert.equal(nearestNpc(r),null);const x=r.player.x;movePlayer(r,1.5,0);assert.ok(r.player.x>x+1.4);
});
