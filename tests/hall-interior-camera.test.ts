import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveHallCamera,hallInterior,hallCameraLimits,initialHallCameraDistance} from '../data/service-hall-camera.ts';
import {canStandHall,hallObstacles} from '../data/service-hall.ts';

test('interior camera stays within the room at every rotation, zoom and edge position',()=>{
 for(const [x,z] of [[0,7],[0,0],[14,0],[-14,0],[0,11],[0,-10],[11,10],[-11,-10]]){
  assert.ok(canStandHall(x,z));
  for(let yaw=0;yaw<Math.PI*2;yaw+=Math.PI/12)for(const elevation of [-.08,.24,.55])for(const distance of [hallCameraLimits.min,hallCameraLimits.max]){
   const view=resolveHallCamera({x,z},{yaw,elevation,distance});
   assert.ok(Math.abs(view.position.x)<hallInterior.halfWidth-.2);
   assert.ok(Math.abs(view.position.z)<hallInterior.halfDepth-.2);
   assert.ok(view.position.y>.3&&view.position.y<hallInterior.ceiling-.2);
   assert.ok(view.distance>0&&view.distance<=distance+1e-8);
  }
 }
});
test('camera retracts before service furniture and restores the requested distance in open space',()=>{
 const orbit={yaw:Math.PI,elevation:.05,distance:8};
 const near=resolveHallCamera({x:0,z:-3.1},orbit);
 assert.ok(near.position.z>-5.1,'camera must stop in front of reception desk');
 const open=resolveHallCamera({x:0,z:7},orbit);
 assert.ok(open.distance>near.distance);
 assert.equal(orbit.distance,8,'collision must not overwrite user zoom preference');
 for(const b of hallObstacles){
  const pose={x:b.x,z:b.z+b.d/2+.6};if(!canStandHall(pose.x,pose.z))continue;
  const camera=resolveHallCamera(pose,orbit);
  assert.ok(camera.position.z>b.z+b.d/2,'camera must not enter fixture');
 }
});
test('initial camera is an indoor third-person view and seating lowers its focus',()=>{
 const initial=resolveHallCamera({x:0,z:7},{yaw:0,elevation:.24,distance:initialHallCameraDistance(16/9)});
 assert.ok(initial.position.y<4);assert.ok(initial.position.z<11.4);assert.ok(initial.distance<8);
 const seated=resolveHallCamera({x:-10,z:3.5,seated:true},{yaw:0,elevation:.24,distance:4});
 assert.ok(seated.target.y<initial.target.y);
});
