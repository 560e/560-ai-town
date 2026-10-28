import {districtSignObstacles,districtSigns} from "./district-signs.ts";
import {entranceDesign as gate} from "./entrance-design.ts";
import {serviceEntrance} from './service-entrance.ts';
import type { Point } from "../types/town.ts";
import {townPoint,townDistance,townBounds,townDetail} from './town-scale.ts';
export interface BuildingSpec {id:string;venue:string;kind:"office"|"academy"|"civic"|"shop"|"home";position:Point;size:Point;floors:number;floorHeight:number;rotation?:number;name?:string;accent?:string}
const baseBuildings:BuildingSpec[]=[
 {id:"civic",venue:"civic-hall",kind:"civic",position:[-41,-34],size:[21,11],floors:1,floorHeight:6},
 {id:"academy-main",venue:"learning-campus",kind:"academy",position:[0,-37],size:[15,10],floors:3,floorHeight:3.5},
 ...[-1,1].map((side):BuildingSpec=>({id:`academy-wing-${side}`,venue:"learning-campus",kind:"academy",position:[side*12.5,-36],size:[8,11],floors:3,floorHeight:3.1})),
 ...[[-50,-7,5],[-31,4,4],[-50,23,4],[-31,32,3]].map(([x,z,f],i):BuildingSpec=>({id:`enterprise-${i+1}`,venue:"office-campus",kind:"office",position:[x,z],size:[8.5,11],floors:f,floorHeight:3})),
 ...[-1,1].flatMap(side=>[-39,-29,-19,-9,1].map((z,i):BuildingSpec=>({id:`shop-${side}-${i}`,venue:"creative-street",kind:"shop",position:[41+side*9.5,z],size:[6.4,7.4],floors:1,floorHeight:4.5,rotation:-side*Math.PI/2,name:(side<0?["AI工具","数字作品","咖啡 ☕","智能硬件","设计商店"]:["创作工坊","AI书屋","灵感衣橱","影像工作室","创客好物"])[i],accent:i%2?"#f49325":"#117fd4"}))),
 ...[[-9,24,4],[-9,34,3],[9,24,3],[9,34,4]].map(([x,z,f],i):BuildingSpec=>({id:`home-${i+1}`,venue:"ai-community",kind:"home",position:[41+x,z],size:[7,7.5],floors:f,floorHeight:2.65,name:`${i+1}号楼`})),
];
export interface Rect {x:number;z:number;w:number;d:number}
export const buildings:BuildingSpec[]=baseBuildings.map(b=>({...b,position:townPoint(b.position)}));
export const gardens:Rect[]=[];
export const trees:Point[]=[];
export const benches:Point[]=[];
export const lamps:Point[]=[];
for(let x=-60;x<=60;x+=6){if(Math.abs(x)>14) {trees.push([x,53]);gardens.push({x,z:53,w:4.8,d:4});} trees.push([x,-53]);}
for(let z=-44;z<=44;z+=7){if(Math.abs(z+49)<5||Math.abs(z-46)<5)continue;trees.push([-64,z],[64,z]);gardens.push({x:-64,z,w:2.8,d:4.8},{x:64,z,w:2.8,d:4.8});}
for(const x of [-16,16]) for(const z of [-25,-18,-5,4,14,28,38]){trees.push([x,z]);gardens.push({x,z,w:2,d:3.5});}
for(const x of [-9,9]) for(const z of [-25,-18]) {gardens.push({x,z,w:10,d:5});trees.push([x,z]);}
for(const [x,z] of [[-54,-23],[-28,-23],[-54,-39],[-28,-39],[-42,-23],[-36,-23]]) trees.push([x,z]);
for(const x of [-55,-25]) for(const z of [-11,1,13,25,38]){trees.push([x,z]);gardens.push({x,z,w:2,d:3});}
for(const z of [-8,3,24,36]){trees.push([-42,z]);gardens.push({x:-42,z,w:3.4,d:4});}
for(const z of [-34,-24,-14,-4,6])for(const x of [36,46]){gardens.push({x,z,w:1.6,d:2.5});trees.push([x,z]);}
for(const x of [27,55])for(const z of [-43,-33,-23,-13,-3,7,20,29,39])trees.push([x,z]);
for(const [x,z] of [[38,21],[44,21],[38,37],[44,37],[29,40],[53,40]]){trees.push([x,z]);gardens.push({x,z,w:2.4,d:2.4});}
for(const [x,z] of [[-11,-7],[11,-7],[-11,16],[11,16],[-11,34],[11,34],[-45,12],[-44,19],[38,25],[44,35],[36,7],[46,7]]) benches.push([x,z]);
for(const x of [-18.5,18.5,-56.5,56.5])for(const z of [-42,-17,10,40])lamps.push([x,z]);
export const ponds=[{x:0,z:4,r:5},{x:41,z:31,r:2.35},{x:-41,z:14,r:2.5}].map(p=>({...p,x:townDistance(p.x),z:townDistance(p.z)}));
export const hedges:Rect[]=[];
for(const [x,z,w,d] of [[-41,-18,27,1],[-41,41,29,1],[0,-44,33,1],[0,-15,32,1],[0,19,32,1],[0,42,32,1],[41,42,28,1]])for(let t=-w/2;t<w/2;t+=1.2){if(Math.abs(t)>=4)hedges.push({x:x+t,z,w:1.1,d});}
for(const x of [-56,-26,26,56])for(let z=-42;z<40;z+=3){if(z>-19&&z<-15||z>10&&z<19)continue;hedges.push({x,z,w:1,d:2.2});}
// Layout spacing grows; trees, lamps and usable bench geometry do not.
for(const points of [trees,benches,lamps])for(const p of points){p[0]=townDistance(p[0]);p[1]=townDistance(p[1]);}
for(const rect of [...gardens,...hedges]){rect.x=townDistance(rect.x);rect.z=townDistance(rect.z);rect.w=townDistance(rect.w);rect.d=townDistance(rect.d);}
export const obstacles:Rect[]=[
 {x:serviceEntrance.npc.x,z:serviceEntrance.npc.z,w:1,d:.8},
 {x:serviceEntrance.board.x,z:serviceEntrance.board.z,w:3,d:.7},
 ...hedges,
 ...buildings.filter(b=>b.kind==="shop").flatMap(b=>[-1,1].map(side=>{const a=b.rotation??0,x=side*(b.size[0]/2-.2),z=b.size[1]/2+1.9;return {x:b.position[0]+x*Math.cos(a)+z*Math.sin(a),z:b.position[1]-x*Math.sin(a)+z*Math.cos(a),w:.14,d:.14};})),
 ...buildings.map(b=>({x:b.position[0],z:b.position[1],w:b.rotation?b.size[1]:b.size[0],d:b.rotation?b.size[0]:b.size[1]})),
 ...ponds.map(p=>({x:p.x,z:p.z,w:p.r*2,d:p.r*2})),
 ...trees.map(([x,z])=>({x,z,w:.7,d:.7})),
 ...benches.map(([x,z])=>({x,z,w:2.8,d:1.2})),
 ...lamps.map(([x,z])=>({x,z,w:.6,d:.6})),
 ...districtSignObstacles,
 ...[-49,-46,-36,-33].map(x=>{const p=townDetail([x,-26.9],[-41,-34]);return {x:p[0],z:p[1],w:.85,d:.85};}),
 {x:0,z:districtSigns.task.z,w:districtSigns.task.boardWidth*districtSigns.task.scale,d:districtSigns.task.boardDepth*districtSigns.task.scale},
 ...[-1,1].map(side=>({x:side*gate.columnX,z:gate.z,w:gate.baseWidth,d:gate.baseDepth})),

];
export function canStand(x:number,z:number,r=.45){return x>townBounds.minX+r&&x<townBounds.maxX-r&&z>townBounds.minZ+r&&z<townBounds.maxZ-r&&!obstacles.some(o=>Math.abs(x-o.x)<o.w/2+r&&Math.abs(z-o.z)<o.d/2+r);}
/** Substeps prevent crossing a wall during a delayed frame; sliding resolves each axis independently. */
export function moveWalker(position:Point,dx:number,dz:number):Point{
 let [x,z]=position;const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.2));
 for(let i=0;i<steps;i++){if(canStand(x+dx/steps,z))x+=dx/steps;if(canStand(x,z+dz/steps))z+=dz/steps;}
 return [x,z];
}
