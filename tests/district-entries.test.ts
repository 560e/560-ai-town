import test from 'node:test';
import assert from 'node:assert/strict';
import {districtEntries,nearbyDistrict,returnDestination} from '../data/district-entries.ts';
import {createTownRuntime} from '../data/town-runtime.ts';
import {canStand} from '../data/district-plan.ts';
import {walkSpawns} from '../data/town-config.ts';
import {districtIntroductions} from '../data/district-introductions.ts';
test('seven district entrances have safe fixed arrivals, direct routes and valid return destinations',()=>{
 const r=createTownRuntime();r.player.walking=true;
 assert.equal(new Set(districtEntries.map(e=>e.id)).size,7);
 for(const e of districtEntries){assert.ok(canStand(e.arrival[0],e.arrival[1]),e.id);assert.deepEqual(walkSpawns[e.destination],e.arrival);[r.player.x,r.player.z]=e.arrival;assert.equal(nearbyDistrict(r)?.id,e.id);assert.equal(returnDestination(e.destination),e.destination);assert.ok(e.href==='/service'||Object.hasOwn(districtIntroductions,e.id));}
 for(const value of [undefined,'all','unknown','//example.com',['service']])assert.equal(returnDestination(value),null);
});
test('district interaction is suppressed during typing, sitting and dialogues and at remote positions',()=>{
 const r=createTownRuntime();r.player.walking=true;[r.player.x,r.player.z]=walkSpawns.academy;
 r.player.typing=true;assert.equal(nearbyDistrict(r),null);r.player.typing=false;r.player.seat={index:0,returnX:0,returnZ:0};assert.equal(nearbyDistrict(r),null);r.player.seat=null;r.talkingId='npc';assert.equal(nearbyDistrict(r),null);r.talkingId=null;r.player.x=60;r.player.z=0;assert.equal(nearbyDistrict(r),null);
});

