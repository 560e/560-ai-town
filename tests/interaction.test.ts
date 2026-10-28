import test from 'node:test';
import assert from 'node:assert/strict';
import {createTraffic,stepTraffic,overlapsCars,footprint,vehicleTypes,makeRoute,sampleTraffic,pedestrianInCar,MAX_VEHICLES,boundaryOpacity} from '../data/traffic.ts';
import {townPoint,townDistance} from '../data/town-scale.ts';
import {buildings} from '../data/district-plan.ts';
import {roads,walkSpawns} from '../data/town-config.ts';
import {createTownRuntime,nearestNpc,movePlayer,stepTown,lineClear} from '../data/town-runtime.ts';
import {dialogueLines,chooseLine,areaAt} from '../data/npc-dialogue.ts';
function random(seed:number){return ()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);}
test('twelve vehicle types circulate, yield at intersections, stay sparse and never overlap across deterministic runs',()=>{
 assert.equal(vehicleTypes.length,12);const seen=new Set<number>();
 for(const seed of [931,27,560,2026]){const rng=random(seed),world=createTraffic(rng);for(let i=0;i<30*480;i++){stepTraffic(world,1/30,[],rng);assert.ok(world.cars.length<=MAX_VEHICLES);for(let a=0;a<world.cars.length;a++)for(let b=a+1;b<world.cars.length;b++)assert.ok(!overlapsCars(footprint(world.cars[a]),footprint(world.cars[b]),0),`overlap seed ${seed}`);}assert.ok(world.exited>20,`traffic stalled seed ${seed}, exits ${world.exited}`);world.typesSeen.forEach(t=>seen.add(t));}assert.equal(seen.size,12);
});
test('every entry/exit pair remains on the road network with separate right-hand lanes',()=>{
 for(let entry=0;entry<4;entry++)for(let exit=0;exit<4;exit++){if(entry===exit)continue;const route=makeRoute(entry,exit,random(560));assert.notEqual(route.entry,route.exit);assert.equal(Math.abs(route.points[0].x),townDistance(80));for(let s=0;s<route.length;s+=.4){const p=sampleTraffic(route,s);if(boundaryOpacity({...p,type:7})===0)continue;assert.ok(roads.some(r=>Math.abs(p.x-r.position[0])<=r.size[0]/2+.01&&Math.abs(p.z-r.position[1])<=r.size[1]/2+.01),`off road ${p.x},${p.z}`);}}
 const east=sampleTraffic(makeRoute(0,1,()=>.5),25),west=sampleTraffic(makeRoute(1,0,()=>.5),25);assert.ok(east.z>townDistance(-49));assert.ok(west.z<townDistance(-49));
});
test('vehicles stop for a pedestrian and resume after the pedestrian leaves',()=>{
 const rng=random(44),world=createTraffic(rng);world.cars=world.cars.slice(0,1);world.nextSpawn=Infinity;const car=world.cars[0],ped=sampleTraffic(car.route,car.distance+15);
 for(let i=0;i<300;i++){stepTraffic(world,1/30,[ped],rng);assert.ok(!pedestrianInCar(ped,car,0));}assert.equal(car.speed,0);const stopped=car.distance;for(let i=0;i<150;i++)stepTraffic(world,1/30,[],rng);assert.ok(car.distance>stopped+5);
});
test('NPC selection respects proximity and walls; talking pauses and resumes the selected NPC',()=>{
 const r=createTownRuntime();r.player.exists=r.player.walking=true;[r.player.x,r.player.z]=walkSpawns.retail;r.npcs.forEach((n,i)=>{n.x=r.player.x;n.z=i===0?r.player.z-2:-30;});assert.equal(nearestNpc(r)?.id,r.npcs[0].id);r.player.walking=false;assert.equal(nearestNpc(r),null);r.player.walking=true;r.talkingId=r.npcs[0].id;const clock=r.npcs[0].clock;stepTown(r,.02,true);assert.equal(r.npcs[0].clock,clock);assert.equal(nearestNpc(r),null);r.talkingId=null;stepTown(r,.02,true);assert.ok(r.npcs[0].clock>clock);const office=buildings.find(b=>b.id==='enterprise-1')!;assert.equal(lineClear({x:office.position[0]-6,z:office.position[1]},{x:office.position[0]+6,z:office.position[1]}),false);
});
test('movement respects NPCs and cars, and each district provides non-repeating scene-specific dialogue',()=>{
 const r=createTownRuntime();[r.player.x,r.player.z]=townPoint([41,5]);const initialZ=r.player.z;r.npcs.forEach((n,i)=>{n.x=r.player.x;n.z=i===0?initialZ-2:townDistance(-30);});movePlayer(r,0,-3);assert.ok(r.player.z>=initialZ-2+.78);assert.equal(areaAt(...townPoint([41,5])),'retail');assert.equal(areaAt(...townPoint([41,30])),'community');assert.equal(areaAt(...townPoint([0,5])),'plaza');
 for(const [area,lines]of Object.entries(dialogueLines)){assert.ok(lines.length>=4);for(let previous=0;previous<lines.length;previous++)for(const n of [0,.3,.8,.999]){const line=chooseLine(area as keyof typeof dialogueLines,previous,()=>n);assert.notEqual(line.index,previous);assert.ok(lines.includes(line.text));}}
});
