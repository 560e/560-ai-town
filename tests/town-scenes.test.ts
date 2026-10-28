import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneInput,sceneForPath,sceneSpawn,scenePoseInput,acceptSceneMovement,sceneLineClear,sceneNavigationPose,sceneTransferPose,spatialScene} from '../lib/town-scenes.ts';
test('scene registry isolates stable route identities',()=>{
 assert.equal(sceneInput(undefined),'town');assert.throws(()=>sceneInput('constructor'));
 assert.equal(sceneForPath('/service'),'service');assert.equal(sceneForPath('/service/resources/one'),'account');
 assert.equal(sceneForPath('/districts/learning-campus'),'learning-campus');assert.equal(sceneForPath('/account'),'account');
 assert.equal(sceneForPath('/private-management'),'account');
});
test('hall coordinates seats and fixed spawns are scene scoped',()=>{
 const p=sceneSpawn('service');assert.equal(p.z,7);
 assert.throws(()=>sceneSpawn('service','academy'));assert.throws(()=>sceneSpawn('town','guide'));
 for(const spawn of ['guide','permission','honor','mine','bench-a','bench-b','exit'])assert.ok(acceptSceneMovement(sceneSpawn('service',spawn),sceneSpawn('service',spawn),250,'service'));
 assert.throws(()=>scenePoseInput({...p,x:80},'service'));
 assert.ok(acceptSceneMovement(p,{...p,x:1},250,'service'));
 assert.equal(acceptSceneMovement(p,{...p,x:10},250,'service'),false);
 assert.equal(sceneLineClear('service',{x:-5,z:-6},{x:5,z:-6}),false);
 const seat={...p,x:-10,z:3.5,seat:0};assert.ok(acceptSceneMovement(sceneSpawn('service','bench-a'),seat,250,'service'));
 assert.equal(acceptSceneMovement(seat,{...seat,seat:1},250,'service'),false);
});
test('private and introduction pages cannot move or chat',()=>{
 const p=sceneSpawn('account');assert.ok(acceptSceneMovement(p,p,250,'account'));
 assert.throws(()=>scenePoseInput({...p,x:1},'account'));
 assert.equal(sceneLineClear('account',p,p),false);
});
test('hall bench navigation accepts only the exact requested bench seated pose',()=>{
 const seat={x:-10,z:3.5,yaw:Math.PI/2,moving:false,seat:0};
 assert.deepEqual(sceneNavigationPose('service','bench-a',seat),seat);
 assert.deepEqual(sceneNavigationPose('service','bench-b',seat),sceneSpawn('service','bench-b'));
 assert.deepEqual(sceneNavigationPose('service','guide',seat),sceneSpawn('service','guide'));
 assert.deepEqual(sceneNavigationPose('service','bench-a',{...seat,x:0}),sceneSpawn('service','bench-a'));
 assert.deepEqual(sceneNavigationPose('service','bench-a',{...seat,moving:true}),sceneSpawn('service','bench-a'));
 assert.throws(()=>sceneNavigationPose('service','forged',seat));
});
test('server scene history restores exact validated position and explicit portals override it',()=>{
 const original={...sceneSpawn('town'),x:1,yaw:.4,moving:true};
 const away=sceneTransferPose('town',original,{},'account');
 const back=sceneTransferPose('account',away.pose,away.scenePoses,'town');
 assert.deepEqual(back.pose,{...original,moving:false});
 assert.deepEqual(sceneTransferPose('account',away.pose,away.scenePoses,'town','service').pose,sceneSpawn('town','service'));
 assert.deepEqual(sceneTransferPose('account',away.pose,{town:{...original,x:999}},'town').pose,sceneSpawn('town'));
 assert.deepEqual(sceneTransferPose('account',away.pose,null,'service').pose,sceneSpawn('service'));
});
test('academy is an outdoor campus with its own safe seats, spawns and saved history',()=>{
 assert.equal(spatialScene('learning-campus'),true);
 assert.equal(sceneForPath('/academy?view=catalog'),'account');
 const scene='learning-campus',entrance=sceneSpawn(scene);
 assert.equal(entrance.z,37);
 assert.ok(acceptSceneMovement(entrance,{...entrance,x:1},250,scene));
 assert.throws(()=>scenePoseInput({...entrance,x:80},scene));
 assert.throws(()=>sceneSpawn(scene,'academy'));
 assert.equal(sceneLineClear(scene,{x:-15,z:-28},{x:15,z:-28}),false);
 const seated={x:-11,z:-9,yaw:Math.PI/2,moving:false,seat:0};
 assert.deepEqual(sceneNavigationPose(scene,'bench-a',seated),seated);
 const admitted=sceneTransferPose('town',sceneSpawn('town'),{},scene);
 const away=sceneTransferPose(scene,seated,admitted.scenePoses,'account');
 assert.deepEqual(sceneTransferPose('account',away.pose,away.scenePoses,scene).pose,seated);
});
