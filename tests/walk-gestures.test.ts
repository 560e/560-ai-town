import test from 'node:test';
import assert from 'node:assert/strict';
import {WalkGesture} from '../data/walk-gestures.ts';
import {zoomWalkCamera} from '../data/walk-camera.ts';

test('one finger rotates, two fingers zoom without rotating, and lifting resumes from the latest position',()=>{
 const gesture=new WalkGesture();
 gesture.start(1,10,20,'touch');
 assert.deepEqual(gesture.move(1,20,25),{rotateX:10,rotateY:5,zoomDelta:0});
 gesture.start(2,120,25,'touch');
 const spread=gesture.move(2,220,25);
 assert.equal(spread.rotateX,0);assert.equal(spread.rotateY,0);assert.ok(spread.zoomDelta<0);
 gesture.move(1,30,40);
 gesture.end(2);
 assert.deepEqual(gesture.move(1,32,43),{rotateX:2,rotateY:3,zoomDelta:0});
});

test('spread brings both cameras closer and pinch moves away within existing limits',()=>{
 for(const view of ['third','first'] as const){
  const gesture=new WalkGesture();gesture.start(1,0,0,'touch');gesture.start(2,100,0,'touch');
  const initial=view==='third'?7:62;
  const spread=gesture.move(2,200,0).zoomDelta;
  const pinch=gesture.move(2,50,0).zoomDelta;
  assert.ok(zoomWalkCamera(initial,spread,view)<initial);
  assert.ok(zoomWalkCamera(initial,pinch,view)>initial);
  let near=initial,far=initial;
  for(let i=0;i<100;i++){near=zoomWalkCamera(near,spread,view);far=zoomWalkCamera(far,pinch,view);}
  assert.equal(near,view==='third'?5.2:48);assert.equal(far,view==='third'?60:72);
 }
});

test('pinch release blocks scene clicks until a fresh gesture, while a normal tap stays clickable',()=>{
 const gesture=new WalkGesture();gesture.start(1,0,0,'touch');
 assert.equal(gesture.blocksClick,false);
 gesture.start(2,100,0,'touch');assert.equal(gesture.blocksClick,true);
 gesture.end(2);assert.equal(gesture.blocksClick,true);
 gesture.end(1);assert.equal(gesture.blocksClick,true);
 gesture.start(3,0,0,'touch');gesture.end(3);assert.equal(gesture.blocksClick,false);
});

test('cancel or pause clears all pointers without allowing a trailing click or stale motion',()=>{
 const gesture=new WalkGesture();gesture.start(1,0,0,'touch');gesture.start(2,100,0,'touch');
 gesture.reset();
 assert.deepEqual(gesture.pointerIds,[]);assert.equal(gesture.blocksClick,true);
 assert.deepEqual(gesture.move(2,300,100),{rotateX:0,rotateY:0,zoomDelta:0});
 gesture.start(3,20,30,'touch');
 assert.deepEqual(gesture.move(3,21,32),{rotateX:1,rotateY:2,zoomDelta:0});
});

test('unregistered UI fingers do not affect camera gestures and mouse dragging still rotates',()=>{
 const gesture=new WalkGesture();gesture.start(1,10,20,'touch');
 assert.deepEqual(gesture.move(99,100,100),{rotateX:0,rotateY:0,zoomDelta:0});
 assert.deepEqual(gesture.move(1,11,22),{rotateX:1,rotateY:2,zoomDelta:0});
 gesture.reset();gesture.start(4,10,10,'mouse');
 assert.equal(gesture.start(5,50,10,'touch'),false);
 assert.deepEqual(gesture.move(4,12,13),{rotateX:2,rotateY:3,zoomDelta:0});
});

test('third finger freezes motion and removing it rebases the remaining pinch without jumping',()=>{
 const gesture=new WalkGesture();gesture.start(1,0,0,'touch');gesture.start(2,100,0,'touch');gesture.start(3,200,0,'touch');
 assert.deepEqual(gesture.move(2,150,0),{rotateX:0,rotateY:0,zoomDelta:0});
 gesture.end(3);
 assert.deepEqual(gesture.move(2,150,0),{rotateX:0,rotateY:0,zoomDelta:0});
 assert.ok(gesture.move(2,160,0).zoomDelta<0);
});

test('coincident touch points cannot create nonfinite zoom or a jump when they separate',()=>{
 const gesture=new WalkGesture();gesture.start(1,10,10,'touch');gesture.start(2,10,10,'touch');
 assert.equal(gesture.move(2,20,10).zoomDelta,0);
 const delta=gesture.move(2,30,10).zoomDelta;
 assert.ok(Number.isFinite(delta));assert.ok(delta<0);
});
