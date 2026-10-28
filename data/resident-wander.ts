import {canStand} from "./district-plan.ts";
import {places} from "./places.ts";
import type {DialogueArea} from "./npc-dialogue.ts";
import {townDistance} from './town-scale.ts';

export interface WanderState {bounds:[number,number,number,number];target:{x:number;z:number}|null;wait:number;speed:number;blocked:number}
interface Body {x:number;z:number}
interface Resident extends Body {heading:number;moving:boolean;clock:number;wander:WanderState}
export function createWander(area:DialogueArea,rng=Math.random):WanderState {
 const p=places.find(p=>p.type===area);
 const bounds:WanderState["bounds"]=p?[p.position[0]-p.size[0]/2+.8,p.position[0]+p.size[0]/2-.8,p.position[1]-p.size[1]/2+.8,p.position[1]+p.size[1]/2-.8]:[townDistance(-9),townDistance(9),townDistance(49),townDistance(55)];
 return {bounds,target:null,wait:rng()*3,speed:.75+rng()*.65,blocked:0};
}
export function insideWander(w:WanderState,x:number,z:number){const [left,right,back,front]=w.bounds;return x>=left&&x<=right&&z>=back&&z<=front;}
function clearWalk(a:Body,b:Body){const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z)/.2);for(let i=1;i<=steps;i++){const t=i/steps;if(!canStand(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,.58))return false;}return true;}
function chooseTarget(n:Resident,others:Body[],rng:()=>number){
 // Short, visible destinations allow spontaneous turns without a fixed loop or wall tunnelling.
 for(let attempt=0;attempt<48;attempt++){
  const angle=rng()*Math.PI*2,distance=1.8+rng()*7.2,target={x:n.x+Math.sin(angle)*distance,z:n.z+Math.cos(angle)*distance};
  if(!insideWander(n.wander,target.x,target.z)||!clearWalk(n,target))continue;
  const probe={x:n.x+Math.sin(angle)*Math.min(1.4,distance),z:n.z+Math.cos(angle)*Math.min(1.4,distance)};
  if(others.some(b=>b!==n&&(Math.hypot(probe.x-b.x,probe.z-b.z)<1.15||Math.hypot(target.x-b.x,target.z-b.z)<1.2)))continue;
  n.wander.target=target;n.wander.speed=.75+rng()*.65;return;
 }
 n.wander.wait=.4+rng()*.8;
}
export function stepResident(n:Resident,dt:number,others:Body[],rng=Math.random){
 n.clock+=dt;n.moving=false;const w=n.wander;
 if(w.wait>0){w.wait=Math.max(0,w.wait-dt);return;}
 if(!w.target){chooseTarget(n,others,rng);if(!w.target)return;}
 const dx=w.target.x-n.x,dz=w.target.z-n.z,distance=Math.hypot(dx,dz);
 if(distance<.06){w.target=null;w.wait=rng()<.7?.5+rng()*3.5:0;return;}
 const desired=Math.atan2(dx,dz),turn=Math.atan2(Math.sin(desired-n.heading),Math.cos(desired-n.heading));
 n.heading+=Math.max(-dt*3,Math.min(dt*3,turn));
 if(Math.abs(turn)>.65)return;
 const stride=Math.min(distance,w.speed*dt),x=n.x+dx/distance*stride,z=n.z+dz/distance*stride;
 const blocked=others.some(b=>b!==n&&Math.hypot(x-b.x,z-b.z)<1.05&&Math.hypot(x-b.x,z-b.z)<Math.hypot(n.x-b.x,n.z-b.z));
 if(blocked||!insideWander(w,x,z)||!canStand(x,z,.58)){
  w.blocked+=dt;if(w.blocked>.65){w.target=null;w.blocked=0;w.wait=rng()*.45;}return;
 }
 n.x=x;n.z=z;n.moving=true;w.blocked=0;
}
