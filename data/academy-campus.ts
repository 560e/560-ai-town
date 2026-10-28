import type {PresenceRuntime} from './scene-presence.ts';
import type {PlayerState} from './town-runtime.ts';

export const CAMPUS_LAYOUT_VERSION=2;
export const campusBounds={minX:-42,maxX:42,minZ:-44,maxZ:44};
export const campusSpawn={x:0,z:37,yaw:Math.PI};
export type CampusStationId='guide'|'teaching'|'paths'|'mine'|'library'|'lecture'|'student'|'announcement'|'assistant'|'librarian'|'helper'|'bench-a'|'bench-b'|'bench-c'|'bench-d'|'bench-e'|'bench-f'|'exit';
export type CampusPoint={x:number;z:number};
export type CampusStation={id:CampusStationId;label:string;action:string;at:CampusPoint;arrival:CampusPoint;yaw:number;range:number};
export const campusBuildings=[
 {id:'teaching',x:0,z:-28,w:24,d:14,height:10},
 {id:'library',x:-27,z:-4,w:18,d:22,height:9},
 {id:'lecture',x:27,z:-4,w:18,d:22,height:8},
 {id:'student',x:0,z:24,w:12,d:8,height:6},
] as const;
export const campusStations:CampusStation[]=[
 {id:'guide',label:'学院引导员',action:'与学院引导员交谈',at:{x:-5,z:29},arrival:{x:-5,z:31},yaw:0,range:3},
 {id:'teaching',label:'AI 教学楼',action:'浏览课程目录',at:{x:0,z:-20},arrival:{x:0,z:-18},yaw:0,range:3.4},
 {id:'paths',label:'课程导览',action:'浏览课程目录',at:{x:-9,z:-19},arrival:{x:-9,z:-17},yaw:0,range:3},
 {id:'mine',label:'学习服务',action:'查看学习服务说明',at:{x:9,z:-19},arrival:{x:9,z:-17},yaw:0,range:3},
 {id:'library',label:'AI 图书馆',action:'了解AI图书馆',at:{x:-17,z:-4},arrival:{x:-15,z:-4},yaw:-Math.PI/2,range:3},
 {id:'lecture',label:'AI 讲堂',action:'了解AI讲堂',at:{x:17,z:-4},arrival:{x:15,z:-4},yaw:Math.PI/2,range:3},
 {id:'student',label:'学生中心',action:'查看学生服务',at:{x:0,z:30},arrival:{x:0,z:32},yaw:0,range:3},
 {id:'announcement',label:'学校公告牌',action:'查看学校公告',at:{x:-9,z:33},arrival:{x:-9,z:35},yaw:0,range:3},
 {id:'assistant',label:'教学助理',action:'与教学助理交谈',at:{x:7,z:-17},arrival:{x:7,z:-15},yaw:0,range:2.8},
 {id:'librarian',label:'图书管理员',action:'与图书管理员交谈',at:{x:-16,z:2},arrival:{x:-14,z:2},yaw:-Math.PI/2,range:2.8},
 {id:'helper',label:'学习助手',action:'与学习助手交谈',at:{x:5,z:18},arrival:{x:3,z:18},yaw:Math.PI/2,range:2.8},
 ...(['a','b','c','d','e','f'] as const).map((letter,index):CampusStation=>({id:`bench-${letter}`,label:'校园长椅',action:'坐下休息',at:{x:index<3?-11:11,z:[-9,1,11][index%3]},arrival:{x:index<3?-9:9,z:[-9,1,11][index%3]},yaw:index<3?-Math.PI/2:Math.PI/2,range:2.5})),
 {id:'exit',label:'返回小镇',action:'离开AI学院',at:{x:0,z:42},arrival:{x:0,z:40},yaw:Math.PI,range:2.5},
];
export const campusBenches=campusStations.filter(s=>s.id.startsWith('bench'));
// Decorative solids are shared by movement and the outdoor scene, including accessible reading furniture.
export const campusSceneryObstacles=[
 ...[[-25,25],[-33,32],[-33,18],[25,25],[33,32],[33,18],[-25,-38],[25,-38]].map(([x,z])=>({kind:'tree' as const,x,z,w:3.2,d:3.2,h:5.8})),
 ...[[-20,31],[20,31],[-28,16],[28,12],[-17,-38],[17,-38]].map(([x,z])=>({kind:'bed' as const,x,z,w:5,d:2.4,h:.8})),
 {kind:'table' as const,x:-16,z:10,w:3.2,d:1.8,h:1.15},
 ...[21,31].flatMap(x=>[17,27].map(z=>({kind:'column' as const,x,z,w:.6,d:.6,h:4.7}))),
];
export const campusGateColumns=[-7,7].map(x=>({x,z:40,w:1.3,d:1.3,h:5.8}));
export const campusObstacles=[...campusGateColumns,...campusBuildings.map(({x,z,w,d,height})=>({x,z,w,d,h:height})),{x:0,z:0,w:5.4,d:5.4,h:4},{x:-9,z:32.7,w:7,d:.7,h:4},...campusBenches.map(s=>({x:s.at.x,z:s.at.z,w:1.3,d:2.7,h:1.2})),...campusSceneryObstacles];
export function canStandCampus(x:number,z:number,r=.42){return Number.isFinite(x)&&Number.isFinite(z)&&x>=campusBounds.minX+r&&x<=campusBounds.maxX-r&&z>=campusBounds.minZ+r&&z<=campusBounds.maxZ-r&&!campusObstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);}
export function createCampusRuntime():PresenceRuntime{return {lastDestination:0,presenceSpawn:'entrance',talkingId:null,remoteResidents:[],player:{...campusSpawn,lookYaw:0,pitch:.16,moving:false,exists:true,walking:true,view:'third',stride:0,typing:false,seat:null}};}
export type CampusRuntime=ReturnType<typeof createCampusRuntime>;
export function moveCampus(p:PlayerState,dx:number,dz:number){if(p.seat||p.typing)return;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));for(let i=0;i<steps;i++){if(canStandCampus(p.x+dx/steps,p.z))p.x+=dx/steps;if(canStandCampus(p.x,p.z+dz/steps))p.z+=dz/steps;}}
export function nearestCampusStation(p:PlayerState):CampusStation|null{if(p.typing)return null;if(p.seat)return campusBenches[p.seat.index]||null;return campusStations.filter(s=>Math.hypot(p.x-s.at.x,p.z-s.at.z)<s.range).sort((a,b)=>Math.hypot(p.x-a.at.x,p.z-a.at.z)-Math.hypot(p.x-b.at.x,p.z-b.at.z))[0]||null;}
export function arriveCampus(p:PlayerState,id:CampusStationId){const s=campusStations.find(s=>s.id===id);if(!s||!canStandCampus(s.arrival.x,s.arrival.z))return false;p.x=s.arrival.x;p.z=s.arrival.z;p.lookYaw=s.yaw;p.yaw=s.yaw+Math.PI;p.pitch=.16;p.moving=false;p.stride=0;p.seat=null;return true;}
export function sitCampus(p:PlayerState,id:CampusStationId){const index=campusBenches.findIndex(s=>s.id===id),s=campusBenches[index];if(!s||p.typing||p.seat||Math.hypot(p.x-s.at.x,p.z-s.at.z)>=s.range)return false;p.seat={index,returnX:p.x,returnZ:p.z};p.x=s.at.x;p.z=s.at.z;p.yaw=s.yaw+Math.PI;p.moving=false;return true;}
export function standCampus(p:PlayerState){if(!p.seat)return false;const seat=p.seat,s=campusBenches[seat.index];if(!s)return false;for(const point of [{x:seat.returnX,z:seat.returnZ},s.arrival])if(canStandCampus(point.x,point.z)){p.x=point.x;p.z=point.z;p.seat=null;p.moving=false;return true;}return false;}

