import {walkSpawns} from './town-config.ts';
import {districtSigns} from './district-signs.ts';
import {lineClear,type TownRuntime} from './town-runtime.ts';
export const districtEntries=[
 {id:'civic-hall',name:'AI服务中心',destination:'service',arrival:walkSpawns.service,href:'/service'},
 {id:'learning-campus',name:'AI学院',destination:'academy',arrival:walkSpawns.academy,href:'/districts/learning-campus'},
 {id:'office-campus',name:'AI创业园',destination:'office',arrival:walkSpawns.office,href:'/districts/office-campus'},
 {id:'creative-street',name:'AI商业街',destination:'retail',arrival:walkSpawns.retail,href:'/districts/creative-street'},
 {id:'ai-community',name:'AI社区',destination:'community',arrival:walkSpawns.community,href:'/districts/ai-community'},
 {id:'town-square',name:'五六零AI广场',destination:'plaza',arrival:[districtSigns.plaza.x,districtSigns.plaza.z],href:'/districts/town-square'},
 {id:'task-square',name:'任务广场',destination:'tasks',arrival:walkSpawns.tasks,href:'/districts/task-square'},
] as const;
export type DistrictEntry=typeof districtEntries[number];
export type DistrictEntryId=DistrictEntry['id'];
export function districtEntry(id:string){return districtEntries.find(entry=>entry.id===id);}
export function returnDestination(value:unknown){return typeof value==='string'?districtEntries.find(entry=>entry.destination===value)?.destination??null:null;}
export function nearbyDistrict(r:TownRuntime):DistrictEntry|null{
 const p=r.player;if(!p.walking||p.typing||p.seat||r.talkingId)return null;
 let nearest:DistrictEntry|null=null,distance=4.5;
 for(const entry of districtEntries){const [x,z]=entry.arrival,d=Math.hypot(p.x-x,p.z-z);if(d<distance&&lineClear(p,{x,z})){nearest=entry;distance=d;}}
 return nearest;
}



/** Scene navigation is reserved for implemented spatial environments. */
export function districtPresentation(id:string):'scene'|'panel'|null{
 if(!districtEntry(id))return null;
 return id==='civic-hall'||id==='learning-campus'?'scene':'panel';
}
export function districtPanelIntent(value:unknown):DistrictEntryId|null{
 return typeof value==='string'&&districtPresentation(value)==='panel'?value as DistrictEntryId:null;
}
