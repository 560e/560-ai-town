import {walkSpawns} from './town-config.ts';
import {walkCameraLimits} from './walk-camera.ts';
import {TOWN_LAYOUT_VERSION} from './town-scale.ts';
import {loadTownReturn,parseTownReturn,type TownReturnState} from './town-return.ts';
export type TownDestination=keyof typeof walkSpawns;
export function townArrival(destination:TownDestination):TownReturnState{
 const [x,z]=walkSpawns[destination];
 return {version:1,layoutVersion:TOWN_LAYOUT_VERSION,mode:'walking',player:{x,z,yaw:Math.PI,lookYaw:0,pitch:.15,view:'third',exists:true,seat:null},zoom:{third:walkCameraLimits.third.initial,first:walkCameraLimits.first.initial},overview:null};
}
const pendingKey='560-town-pending-arrival-v1';
let pendingMemory:TownReturnState|null=null;
export function queueTownReturn(destination?:TownDestination){
 pendingMemory=destination?townArrival(destination):loadTownReturn();
 try{if(pendingMemory)sessionStorage.setItem(pendingKey,JSON.stringify(pendingMemory));else sessionStorage.removeItem(pendingKey);}catch{/* Memory fallback for same-tab navigation. */}
}
export function consumeTownReturn():TownReturnState|null{
 let result=pendingMemory;pendingMemory=null;
 try{const raw=sessionStorage.getItem(pendingKey);sessionStorage.removeItem(pendingKey);result=parseTownReturn(raw)??result;}catch{/* Fall back to the in-memory intent. */}
 return result;
}
