import test from 'node:test';
import assert from 'node:assert/strict';
import {hallStations,canStandHall,createHallRuntime,moveHall,arriveHall,nearestHallStation,sitHall,standHall} from '../data/service-hall.ts';

test('every service hall station is reachable from the entry without crossing furniture or walls',()=>{
 const seen=new Set<string>(),queue:[[number,number]]|[number,number][]=[[0,7]],key=(x:number,z:number)=>`${x},${z}`;seen.add(key(0,7));
 for(let i=0;i<queue.length;i++){const [x,z]=queue[i];for(const [dx,dz]of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const nx=x+dx,nz=z+dz;if(canStandHall(nx,nz)&&!seen.has(key(nx,nz))){seen.add(key(nx,nz));queue.push([nx,nz]);}}}
 for(const s of hallStations){assert.ok(canStandHall(s.arrival.x,s.arrival.z),s.id);assert.ok(queue.some(([x,z])=>Math.hypot(x-s.arrival.x,z-s.arrival.z)<.5),s.id);const p=createHallRuntime().player;assert.ok(arriveHall(p,s.id));assert.equal(nearestHallStation(p)?.id,s.id);assert.equal(p.moving,false);assert.equal(p.lookYaw,s.yaw);}
});
test('hall walking cannot tunnel through a board, desk or boundary, including a large movement step',()=>{
 const p=createHallRuntime().player;moveHall(p,0,-100);assert.ok(p.z>=-4.69);assert.ok(canStandHall(p.x,p.z));moveHall(p,100,0);assert.ok(p.x<14.5);assert.ok(canStandHall(p.x,p.z));
 arriveHall(p,'permission');moveHall(p,0,-10);assert.ok(p.z>-4);assert.ok(canStandHall(p.x,p.z));
 const before={x:p.x,z:p.z};p.typing=true;moveHall(p,3,3);assert.deepEqual({x:p.x,z:p.z},before);assert.equal(nearestHallStation(p),null);
});
test('both hall benches support seated pose, movement lock, safe standing and destination changes',()=>{
 for(const id of ['bench-a','bench-b'] as const){const p=createHallRuntime().player;assert.equal(sitHall(p,id),false);arriveHall(p,id);assert.ok(sitHall(p,id));const before=[p.x,p.z];moveHall(p,8,8);assert.deepEqual([p.x,p.z],before);assert.equal(nearestHallStation(p)?.id,id);assert.ok(standHall(p));assert.ok(canStandHall(p.x,p.z));assert.equal(p.seat,null);sitHall(p,id);arriveHall(p,'guide');assert.equal(p.seat,null);assert.ok(canStandHall(p.x,p.z));}
});

import {initialHallCameraDistance,zoomHallCamera,hallCameraLimits} from '../data/service-hall-camera.ts';
test('hall zoom is continuous, reversible and bounded for wheel and pinch gestures',()=>{
 const initial=initialHallCameraDistance(16/9),near=zoomHallCamera(initial,-200);
 assert.ok(near<initial);assert.ok(Math.abs(zoomHallCamera(near,200)-initial)<1e-8);
 let far=initial,close=initial;for(let i=0;i<100;i++){far=zoomHallCamera(far,1000);close=zoomHallCamera(close,-1000);}
 assert.equal(far,hallCameraLimits.max);assert.equal(close,hallCameraLimits.min);
 assert.ok(initialHallCameraDistance(390/844)<initial);
});
