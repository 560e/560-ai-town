import {test} from 'node:test';
import assert from 'node:assert/strict';
import {campusCameraLimits,defaultCampusOrbit,parseCampusOrbit,resolveCampusCamera,zoomCampusCamera} from '../data/academy-campus-camera.ts';

test('campus orbit has outdoor zoom and validates saved per-tab state',()=>{
 assert.equal(defaultCampusOrbit.distance,18);
 assert.equal(zoomCampusCamera(48,500),48);
 assert.equal(zoomCampusCamera(5,-500),5);
 assert.deepEqual(parseCampusOrbit('{bad'),defaultCampusOrbit);
 assert.deepEqual(parseCampusOrbit('{"yaw":1,"distance":24,"elevation":0.6}'),{yaw:1,distance:24,elevation:.6});
 assert.deepEqual(parseCampusOrbit('{"yaw":null,"distance":24,"elevation":0.6}'),defaultCampusOrbit);
 const clamped=parseCampusOrbit('{"yaw":100,"distance":999,"elevation":-10}');
 assert.equal(clamped.distance,campusCameraLimits.max);
 assert.ok(clamped.elevation>0);
});

test('campus camera remains above ground and within outdoor envelope at every orbit angle',()=>{
 for(const x of [-41.5,0,41.5])for(const z of [-43.5,0,43.5])for(let yaw=-Math.PI;yaw<=Math.PI;yaw+=.19)for(const elevation of [.16,.5,1.05]){
  const r=resolveCampusCamera({x,z},{yaw,distance:48,elevation},[]);
  assert.ok(Math.abs(r.position.x)<=55.001&&Math.abs(r.position.z)<=55.001);
  assert.ok(r.position.y>.5&&r.position.y<=55);
  assert.ok(r.distance>0&&r.distance<=48);
 }
});

test('campus camera resolves building ray occlusion but can look over lower fixtures',()=>{
 const building={x:0,z:8,w:8,d:4,h:9};
 const orbit={yaw:0,distance:24,elevation:.2};
 const clear=resolveCampusCamera({x:0,z:0},orbit,[]);
 const blocked=resolveCampusCamera({x:0,z:0},orbit,[building]);
 assert.ok(blocked.distance<clear.distance);
 assert.ok(blocked.position.z<6);
 assert.equal(resolveCampusCamera({x:0,z:0},{...orbit,elevation:1.05},[{...building,h:2}]).distance,24);
});
