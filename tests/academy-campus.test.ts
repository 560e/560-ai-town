import test from 'node:test';
import assert from 'node:assert/strict';
import {campusStations,campusBuildings,campusSpawn,canStandCampus,createCampusRuntime,arriveCampus,sitCampus,standCampus,moveCampus} from '../data/academy-campus.ts';
import {sceneSpawn,scenePoseInput,acceptSceneMovement,sceneLineClear,sceneNavigationPose,sceneTransferPose,restoreScenePose} from '../lib/town-scenes.ts';

test('campus portals and six seats are reachable around the south student center',()=>{
 assert.equal(campusSpawn.z,37);
 for(let z=31;z>=15;z--)for(const x of [-10,10])assert.ok(canStandCampus(x,z),`side path ${x},${z}`);
 const reached=new Set<string>(),queue=[[0,37]];
 while(queue.length){const [x,z]=queue.shift()!,key=`${x},${z}`;if(reached.has(key)||!canStandCampus(x,z))continue;reached.add(key);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])if(!reached.has(`${x+dx},${z+dz}`))queue.push([x+dx,z+dz]);}
 for(const station of campusStations){assert.ok(canStandCampus(station.arrival.x,station.arrival.z),station.id);assert.ok(reached.has(`${station.arrival.x},${station.arrival.z}`),`${station.id} reachable`);}
 for(const building of campusBuildings)assert.equal(canStandCampus(building.x,building.z),false);
 assert.equal(canStandCampus(7,40),false);assert.equal(canStandCampus(-7,40),false);assert.equal(canStandCampus(0,40),true);assert.equal(canStandCampus(42,0),false);assert.equal(canStandCampus(NaN,0),false);
});
test('campus seats and movement use one client/server geometry contract',()=>{
 const p=createCampusRuntime().player;
 for(const [index,s] of campusStations.filter(s=>s.id.startsWith('bench')).entries()){
  assert.ok(arriveCampus(p,s.id));assert.ok(sitCampus(p,s.id));assert.equal(p.seat?.index,index);
  const pose={x:p.x,z:p.z,yaw:p.yaw,moving:false,seat:index};
  assert.deepEqual(sceneNavigationPose('learning-campus',s.id,pose),pose);
  assert.ok(standCampus(p));assert.ok(canStandCampus(p.x,p.z));
 }
 arriveCampus(p,'teaching');moveCampus(p,0,-30);assert.ok(p.z>-21);
 const scene='learning-campus',start=sceneSpawn(scene);
 assert.notDeepEqual(start,sceneSpawn('service'));
 assert.throws(()=>scenePoseInput({...start,seat:6},scene));
 assert.throws(()=>sceneSpawn(scene,'permission'));
 assert.equal(acceptSceneMovement({...start,x:-15,z:-28},{...start,x:15,z:-28},1200,scene),false);
 assert.equal(sceneLineClear(scene,{x:-15,z:-28},{x:15,z:-28}),false);
 assert.equal(sceneLineClear(scene,{x:0,z:37},{x:0,z:-18}),false);
 assert.equal(sceneLineClear(scene,{x:4,z:15},{x:4,z:-18}),true);
});
test('legacy academy history resets once while new saved campus history survives private reading',()=>{
 const scene='learning-campus',old={x:0,z:7,yaw:0,moving:false,seat:null};
 assert.deepEqual(restoreScenePose(old,scene),sceneSpawn(scene));
 const reset=sceneTransferPose('account',sceneSpawn('account'),{[scene]:old},scene);
 assert.deepEqual(reset.pose,sceneSpawn(scene));
 const pose={...sceneSpawn(scene),x:4};
 const away=sceneTransferPose(scene,pose,reset.scenePoses,'account');
 assert.deepEqual(sceneTransferPose('account',away.pose,away.scenePoses,scene).pose,pose);
 assert.deepEqual(sceneTransferPose('account',away.pose,away.scenePoses,scene,'teaching').pose,sceneSpawn(scene,'teaching'));
 assert.deepEqual(sceneTransferPose('town',sceneSpawn('town'),away.scenePoses,scene).pose,sceneSpawn(scene));
});
