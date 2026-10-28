import type {PresenceRuntime} from './scene-presence.ts';
import type {PlayerState} from './town-runtime.ts';

export type HallStationId='guide'|'permission'|'honor'|'mine'|'bench-a'|'bench-b'|'exit';
export type HallPoint={x:number;z:number};
export type HallStation={id:HallStationId;label:string;action:string;at:HallPoint;arrival:HallPoint;yaw:number;range:number};
export const hallStations:HallStation[]=[
 {id:'guide',label:'接待与办理',action:'与小零交谈',at:{x:0,z:-5},arrival:{x:0,z:-3.1},yaw:0,range:3},
 {id:'permission',label:'权限称号',action:'查看权限称号',at:{x:-9,z:-4.5},arrival:{x:-9,z:-1.8},yaw:0,range:3.4},
 {id:'honor',label:'荣誉称号',action:'查看荣誉称号',at:{x:9,z:-4.5},arrival:{x:9,z:-1.8},yaw:0,range:3.4},
 {id:'mine',label:'我的办理',action:'查看身份与进度',at:{x:10,z:3},arrival:{x:10,z:5},yaw:0,range:2.8},
 {id:'bench-a',label:'休息座椅',action:'坐下休息',at:{x:-10,z:3.5},arrival:{x:-8.4,z:3.5},yaw:-Math.PI/2,range:2.2},
 {id:'bench-b',label:'休息座椅',action:'坐下休息',at:{x:-10,z:7.3},arrival:{x:-8.4,z:7.3},yaw:-Math.PI/2,range:2.2},
 {id:'exit',label:'返回小镇',action:'离开服务大厅',at:{x:0,z:10.8},arrival:{x:0,z:9},yaw:Math.PI,range:2.3},
];
export const hallObstacles=[
 {x:0,z:-6.3,w:7.4,d:2.4},
 {x:0,z:-8,w:1.1,d:.8},
 {x:-9,z:-5,w:6.4,d:1.2},{x:9,z:-5,w:6.4,d:1.2},
 {x:10,z:3,w:2.4,d:1.3},
 {x:-10,z:3.5,w:1.3,d:2.7},{x:-10,z:7.3,w:1.3,d:2.7},
 ...[-13,13].flatMap(x=>[-9,9].map(z=>({x,z,w:1.8,d:1.8}))),
];
export function canStandHall(x:number,z:number,r=.42){return Number.isFinite(x)&&Number.isFinite(z)&&Math.abs(x)<=14.5-r&&Math.abs(z)<=11.5-r&&!hallObstacles.some(b=>Math.abs(x-b.x)<b.w/2+r&&Math.abs(z-b.z)<b.d/2+r);}
export function createHallRuntime():PresenceRuntime{return {lastDestination:0,presenceSpawn:'entrance',talkingId:null,remoteResidents:[],player:{x:0,z:7,yaw:Math.PI,lookYaw:0,pitch:.16,moving:false,exists:true,walking:true,view:'third',stride:0,typing:false,seat:null}};}
export type HallRuntime=ReturnType<typeof createHallRuntime>;
export function moveHall(p:PlayerState,dx:number,dz:number){
 if(p.seat||p.typing)return;
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.18));
 for(let i=0;i<steps;i++){if(canStandHall(p.x+dx/steps,p.z))p.x+=dx/steps;if(canStandHall(p.x,p.z+dz/steps))p.z+=dz/steps;}
}
export function nearestHallStation(p:PlayerState):HallStation|null{
 if(p.typing)return null;
 if(p.seat)return hallStations.filter(s=>s.id.startsWith('bench'))[p.seat.index]||null;
 return hallStations.filter(s=>Math.hypot(p.x-s.at.x,p.z-s.at.z)<s.range).sort((a,b)=>Math.hypot(p.x-a.at.x,p.z-a.at.z)-Math.hypot(p.x-b.at.x,p.z-b.at.z))[0]||null;
}
export function arriveHall(p:PlayerState,id:HallStationId){const s=hallStations.find(s=>s.id===id);if(!s||!canStandHall(s.arrival.x,s.arrival.z))return false;p.x=s.arrival.x;p.z=s.arrival.z;p.lookYaw=s.yaw;p.yaw=s.yaw+Math.PI;p.pitch=.16;p.moving=false;p.stride=0;p.seat=null;return true;}
export function sitHall(p:PlayerState,id:HallStationId){const index=['bench-a','bench-b'].indexOf(id),s=hallStations.find(s=>s.id===id);if(index<0||!s||p.typing||p.seat||Math.hypot(p.x-s.at.x,p.z-s.at.z)>=s.range)return false;p.seat={index,returnX:p.x,returnZ:p.z};p.x=s.at.x;p.z=s.at.z;p.yaw=Math.PI/2;p.moving=false;return true;}
export function standHall(p:PlayerState){if(!p.seat)return false;const seat=p.seat,s=hallStations.find(s=>s.id===(seat.index===0?'bench-a':'bench-b'))!;for(const point of [{x:seat.returnX,z:seat.returnZ},s.arrival])if(canStandHall(point.x,point.z)){p.x=point.x;p.z=point.z;p.seat=null;p.moving=false;return true;}return false;}
