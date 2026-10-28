import test from 'node:test';
import assert from 'node:assert/strict';
import {consumeTownReturn,queueTownReturn,townArrival} from '../data/town-navigation.ts';
import {captureTownReturn,saveTownReturn,parseTownReturn} from '../data/town-return.ts';
import {createTownRuntime} from '../data/town-runtime.ts';
import {walkSpawns} from '../data/town-config.ts';

test('district arrivals are safe one-time intents and never replay a previous district',()=>{
 for(const destination of Object.keys(walkSpawns) as (keyof typeof walkSpawns)[]){
  assert.ok(parseTownReturn(JSON.stringify(townArrival(destination))));
  queueTownReturn(destination);const state=consumeTownReturn();assert.ok(state);
  assert.deepEqual([state.player.x,state.player.z],walkSpawns[destination]);
  assert.equal(consumeTownReturn(),null);
 }
});
test('personal return uses the latest actual position after leaving the service doorway',()=>{
 queueTownReturn('service');assert.ok(consumeTownReturn());
 const world=createTownRuntime();[world.player.x,world.player.z]=walkSpawns.retail;world.player.z-=1.2;world.player.exists=true;
 saveTownReturn(captureTownReturn(world,'walking'));queueTownReturn();
 const state=consumeTownReturn();assert.ok(state);
 assert.equal(state.player.x,world.player.x);assert.equal(state.player.z,world.player.z);
 assert.equal(consumeTownReturn(),null);
});
