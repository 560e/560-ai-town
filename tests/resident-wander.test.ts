import test from "node:test";
import assert from "node:assert/strict";
import {createTownRuntime,stepTown} from "../data/town-runtime.ts";
import {insideWander,stepResident} from "../data/resident-wander.ts";
import {canStand} from "../data/district-plan.ts";
function random(seed:number){return ()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);}
test("residents roam in two dimensions, pause, avoid objects and neighbours, and stay in their districts",()=>{
 const endings:string[]=[];
 for(const seed of [560,7,29]){
  const rng=random(seed),world=createTownRuntime(rng),npcs=world.npcs;
  const samples=npcs.map(n=>({minX:n.x,maxX:n.x,minZ:n.z,maxZ:n.z,walked:0,paused:0}));
  for(let frame=0;frame<2400;frame++)for(const [index,n]of npcs.entries()){
   const x=n.x,z=n.z;stepResident(n,.05,npcs,rng);
   assert.ok(canStand(n.x,n.z,.57),`${n.id} hit an obstacle`);
   assert.ok(insideWander(n.wander,n.x,n.z),`${n.id} left district`);
   assert.ok(Math.hypot(n.x-x,n.z-z)<=.071,`${n.id} teleported`);
   for(const other of npcs)if(n!==other)assert.ok(Math.hypot(n.x-other.x,n.z-other.z)>=1.049,`${n.id} overlaps ${other.id}`);
   const s=samples[index];s.minX=Math.min(s.minX,n.x);s.maxX=Math.max(s.maxX,n.x);s.minZ=Math.min(s.minZ,n.z);s.maxZ=Math.max(s.maxZ,n.z);if(n.moving)s.walked++;else s.paused++;
  }
  for(const [i,s]of samples.entries()){assert.ok(s.walked>70&&s.paused>10,`${npcs[i].id} should walk and pause`);assert.ok(s.maxX-s.minX>1&&s.maxZ-s.minZ>1,`${npcs[i].id} stuck on a line`);}
  endings.push(npcs.map(n=>`${n.x.toFixed(2)},${n.z.toFixed(2)}`).join(";"));
 }
 assert.equal(new Set(endings).size,3);
});
test("talking and reduced motion freeze residents; player presence blocks their path",()=>{
 const world=createTownRuntime(random(9)),n=world.npcs[0];world.talkingId=n.id;
 const before={x:n.x,z:n.z,clock:n.clock};for(let i=0;i<20;i++)stepTown(world,.05,true);assert.deepEqual({x:n.x,z:n.z,clock:n.clock},before);
 world.talkingId=null;const frozen=world.npcs.map(n=>[n.x,n.z,n.clock]);stepTown(world,.05,false);assert.deepEqual(world.npcs.map(n=>[n.x,n.z,n.clock]),frozen);
 n.x=41;n.z=0;n.heading=0;n.wander={bounds:[38,44,-5,5],target:{x:41,z:4},speed:1.2,wait:0,blocked:0};
 const player={x:41,z:1.1};for(let i=0;i<300;i++){stepResident(n,.05,[n,player],random(i));assert.ok(Math.hypot(n.x-player.x,n.z-player.z)>=1.049);}
 assert.ok(n.clock>before.clock);
});
