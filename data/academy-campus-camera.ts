import {campusObstacles} from './academy-campus.ts';

export type CampusOrbit={yaw:number;elevation:number;distance:number};
type Point3={x:number;y:number;z:number};
type CameraObstacle={x:number;z:number;w:number;d:number;h:number};
export const campusCameraStorageKey='campus-camera-v2';
export const campusCameraLimits={min:5,max:48,minElevation:.16,maxElevation:1.05};
export const defaultCampusOrbit:CampusOrbit={yaw:0,elevation:.5,distance:18};
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function zoomCampusCamera(distance:number,delta:number){
 return clamp(distance*Math.exp(clamp(delta,-500,500)*.0015),campusCameraLimits.min,campusCameraLimits.max);
}
export function parseCampusOrbit(raw:string|null):CampusOrbit{
 try{
  const v=JSON.parse(raw||'null');
  if(!v||!['yaw','elevation','distance'].every(k=>typeof v[k]==='number'&&Number.isFinite(v[k])))return {...defaultCampusOrbit};
  return {yaw:Math.atan2(Math.sin(v.yaw),Math.cos(v.yaw)),elevation:clamp(v.elevation,campusCameraLimits.minElevation,campusCameraLimits.maxElevation),distance:clamp(v.distance,campusCameraLimits.min,campusCameraLimits.max)};
 }catch{return {...defaultCampusOrbit};}
}
function hitBox(origin:Point3,ray:Point3,low:Point3,high:Point3){
 let enter=0,leave=1;
 for(const axis of ['x','y','z'] as const){
  if(Math.abs(ray[axis])<1e-8){if(origin[axis]<low[axis]||origin[axis]>high[axis])return null;continue;}
  const a=(low[axis]-origin[axis])/ray[axis],b=(high[axis]-origin[axis])/ray[axis];
  enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));if(enter>leave)return null;
 }
 // A seated resident may be within the bench footprint; ignore a box containing the focus.
 return enter>0&&enter<=1?enter:null;
}
export function resolveCampusCamera(player:{x:number;z:number;seated?:boolean},orbit:CampusOrbit,obstacles:readonly CameraObstacle[]=campusObstacles){
 const target={x:player.x,y:player.seated?1.45:1.85,z:player.z};
 const elevation=clamp(orbit.elevation,campusCameraLimits.minElevation,campusCameraLimits.maxElevation),distance=clamp(orbit.distance,campusCameraLimits.min,campusCameraLimits.max);
 const ray={x:Math.sin(orbit.yaw)*distance*Math.cos(elevation),y:distance*Math.sin(elevation),z:Math.cos(orbit.yaw)*distance*Math.cos(elevation)};
 const low={x:-55,y:.5,z:-55},high={x:55,y:55,z:55},margin=.38;
 let fraction=1;
 for(const axis of ['x','y','z'] as const){if(ray[axis]>0)fraction=Math.min(fraction,(high[axis]-target[axis])/ray[axis]);else if(ray[axis]<0)fraction=Math.min(fraction,(low[axis]-target[axis])/ray[axis]);}
 for(const b of obstacles){
  const hit=hitBox(target,ray,{x:b.x-b.w/2-margin,y:0,z:b.z-b.d/2-margin},{x:b.x+b.w/2+margin,y:b.h+margin,z:b.z+b.d/2+margin});
  if(hit!==null)fraction=Math.min(fraction,hit);
 }
 fraction=Math.max(0,fraction);
 return {target,position:{x:target.x+ray.x*fraction,y:target.y+ray.y*fraction,z:target.z+ray.z*fraction},distance:distance*fraction};
}
