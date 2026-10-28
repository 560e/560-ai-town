import {hallObstacles} from './service-hall.ts';

// Interior shell dimensions; the camera and its near plane stay inside this envelope.
export const hallInterior={halfWidth:14.6,halfDepth:11.6,ceiling:7.4};
export const hallCameraLimits={min:2.8,max:8.5};
export function zoomHallCamera(distance:number,delta:number){
 return Math.max(hallCameraLimits.min,Math.min(hallCameraLimits.max,distance*Math.exp(Math.max(-500,Math.min(500,delta))*.0015)));
}
export function initialHallCameraDistance(aspect:number){
 return aspect<.85?4.6:5.8;
}

type Point3={x:number;y:number;z:number};
type Orbit={yaw:number;elevation:number;distance:number};
const margin=.38;
function hitBox(origin:Point3,ray:Point3,low:Point3,high:Point3){
 let enter=0,leave=1;
 for(const axis of ['x','y','z'] as const){
  if(Math.abs(ray[axis])<1e-8){if(origin[axis]<low[axis]||origin[axis]>high[axis])return null;continue;}
  const a=(low[axis]-origin[axis])/ray[axis],b=(high[axis]-origin[axis])/ray[axis];
  enter=Math.max(enter,Math.min(a,b));leave=Math.min(leave,Math.max(a,b));if(enter>leave)return null;
 }
 // The seated resident is inside the bench footprint; do not pin the camera to its focus.
 return enter>0&&enter<=1?enter:null;
}
export function resolveHallCamera(player:{x:number;z:number;seated?:boolean},orbit:Orbit){
 const target={x:player.x,y:player.seated?1.45:1.85,z:player.z};
 const ray={x:Math.sin(orbit.yaw)*orbit.distance*Math.cos(orbit.elevation),y:orbit.distance*Math.sin(orbit.elevation),z:Math.cos(orbit.yaw)*orbit.distance*Math.cos(orbit.elevation)};
 const low={x:-hallInterior.halfWidth+margin,y:.4,z:-hallInterior.halfDepth+margin},high={x:hallInterior.halfWidth-margin,y:hallInterior.ceiling-margin,z:hallInterior.halfDepth-margin};
 let fraction=1;
 for(const axis of ['x','y','z'] as const){if(ray[axis]>0)fraction=Math.min(fraction,(high[axis]-target[axis])/ray[axis]);else if(ray[axis]<0)fraction=Math.min(fraction,(low[axis]-target[axis])/ray[axis]);}
 for(const b of hallObstacles){
  const height=b.z===-5?5.3:b.x===0&&b.z===-6.3?2.45:b.x===-10?1.65:3.3;
  const hit=hitBox(target,ray,{x:b.x-b.w/2-margin,y:0,z:b.z-b.d/2-margin},{x:b.x+b.w/2+margin,y:height+margin,z:b.z+b.d/2+margin});
  if(hit!==null)fraction=Math.min(fraction,hit);
 }
 fraction=Math.max(0,fraction);
 return {target,position:{x:target.x+ray.x*fraction,y:target.y+ray.y*fraction,z:target.z+ray.z*fraction},distance:orbit.distance*fraction};
}

