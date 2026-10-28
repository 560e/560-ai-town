import test from 'node:test';
import assert from 'node:assert/strict';
import {captureTownReturn,parseTownReturn,restoreTownReturn} from '../data/town-return.ts';
import {createTownRuntime} from '../data/town-runtime.ts';
import {walkSpawns} from '../data/town-config.ts';
import {benches} from '../data/district-plan.ts';

test('snapshots from a previous town layout are discarded instead of restoring stale world coordinates',()=>{
 const saved=captureTownReturn(createTownRuntime(),'walking');
 const old={...saved} as Record<string,unknown>;delete old.layoutVersion;
 assert.equal(parseTownReturn(JSON.stringify(old)),null);
 assert.equal(parseTownReturn(JSON.stringify({...saved,layoutVersion:1})),null);
 assert.ok(parseTownReturn(JSON.stringify(saved)));
});

test('account return restores the actual shop-street position, view and zoom without held movement',()=>{
 const before=createTownRuntime();
 [before.player.x,before.player.z]=walkSpawns.retail;
 before.player.z-=1.2;before.player.exists=true;before.player.walking=true;
 before.player.lookYaw=1.3;before.player.yaw=.6;before.player.pitch=.4;before.player.view='first';
 before.walkZoom={third:38,first:55};
 const saved=parseTownReturn(JSON.stringify(captureTownReturn(before,'walking')));
 assert.ok(saved);
 const after=createTownRuntime();after.player.moving=true;after.player.typing=true;after.talkingId='npc';
 restoreTownReturn(after,saved);
 assert.equal(after.player.z,before.player.z);assert.equal(after.player.x,before.player.x);
 assert.equal(after.player.lookYaw,1.3);assert.equal(after.player.view,'first');
 assert.deepEqual(after.walkZoom,{third:38,first:55});assert.equal(after.player.walking,true);
 assert.equal(after.player.moving,false);assert.equal(after.player.typing,false);assert.equal(after.talkingId,null);
 assert.equal(after.lastDestination,0);
});

test('overview and welcome return keep their own modes and camera framing',()=>{
 const r=createTownRuntime();r.overviewCamera={position:[85,122,80],fitDistance:190};
 for(const mode of ['overview','welcome'] as const){
  const saved=parseTownReturn(JSON.stringify(captureTownReturn(r,mode)));assert.ok(saved);
  assert.equal(saved.mode,mode);assert.deepEqual(saved.overview,r.overviewCamera);
  const restored=createTownRuntime();restoreTownReturn(restored,saved);assert.equal(restored.player.walking,false);
 }
});

test('return snapshots reject malformed, obstructed and out-of-range scene data',()=>{
 const valid=captureTownReturn(createTownRuntime(),'walking');
 assert.equal(parseTownReturn(null),null);assert.equal(parseTownReturn('{bad'),null);
 for(const changes of [{version:2},{mode:'admin'},{zoom:{third:500,first:55}},{player:{...valid.player,x:500}},{player:{...valid.player,pitch:null}},{overview:{position:[1,2],fitDistance:190}}]){
  assert.equal(parseTownReturn(JSON.stringify({...valid,...changes})),null);
 }
 const [x,z]=benches[0];
 assert.equal(parseTownReturn(JSON.stringify({...valid,player:{...valid.player,x,z,seat:null}})),null);
 const seated={...valid,player:{...valid.player,x,z,seat:{index:0,returnX:x,returnZ:z+1.4}}};
 assert.ok(parseTownReturn(JSON.stringify(seated)));
});
