import test from 'node:test';
import assert from 'node:assert/strict';
import {zoomWalkCamera,walkCameraLimits,walkCameraElevation} from '../data/walk-camera.ts';
test('walking zoom remains bounded and first-person zoom preserves its field of view limits',()=>{
 for(const view of ['third','first'] as const){const range=walkCameraLimits[view];let near=range.initial,far=range.initial;for(let i=0;i<100;i++){near=zoomWalkCamera(near,-1000,view);far=zoomWalkCamera(far,1000,view);}assert.equal(near,range.min);assert.equal(far,range.max);assert.ok(zoomWalkCamera(range.initial,-100,view)<range.initial);assert.ok(zoomWalkCamera(range.initial,100,view)>range.initial);}
});

test('distant walking views rise smoothly while preserving the original close follow view',()=>{
 assert.equal(walkCameraElevation(7,.15),.32+.15*.6);
 let previous=walkCameraElevation(12,.15);
 for(let distance=13;distance<=walkCameraLimits.third.max;distance++){
  const elevation=walkCameraElevation(distance,.15);
  assert.ok(elevation>=previous);assert.ok(elevation<Math.PI/2);previous=elevation;
 }
 assert.ok(walkCameraLimits.third.max*Math.sin(previous)>40);
 assert.ok(walkCameraElevation(walkCameraLimits.third.max,.9)<Math.PI/2);
});
