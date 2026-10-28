import {districtIntroductions,type IntroDistrictId} from '../data/district-introductions.ts';
import {canStandHall,hallStations,hallObstacles} from '../data/service-hall.ts';
import {CAMPUS_LAYOUT_VERSION,campusBounds,campusSpawn,campusStations,campusBenches,campusObstacles,canStandCampus} from '../data/academy-campus.ts';
import {lineClear} from '../data/town-runtime.ts';
import {RUN_SPEED} from '../data/walking-speed.ts';
import {acceptMovement,poseInput,spawnInput,spawnPose,type TownPose} from './multiplayer.ts';
export type TownSceneId='town'|'service'|'account'|IntroDistrictId;
export function sceneInput(value:unknown):TownSceneId{
 if(value===undefined)return 'town';
 if(value==='town'||value==='service'||value==='account'||typeof value==='string'&&Object.hasOwn(districtIntroductions,value))return value as TownSceneId;
 throw new Error('场景无效');
}
export function sceneForPath(path:string):TownSceneId{
 const pathname=path.split(/[?#]/)[0].replace(/\/$/,'')||'/';
 if(pathname==='/')return 'town';if(pathname==='/service')return 'service';
 const district=pathname.match(/^\/districts\/([^/]+)$/)?.[1];
 return district&&Object.hasOwn(districtIntroductions,district)?district as IntroDistrictId:'account';
}
export function spatialScene(scene:TownSceneId){return scene==='town'||scene==='service'||scene==='learning-campus';}
export function sceneSpawn(scene:TownSceneId,spawn?:string):TownPose{
 if(scene==='town')return spawnPose(spawnInput(spawn));
 if(scene==='learning-campus'){
  if(spawn===undefined||spawn==='entrance')return {...campusSpawn,moving:false,seat:null};
  const station=campusStations.find(s=>s.id===spawn);if(!station)throw new Error('目的地无效');
  return {...station.arrival,yaw:Math.atan2(Math.sin(station.yaw+Math.PI),Math.cos(station.yaw+Math.PI)),moving:false,seat:null};
 }
 if(scene==='service'){
  if(spawn===undefined||spawn==='entrance')return {x:0,z:7,yaw:Math.PI,moving:false,seat:null};
  const station=hallStations.find(s=>s.id===spawn);if(!station)throw new Error('目的地无效');
  return {...station.arrival,yaw:Math.atan2(Math.sin(station.yaw+Math.PI),Math.cos(station.yaw+Math.PI)),moving:false,seat:null};
 }
 if(spawn!==undefined&&spawn!=='entrance')throw new Error('目的地无效');
 return {x:0,z:0,yaw:0,moving:false,seat:null};
}
export function scenePoseInput(value:unknown,scene:TownSceneId):TownPose{
 if(scene==='town')return poseInput(value);
 const p=poseInput(value);
 if(scene==='learning-campus'){
  if(p.x<campusBounds.minX||p.x>campusBounds.maxX||p.z<campusBounds.minZ||p.z>campusBounds.maxZ||p.seat!==null&&p.seat>=campusBenches.length)throw new Error('角色位置无效');
 }else if(scene==='service'){
  if(Math.abs(p.x)>14.5||Math.abs(p.z)>11.5||p.seat!==null&&p.seat>1)throw new Error('角色位置无效');
 }else if(p.x!==0||p.z!==0||p.yaw!==0||p.moving||p.seat!==null)throw new Error('此页面不支持角色移动');
 return p;
}
export function acceptSceneMovement(previous:TownPose,next:TownPose,elapsedMs:number,scene:TownSceneId):boolean{
 if(scene==='town')return acceptMovement(previous,next,elapsedMs);
 if(!spatialScene(scene))return next.x===0&&next.z===0&&next.yaw===0&&!next.moving&&next.seat===null;
 const canStand=scene==='learning-campus'?canStandCampus:canStandHall;
 const seats=scene==='learning-campus'?campusBenches:hallStations.filter(s=>s.id.startsWith('bench'));
 if(next.seat!==null){const seat=seats[next.seat];if(!seat||Math.hypot(next.x-seat.at.x,next.z-seat.at.z)>=.05||next.moving)return false;}
 else if(!canStand(next.x,next.z))return false;
 const distance=Math.hypot(next.x-previous.x,next.z-previous.z);
 if(previous.seat!==null&&next.seat===previous.seat)return distance<.05;
 if(previous.seat!==null&&next.seat!==null)return false;
 const sitting=previous.seat!==next.seat&&(previous.seat!==null||next.seat!==null);
 if(distance>RUN_SPEED*Math.max(0,Math.min(elapsedMs,1200))/1000+(sitting?2.8:.3))return false;
 if(sitting)return distance<=4;
 for(let d=.2;d<distance;d+=.2){const t=d/distance;if(!canStand(previous.x+(next.x-previous.x)*t,previous.z+(next.z-previous.z)*t,.25))return false;}
 return true;
}
export function currentCampusHistory(saved:unknown){return !!saved&&typeof saved==='object'&&!Array.isArray(saved)&&(saved as Record<string,unknown>).__academyLayout===CAMPUS_LAYOUT_VERSION;}
export function restoreScenePose(value:unknown,scene:TownSceneId,saved?:unknown):TownPose{
 if(scene==='learning-campus'&&!currentCampusHistory(saved))return sceneSpawn(scene);
 try{const p=scenePoseInput(value,scene);if(acceptSceneMovement(p,p,0,scene))return p;}catch{/* Layout changes reset at this scene's entrance. */}
 return sceneSpawn(scene);
}
/** A hall bench destination combines arrival and sitting in one UI action. */
export function sceneNavigationPose(scene:TownSceneId,spawn:string,next:TownPose):TownPose{
 const arrival=sceneSpawn(scene,spawn),seats=scene==='learning-campus'?campusBenches:hallStations.filter(s=>s.id.startsWith('bench')),index=seats.findIndex(s=>s.id===spawn),seat=index<0?null:index;
 if((scene==='service'||scene==='learning-campus')&&seat!==null&&next.seat===seat&&acceptSceneMovement(arrival,next,0,scene))return next;
 return arrival;
}
/** History is server-owned. Revalidate saved coordinates against today's scene geometry. */
export function sceneTransferPose(previousScene:TownSceneId,previousPose:unknown,saved:unknown,nextScene:TownSceneId,spawn?:string){
 const scenePoses:Partial<Record<TownSceneId,TownPose>>&{__academyLayout:number}={__academyLayout:CAMPUS_LAYOUT_VERSION};
 if(saved&&typeof saved==='object'&&!Array.isArray(saved)){
  for(const scene of ['town','service','learning-campus'] as const)if(Object.hasOwn(saved,scene))scenePoses[scene]={...restoreScenePose((saved as Record<string,unknown>)[scene],scene,saved),moving:false};
 }
 if(spatialScene(previousScene))scenePoses[previousScene]={...restoreScenePose(previousPose,previousScene,saved),moving:false};
 const pose=spawn!==undefined?sceneSpawn(nextScene,spawn):previousScene==='town'&&nextScene==='learning-campus'?sceneSpawn(nextScene):restoreScenePose(scenePoses[nextScene],nextScene,scenePoses);
 return {pose,scenePoses};
}
export function sceneLineClear(scene:TownSceneId,a:{x:number;z:number},b:{x:number;z:number}):boolean{
 if(scene==='town')return lineClear(a,b);if(scene!=='service'&&scene!=='learning-campus')return false;
 const length=Math.hypot(b.x-a.x,b.z-a.z);
 const obstacles=scene==='learning-campus'?campusObstacles:hallObstacles;
 for(let d=.35;d<length-.35;d+=.25){const t=d/length,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(obstacles.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2))return false;}
 return true;
}
