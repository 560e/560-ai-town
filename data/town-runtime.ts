import type {OnlineResident} from '../lib/multiplayer.ts';
import {createWander,insideWander,stepResident,type WanderState} from "./resident-wander.ts";
import {residentRoutes,sampleResident} from "./resident-routes.ts";
import {benches,canStand,moveWalker,obstacles} from "./district-plan.ts";
import {createTraffic,pedestrianInCar,stepTraffic,type TrafficWorld} from "./traffic.ts";
import {areaAt,npcNames,type DialogueArea} from "./npc-dialogue.ts";
import {serviceEntrance} from './service-entrance.ts';
import type {OverviewPose} from './town-return.ts';
import {walkCameraLimits} from './walk-camera.ts';
import {entranceDesign} from './entrance-design.ts';
export interface PlayerState{x:number;z:number;yaw:number;lookYaw:number;pitch:number;moving:boolean;exists:boolean;walking:boolean;view:"third"|"first";stride:number;typing:boolean;seat:{index:number;returnX:number;returnZ:number}|null}
export interface NpcState{id:string;name:string;x:number;z:number;heading:number;moving:boolean;clock:number;area:DialogueArea;wander:WanderState}
export interface TownRuntime{remoteResidents?:OnlineResident[];visibleCharacterIds?:Set<string>;player:PlayerState;npcs:NpcState[];traffic:TrafficWorld;talkingId:string|null;nearestId:string|null;lastDestination:number;walkZoom:{third:number;first:number};overviewCamera:OverviewPose|null}
export function createTownRuntime(rng=Math.random):TownRuntime{
 const npcs:NpcState[]=[];
 for(const [i,r]of residentRoutes.entries()){
  const seed=sampleResident(r,0),area=areaAt(seed.x,seed.z),wander=createWander(area,rng),p={...seed};
  const valid=()=>insideWander(wander,p.x,p.z)&&canStand(p.x,p.z,.6)&&npcs.every(n=>Math.hypot(n.x-p.x,n.z-p.z)>=1.3)&&Math.hypot(p.x,p.z-entranceDesign.z)>=1.3;
  for(let attempt=0;!valid()&&attempt<400;attempt++){
   const [left,right,back,front]=wander.bounds;
   p.x=left+rng()*(right-left);p.z=back+rng()*(front-back);
  }
  if(!valid())throw new Error(`No safe resident spawn: ${r.id}`);
  npcs.push({id:r.id,name:npcNames[i%npcNames.length],...p,moving:false,clock:0,area,wander});
 }
 return {player:{x:0,z:entranceDesign.z,yaw:Math.PI,lookYaw:0,pitch:.15,moving:false,exists:false,walking:false,view:"third",stride:0,typing:false,seat:null},npcs,traffic:createTraffic(),talkingId:null,nearestId:null,lastDestination:-1,walkZoom:{third:walkCameraLimits.third.initial,first:walkCameraLimits.first.initial},overviewCamera:null};
}
export function stepTown(runtime:TownRuntime,delta:number,animate:boolean){const dt=animate?Math.min(delta,.05):0;
 const bodies=[...runtime.npcs,...(runtime.player.exists?[runtime.player]:[])];
 runtime.npcs.forEach(npc=>{if(runtime.talkingId===npc.id){npc.moving=false;npc.heading=Math.atan2(runtime.player.x-npc.x,runtime.player.z-npc.z);}else if(animate){stepResident(npc,dt,bodies);npc.area=areaAt(npc.x,npc.z);}});
 if(animate)stepTraffic(runtime.traffic,dt,[...runtime.npcs.filter(n=>!runtime.visibleCharacterIds||runtime.visibleCharacterIds.has(n.id)),...(runtime.player.exists?[runtime.player]:[])]);
}
export function lineClear(a:{x:number;z:number},b:{x:number;z:number}){const length=Math.hypot(b.x-a.x,b.z-a.z);for(let d=.35;d<length-.35;d+=.25){const t=d/length,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(obstacles.some(o=>Math.abs(x-o.x)<o.w/2&&Math.abs(z-o.z)<o.d/2))return false;}return true;}
export function canUseService(r:TownRuntime){const p=r.player;return p.walking&&!p.typing&&!p.seat&&!r.talkingId&&nearestBench(r)===null&&Math.hypot(p.x-serviceEntrance.arrival.x,p.z-serviceEntrance.arrival.z)<serviceEntrance.radius&&lineClear(p,serviceEntrance.arrival);}
export function nearestNpc(runtime:TownRuntime){if(!runtime.player.walking||runtime.player.typing||runtime.talkingId||runtime.player.seat||nearestBench(runtime)!==null||canUseService(runtime))return null;let best:NpcState|null=null,range=3.5;for(const npc of runtime.npcs){if(runtime.visibleCharacterIds&&!runtime.visibleCharacterIds.has(npc.id))continue;const d=Math.hypot(npc.x-runtime.player.x,npc.z-runtime.player.z);if(d<range&&lineClear(runtime.player,npc)){range=d;best=npc;}}return best;}
export function movePlayer(runtime:TownRuntime,dx:number,dz:number){const player=runtime.player;if(player.seat)return;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.15));
 const valid=(x:number,z:number)=>canStand(x,z)&&!runtime.npcs.some(n=>(!runtime.visibleCharacterIds||runtime.visibleCharacterIds.has(n.id))&&Math.hypot(x-n.x,z-n.z)<.78)&&!runtime.traffic.cars.some(c=>pedestrianInCar({x,z},c,.65));
 for(let i=0;i<steps;i++){const [x,z]=moveWalker([player.x,player.z],dx/steps,dz/steps);if(valid(x,player.z))player.x=x;if(valid(player.x,z))player.z=z;}
}

