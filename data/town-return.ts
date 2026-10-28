import {benches,canStand} from './district-plan.ts';
import {walkCameraLimits} from './walk-camera.ts';
import {TOWN_LAYOUT_VERSION,townBounds} from './town-scale.ts';
import type {PlayerState,TownRuntime} from './town-runtime.ts';
export interface OverviewPose{position:[number,number,number];fitDistance:number}
export interface TownReturnState{
 version:1;layoutVersion:typeof TOWN_LAYOUT_VERSION;mode:'welcome'|'overview'|'walking';
 player:Pick<PlayerState,'x'|'z'|'yaw'|'lookYaw'|'pitch'|'view'|'exists'|'seat'>;
 zoom:{third:number;first:number};overview:OverviewPose|null;
}
export function captureTownReturn(r:TownRuntime,mode:TownReturnState['mode']):TownReturnState{
 const {x,z,yaw,lookYaw,pitch,view,exists,seat}=r.player;
 return {version:1,layoutVersion:TOWN_LAYOUT_VERSION,mode,player:{x,z,yaw,lookYaw,pitch,view,exists,seat:seat?{...seat}:null},zoom:{...r.walkZoom},overview:r.overviewCamera?{position:[...r.overviewCamera.position],fitDistance:r.overviewCamera.fitDistance}:null};
}
export function parseTownReturn(raw:string|null):TownReturnState|null{
 try{
  if(!raw||raw.length>4000)return null;
  const s=JSON.parse(raw),p=s.player;
  const bounded=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
  if(s.version!==1||s.layoutVersion!==TOWN_LAYOUT_VERSION||!['welcome','overview','walking'].includes(s.mode)||!p||!['third','first'].includes(p.view)||typeof p.exists!=='boolean')return null;
  if(!bounded(p.x,townBounds.minX,townBounds.maxX)||!bounded(p.z,townBounds.minZ,townBounds.maxZ)||!bounded(p.yaw,-1e6,1e6)||!bounded(p.lookYaw,-1e6,1e6)||!bounded(p.pitch,-.65,.9))return null;
  if(p.seat){const b=benches[p.seat.index];if(!Number.isInteger(p.seat.index)||!b||p.x!==b[0]||p.z!==b[1]||!bounded(p.seat.returnX,townBounds.minX,townBounds.maxX)||!bounded(p.seat.returnZ,townBounds.minZ,townBounds.maxZ)||!canStand(p.seat.returnX,p.seat.returnZ))return null;}
  else if(!canStand(p.x,p.z))return null;
  if(!s.zoom||!bounded(s.zoom.third,walkCameraLimits.third.min,walkCameraLimits.third.max)||!bounded(s.zoom.first,walkCameraLimits.first.min,walkCameraLimits.first.max))return null;
  if(s.overview&&(!Array.isArray(s.overview.position)||s.overview.position.length!==3||!s.overview.position.every((v:unknown)=>bounded(v,-5000,5000))||!bounded(s.overview.fitDistance,1,5000)))return null;
  // Copy only scene fields; stored content can never restore permissions or held input.
  return {version:1,layoutVersion:TOWN_LAYOUT_VERSION,mode:s.mode,player:{x:p.x,z:p.z,yaw:p.yaw,lookYaw:p.lookYaw,pitch:p.pitch,view:p.view,exists:p.exists,seat:p.seat?{index:p.seat.index,returnX:p.seat.returnX,returnZ:p.seat.returnZ}:null},zoom:{third:s.zoom.third,first:s.zoom.first},overview:s.overview?{position:[s.overview.position[0],s.overview.position[1],s.overview.position[2]],fitDistance:s.overview.fitDistance}:null};
 }catch{return null;}
}
export function restoreTownReturn(r:TownRuntime,s:TownReturnState){
 Object.assign(r.player,s.player,{walking:s.mode==='walking',moving:false,typing:false,stride:0});
 r.walkZoom={...s.zoom};r.overviewCamera=s.overview;r.lastDestination=0;r.talkingId=null;r.nearestId=null;
}
const storageKey='560-town-account-return-v1';
let memory:TownReturnState|null=null;
export function saveTownReturn(s:TownReturnState){memory=s;try{sessionStorage.setItem(storageKey,JSON.stringify(s));}catch{/* Keep same-tab navigation working when browser storage is disabled. */}}
export function loadTownReturn(){try{return parseTownReturn(sessionStorage.getItem(storageKey))??memory;}catch{return memory;}}


