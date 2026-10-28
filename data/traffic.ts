import {townPoint,townDistance} from './town-scale.ts';
import type {Point} from "../types/town.ts";
export interface VehicleType {id:string;name:string;length:number;width:number;height:number;kind:string;color:string}
export const vehicleTypes:VehicleType[]=[
 {id:"city",name:"城市小车",length:3.1,width:1.45,height:1.35,kind:"compact",color:"#f1ca36"},
 {id:"sedan",name:"轿车",length:4.1,width:1.55,height:1.3,kind:"sedan",color:"#ecf7ff"},
 {id:"suv",name:"SUV",length:4.2,width:1.6,height:1.7,kind:"suv",color:"#287bc8"},
 {id:"wagon",name:"旅行车",length:4.4,width:1.55,height:1.45,kind:"wagon",color:"#df8050"},
 {id:"pickup",name:"皮卡",length:4.7,width:1.6,height:1.6,kind:"pickup",color:"#6f9d89"},
 {id:"van",name:"厢式车",length:4.6,width:1.6,height:2,kind:"van",color:"#e1dfce"},
 {id:"taxi",name:"出租车",length:4.1,width:1.55,height:1.35,kind:"taxi",color:"#eabf20"},
 {id:"bus",name:"小巴士",length:5.8,width:1.65,height:2.4,kind:"bus",color:"#29aac2"},
 {id:"delivery",name:"配送车",length:4.6,width:1.6,height:2.25,kind:"delivery",color:"#ed9353"},
 {id:"mini",name:"微型电动车",length:2.7,width:1.35,height:1.4,kind:"mini",color:"#54bdaa"},
 {id:"sport",name:"运动轿跑",length:4.1,width:1.6,height:1.1,kind:"sport",color:"#d96568"},
 {id:"shuttle",name:"观光接驳车",length:5.2,width:1.6,height:2.05,kind:"shuttle",color:"#faf2d9"},
];
export const MAX_VEHICLES=8;
export const gates=[{id:"nw",node:0,outer:[-80,-49] as Point},{id:"ne",node:3,outer:[80,-49] as Point},{id:"sw",node:11,outer:[-80,46] as Point},{id:"se",node:14,outer:[80,46] as Point}].map(g=>({...g,outer:townPoint(g.outer)}));
export const nodes:Point[]=([[-60,-49],[-22,-49],[22,-49],[60,-49],[-60,-12.5],[-22,-12.5],[22,-12.5],[60,14.5],[22,14.5],[-22,22],[22,22],[-60,46],[-22,46],[22,46],[60,46]] as Point[]).map(townPoint);
const links=[[0,1],[1,2],[2,3],[0,4],[4,11],[1,5],[5,9],[9,12],[2,6],[6,8],[8,10],[10,13],[3,7],[7,14],[4,5],[5,6],[8,7],[9,10],[11,12],[12,13],[13,14]];
export interface PathPoint{x:number;z:number;s:number}
export interface TrafficRoute{points:PathPoint[];length:number;junctions:{key:string;start:number;end:number}[];entry:number;exit:number}
export interface Car {id:number;type:number;route:TrafficRoute;distance:number;speed:number;x:number;z:number;heading:number;opacity:number;wheel:number;reason:string}
export interface TrafficWorld {cars:Car[];clock:number;nextSpawn:number;nextId:number;desired:number;nextTarget:number;locks:Record<string,number>;spawned:number;exited:number;typesSeen:Set<number>}
export type Pedestrian={x:number;z:number};
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export function makeRoute(entry:number,exit:number,rng= Math.random):TrafficRoute{
 const weights=links.map(([a,b])=>distance(nodes[a],nodes[b])*(.65+rng()*.7));const costs=nodes.map(()=>Infinity),prev=nodes.map(()=>-1),done=new Set<number>();costs[gates[entry].node]=0;
 while(done.size<nodes.length){let u=-1;for(let i=0;i<nodes.length;i++)if(!done.has(i)&&(u<0||costs[i]<costs[u]))u=i;if(u<0)break;done.add(u);links.forEach(([a,b],i)=>{const v=a===u?b:b===u?a:-1;if(v>=0&&costs[u]+weights[i]<costs[v]){costs[v]=costs[u]+weights[i];prev[v]=u;}});}
 const ids:number[]=[];for(let n=gates[exit].node;n>=0;n=prev[n]){ids.unshift(n);if(n===gates[entry].node)break;}
 const base=[gates[entry].outer,...ids.map(n=>nodes[n]),gates[exit].outer];
 const directions=base.slice(1).map((p,i)=>{const len=distance(p,base[i]);return [(p[0]-base[i][0])/len,(p[1]-base[i][1])/len] as Point;});
 const offset=townDistance(1.13);
 const lane=base.map((p,i)=>{const a=directions[Math.max(0,i-1)],b=directions[Math.min(i,directions.length-1)],same=Math.abs(a[0]*b[1]-a[1]*b[0])<.1;return [p[0]-offset*(same?b[1]:a[1]+b[1]),p[1]+offset*(same?b[0]:a[0]+b[0])] as Point;});
 const raw:Point[]=[lane[0]];
 for(let i=1;i<lane.length-1;i++){const p=lane[i],a=lane[i-1],b=lane[i+1],cut=Math.min(2,distance(a,p)/3,distance(b,p)/3),la=distance(a,p),lb=distance(p,b);const start:Point=[p[0]+(a[0]-p[0])*cut/la,p[1]+(a[1]-p[1])*cut/la],end:Point=[p[0]+(b[0]-p[0])*cut/lb,p[1]+(b[1]-p[1])*cut/lb];raw.push(start);for(let j=1;j<=12;j++){const t=j/12;raw.push([(1-t)**2*start[0]+2*(1-t)*t*p[0]+t*t*end[0],(1-t)**2*start[1]+2*(1-t)*t*p[1]+t*t*end[1]]);}}
 raw.push(lane.at(-1)!);let s=0;const points=raw.map((p,i)=>{if(i)s+=distance(p,raw[i-1]);return {x:p[0],z:p[1],s};});
 const groups=new Map<string,{key:string;start:number;end:number}>();ids.forEach(id=>{const p=nodes[id],point=points.reduce((best,q)=>Math.hypot(q.x-p[0],q.z-p[1])<Math.hypot(best.x-p[0],best.z-p[1])?q:best),key=id===8||id===10?"east-middle":String(id);const old=groups.get(key);groups.set(key,{key,start:Math.min(old?.start??Infinity,point.s),end:Math.max(old?.end??-Infinity,point.s)});});
 return {points,length:s,junctions:[...groups.values()],entry,exit};
}
export function sampleTraffic(route:TrafficRoute,d:number){const p=route.points;d=Math.max(0,Math.min(route.length,d));let lo=0,hi=p.length-1;while(lo+1<hi){const mid=(lo+hi)>>1;if(p[mid].s<d)lo=mid;else hi=mid;}const a=p[lo],b=p[hi],t=(d-a.s)/Math.max(1e-6,b.s-a.s);return{x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t,heading:Math.atan2(b.x-a.x,b.z-a.z)};}
/** Hide the entire vehicle before its body reaches the edge of the unified base. */
export function boundaryOpacity(car:Pick<Car,"x"|"heading"|"type">){const v=vehicleTypes[car.type],half=Math.abs(Math.sin(car.heading))*v.length/2+Math.abs(Math.cos(car.heading))*v.width/2;return Math.min(1,Math.max(0,(townDistance(66)-Math.abs(car.x)-half)/5));}
export function footprint(car:Pick<Car,"x"|"z"|"heading"|"type">){const spec=vehicleTypes[car.type];return{x:car.x,z:car.z,heading:car.heading,width:spec.width,length:spec.length};}
export function overlapsCars(a:ReturnType<typeof footprint>,b:ReturnType<typeof footprint>,margin=.12){
 const axes=[[Math.sin(a.heading),Math.cos(a.heading)],[Math.cos(a.heading),-Math.sin(a.heading)],[Math.sin(b.heading),Math.cos(b.heading)],[Math.cos(b.heading),-Math.sin(b.heading)]];
 const radius=(r:typeof a,u:number[])=>Math.abs(u[0]*Math.sin(r.heading)+u[1]*Math.cos(r.heading))*r.length/2+Math.abs(u[0]*Math.cos(r.heading)-u[1]*Math.sin(r.heading))*r.width/2;
 return axes.every(u=>Math.abs((b.x-a.x)*u[0]+(b.z-a.z)*u[1])<radius(a,u)+radius(b,u)+margin);
}
export function pedestrianInCar(p:Pedestrian,c:Pick<Car,"x"|"z"|"heading"|"type">,margin=.55){const spec=vehicleTypes[c.type],dx=p.x-c.x,dz=p.z-c.z;return Math.abs(dx*Math.cos(c.heading)-dz*Math.sin(c.heading))<spec.width/2+margin&&Math.abs(dx*Math.sin(c.heading)+dz*Math.cos(c.heading))<spec.length/2+margin;}
export function createTraffic(rng=Math.random):TrafficWorld{const world:TrafficWorld={cars:[],clock:0,nextSpawn:2,nextId:0,desired:5,nextTarget:20,locks:{},spawned:0,exited:0,typesSeen:new Set()};for(let entry=0;entry<4;entry++)spawnCar(world,rng,entry,10);return world;}
function spawnCar(world:TrafficWorld,rng:()=>number,entry=Math.floor(rng()*4),start=0){if(world.cars.length>=MAX_VEHICLES)return;const exit=(entry+1+Math.floor(rng()*3))%4,route=makeRoute(entry,exit,rng),type=Math.floor(rng()*vehicleTypes.length),p=sampleTraffic(route,start);const car:Car={id:world.nextId++,type,route,distance:start,speed:start?4:0,...p,opacity:boundaryOpacity({...p,type}),wheel:0,reason:""};if(world.cars.some(c=>overlapsCars(footprint(car),footprint(c),4)))return;world.cars.push(car);world.spawned++;world.typesSeen.add(type);}
function step(world:TrafficWorld,dt:number,pedestrians:Pedestrian[],rng:()=>number){
 world.clock+=dt;if(world.clock>world.nextTarget){world.desired=4+Math.floor(rng()*3);world.nextTarget=world.clock+20;}
 if(world.clock>world.nextSpawn&&world.cars.length<world.desired){spawnCar(world,rng);world.nextSpawn=world.clock+3+rng()*5;}
 for(const [key,id]of Object.entries(world.locks)){const c=world.cars.find(c=>c.id===id),j=c?.route.junctions.find(j=>j.key===key);if(!c||!j||c.distance>j.end+8)delete world.locks[key];}
 for(const car of [...world.cars].sort((a,b)=>a.id-b.id)){
  const spec=vehicleTypes[car.type],upcoming=car.route.junctions.filter(j=>car.distance>=j.start-20&&car.distance<=j.end+8);let allowed=true;
  if(upcoming.every(j=>world.locks[j.key]===undefined||world.locks[j.key]===car.id)){upcoming.forEach(j=>world.locks[j.key]=car.id);}else allowed=false;
  let target=spec.kind==="bus"?5:6.5;car.reason="";
  const ahead=sampleTraffic(car.route,car.distance+4);if(Math.abs(Math.sin(ahead.heading-car.heading))>.12)target=3;
  if(!allowed){const blocked=upcoming.find(j=>world.locks[j.key]!==car.id)!;const available=Math.max(0,blocked.start-10-car.distance);target=Math.min(target,Math.sqrt(2*5*available));car.reason="路口让行";}
  const braking=car.speed*car.speed/10+spec.length/2+2.2;
  for(let look=0;look<=braking;look+=.5){const p=sampleTraffic(car.route,car.distance+look),probe={...car,...p};
   if(pedestrians.some(person=>pedestrianInCar(person,probe,.8))){target=0;car.reason="礼让行人";break;}
   if(world.cars.some(other=>other.id!==car.id&&overlapsCars(footprint(probe),footprint(other),.3))){target=0;car.reason="保持车距";break;}
  }
  car.speed=car.speed<target?Math.min(target,car.speed+dt*2):Math.max(target,car.speed-dt*5);
  const advance=car.speed*dt,next=sampleTraffic(car.route,car.distance+advance),candidate={...car,...next};
  if(world.cars.some(other=>other.id!==car.id&&overlapsCars(footprint(candidate),footprint(other)))||pedestrians.some(p=>pedestrianInCar(p,candidate))){car.speed=0;continue;}
  car.distance+=advance;Object.assign(car,next);car.wheel+=advance/.35;car.opacity=boundaryOpacity(car);
 }
 const before=world.cars.length;world.cars=world.cars.filter(c=>c.distance<c.route.length-.05);world.exited+=before-world.cars.length;
}
export function stepTraffic(world:TrafficWorld,dt:number,pedestrians:Pedestrian[]=[],rng=Math.random){let left=Math.min(dt,.5);while(left>1e-8){const delta=Math.min(left,1/30);step(world,delta,pedestrians,rng);left-=delta;}}