export type BenchPrompt={index:number;seated:boolean};
/** Ignore only the selected seat itself; other furniture still blocks interaction. */
function benchPathClear(a:{x:number;z:number},b:{x:number;z:number},index:number){
 const [bx,bz]=benches[index],length=Math.hypot(b.x-a.x,b.z-a.z);
 for(let d=0;d<=length;d+=.15){const t=length?d/length:0,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
  if(obstacles.some(o=>!(o.x===bx&&o.z===bz&&o.w===2.8&&o.d===1.2)&&Math.abs(x-o.x)<o.w/2+.25&&Math.abs(z-o.z)<o.d/2+.25))return false;
 }return true;
}
export function nearestBench(r:TownRuntime):number|null{
 if(!r.player.walking||r.player.typing||r.talkingId||r.player.seat)return null;
 let result:number|null=null,range=2.5;
 benches.forEach(([x,z],index)=>{const d=Math.hypot(r.player.x-x,r.player.z-z);if(d<range&&benchPathClear(r.player,{x,z},index)){range=d;result=index;}});
 return result;
}
export function sitOnBench(r:TownRuntime,index:number){
 if(nearestBench(r)!==index)return false;
 const p=r.player,[x,z]=benches[index];
 if(r.npcs.some(n=>(!r.visibleCharacterIds||r.visibleCharacterIds.has(n.id))&&Math.hypot(n.x-x,n.z-z)<.9))return false;
 p.seat={index,returnX:p.x,returnZ:p.z};p.x=x;p.z=z;p.yaw=0;p.moving=false;return true;
}
export function standFromBench(r:TownRuntime){
 const p=r.player,seat=p.seat;if(!seat||p.typing||r.talkingId)return false;
 const [x,z]=benches[seat.index];
 const candidates=[[seat.returnX,seat.returnZ],[x,z+1.35],[x-1,z+1.4],[x+1,z+1.4],[x-2,z],[x+2,z],[x,z-1.4]];
 for(const [tx,tz]of candidates){
  if(!canStand(tx,tz)||!benchPathClear(p,{x:tx,z:tz},seat.index)||r.npcs.some(n=>(!r.visibleCharacterIds||r.visibleCharacterIds.has(n.id))&&Math.hypot(n.x-tx,n.z-tz)<.9)||r.traffic.cars.some(c=>pedestrianInCar({x:tx,z:tz},c,.65)))continue;
  p.x=tx;p.z=tz;p.seat=null;p.moving=false;return true;
 }return false;
}
