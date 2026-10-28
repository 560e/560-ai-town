import type { Point } from "../types/town.ts";
import {townPoint} from './town-scale.ts';

export interface ResidentRoute { id: string; points: Point[]; speed: number; pause: number; phase: number }
// These lanes distribute initial spawn positions only. Runtime movement uses resident-wander.ts.
const lanes:[string,Point,Point][]=[
 ["arrival",[-5,49],[-5,54]],["arrival-east",[5,49],[5,54]],
 ["square-west",[-6,-6],[-6,17]],["square-east",[6,-6],[6,17]],
 ["academy",[0,-28],[0,-17]],["civic",[-44,-25],[-44,-21]],
 ["enterprise",[-37,-10],[-37,35]],["market-west",[39,-38],[39,3]],
 ["market-east",[43,-38],[43,3]],["community-north",[41,20],[41,26]],
 ["community-south",[41,35],[41,39]],["task-west",[-8,26],[-8,39]],["task-east",[8,26],[8,39]],
];
export const residentRoutes:ResidentRoute[]=lanes.flatMap(([id,a,b],i)=>Array.from({length:i===6||i===7||i===8?4:2},(_,j)=>({id:`${id}-${j}`,points:[townPoint(a),townPoint(b)],speed:.9+(i%3)*.12,pause:2+(i%2),phase:j*9+i*2})));

export function routeLength(route: ResidentRoute): number {
  return route.points.slice(1).reduce((length,p,i)=>length+Math.hypot(p[0]-route.points[i][0],p[1]-route.points[i][1]),0);
}

export function sampleResident(route: ResidentRoute, time: number) {
  const total=routeLength(route),travel=total/route.speed,cycle=2*(travel+route.pause);
  const t=((time+route.phase)%cycle+cycle)%cycle;
  const reverse=t>=travel+route.pause;
  const local=reverse?t-travel-route.pause:t;
  const moving=local<travel;
  let distance=reverse?total-Math.min(local,travel)*route.speed:Math.min(local,travel)*route.speed;
  for(let i=1;i<route.points.length;i++) {
    const a=route.points[i-1],b=route.points[i],length=Math.hypot(b[0]-a[0],b[1]-a[1]);
    if(distance<=length || i===route.points.length-1) {
      const factor=Math.max(0,Math.min(1,distance/length));
      return {x:a[0]+(b[0]-a[0])*factor,z:a[1]+(b[1]-a[1])*factor,heading:Math.atan2(b[0]-a[0],b[1]-a[1])+(reverse?Math.PI:0),moving};
    }
    distance-=length;
  }
  return {x:route.points[0][0],z:route.points[0][1],heading:0,moving:false};
}
