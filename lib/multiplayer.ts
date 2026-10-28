import type {TownSceneId} from './town-scenes.ts';
import type {IdentityBadge} from './identity-display.ts';
import {benches,canStand} from '../data/district-plan.ts';
import {walkSpawns} from '../data/town-config.ts';
import {townBounds} from '../data/town-scale.ts';
import {RUN_SPEED} from '../data/walking-speed.ts';
import type {CharacterAppearance} from './character.ts';
import type {PlayerSpeech} from '../data/player-speech.ts';
import type {PrivateChat} from './town-chat.ts';
import {ROOM_LIMIT} from "./rooms.ts";
export const ROOM_CAPACITY=ROOM_LIMIT,MODEL_BUDGET=30,PRESENCE_TTL_MS=8000,POLL_MS=250;
export type TownPose={x:number;z:number;yaw:number;moving:boolean;seat:number|null};
export type OnlineResident={badges?:IdentityBadge[];id:string;name:string;character:CharacterAppearance;pose:TownPose;speech?:PlayerSpeech|null};
export type PresenceSnapshot={scene:TownSceneId;room:number;count:number;capacity:number;self:TownPose;corrected:boolean;peers:OnlineResident[];chat:PrivateChat|null;serverTime:number};
export type SpawnId=keyof typeof walkSpawns;
export function spawnPose(id:SpawnId='entrance'):TownPose{const [x,z]=walkSpawns[id];return {x,z,yaw:Math.PI,moving:false,seat:null};}
export function spawnInput(value:unknown):SpawnId|undefined{
  if(value===undefined)return undefined;
  if(typeof value!=='string'||!Object.hasOwn(walkSpawns,value))throw new Error('目的地无效');return value as SpawnId;
}
export function poseInput(value:unknown):TownPose{
  if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('角色位置无效');
  const p=value as TownPose;
  if(Object.keys(p).some(key=>!['x','z','yaw','moving','seat'].includes(key))||![p.x,p.z,p.yaw].every(n=>typeof n==='number'&&Number.isFinite(n))||p.x<townBounds.minX||p.x>townBounds.maxX||p.z<townBounds.minZ||p.z>townBounds.maxZ||typeof p.moving!=='boolean'||!(p.seat===null||Number.isInteger(p.seat)&&p.seat>=0&&p.seat<benches.length))throw new Error('角色位置无效');
  return {x:p.x,z:p.z,yaw:Math.atan2(Math.sin(p.yaw),Math.cos(p.yaw)),moving:p.moving,seat:p.seat};
}
export function validPose(p:TownPose){
  if(p.seat!==null){const bench=benches[p.seat];if(!bench)return false;const [x,z]=bench;return Math.hypot(p.x-x,p.z-z)<.05&&!p.moving;}
  return canStand(p.x,p.z);
}
/** Persisted coordinates may be obstructed after a layout update; never strand a returning resident. */
export function restorePresencePose(value:unknown):TownPose{
  try{const pose=poseInput(value);if(validPose(pose))return pose;}catch{/* Invalid legacy presence resets at the public entrance. */}
  return spawnPose();
}
/** Fixed navigation destinations are an explicit action, never arbitrary coordinate teleports. */
export function acceptMovement(previous:TownPose,next:TownPose,elapsedMs:number):boolean{
  if(!validPose(next))return false;
  const distance=Math.hypot(next.x-previous.x,next.z-previous.z);
  if(previous.seat!==null&&next.seat===previous.seat)return distance<.05;
  if(previous.seat!==null&&next.seat!==null)return false;
  const sitting=previous.seat!==next.seat&&(previous.seat!==null||next.seat!==null);
  if(distance>RUN_SPEED*Math.max(0,Math.min(elapsedMs,1200))/1000+(sitting?2.8:.3))return false;
  if(sitting)return distance<=4;
  // Sample the path so a long network step cannot cross a building or pond.
  for(let d=.2;d<distance;d+=.2){const t=d/distance;if(!canStand(previous.x+(next.x-previous.x)*t,previous.z+(next.z-previous.z)*t,.25))return false;}
  return true;
}
export type VisibleCandidate={id:string;x:number;z:number;kind:'user'|'npc';priority?:boolean};
/** Previous candidates receive a distance buffer to avoid flicker near a selection boundary. */
export function visibleCharacters(candidates:VisibleCandidate[],origin:{x:number;z:number},previous:Set<string>,budget=MODEL_BUDGET-1){
  const rank=(a:VisibleCandidate)=>(a.priority?-10000:a.kind==='user'?-1000:0)+Math.hypot(a.x-origin.x,a.z-origin.z)-(previous.has(a.id)?3:0);
  return new Set([...candidates].sort((a,b)=>rank(a)-rank(b)||a.id.localeCompare(b.id)).slice(0,Math.max(0,budget)).map(a=>a.id));
}
