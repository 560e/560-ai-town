import test from "node:test";
import {entranceDesign as gate} from "../data/entrance-design.ts";
import assert from "node:assert/strict";
import {places} from "../data/places.ts";
import {roads,entrance,walkSpawns,townConfig} from "../data/town-config.ts";
import {buildings,canStand,moveWalker,obstacles} from "../data/district-plan.ts";
import {createBuilding} from "../data/skins/diorama-models.ts";
import {coastalDiorama} from "../data/skins/coastal-diorama.ts";
import {districtSigns,districtSignObstacles} from "../data/district-signs.ts";
import {townPoint,townDistance,townBounds} from "../data/town-scale.ts";
const overlaps=(a:{position:number[];size:number[]},b:{position:number[];size:number[]})=>Math.abs(a.position[0]-b.position[0])<(a.size[0]+b.size[0])/2&&Math.abs(a.position[1]-b.position[1])<(a.size[1]+b.size[1])/2;
test("resized district gateways block their new posts while preserving walk-through openings",()=>{
 for(const post of districtSignObstacles){assert.ok(!canStand(post.x,post.z),"new post must block walking");}
 for(const sign of [districtSigns.academy,districtSigns.office,districtSigns.retail,districtSigns.community,districtSigns.plaza]){
  for(let z=sign.z-1;z<=sign.z+1;z+=.2)assert.ok(canStand(sign.x,z),`${sign.text} central opening blocked`);
  assert.ok(sign.postX*2-sign.baseWidth>8,`${sign.text} passage too narrow`);
 }
});
test("seven districts preserve identities, names and the reference layout without overlapping",()=>{
 assert.equal(places.length,7);assert.equal(new Set(places.map(p=>p.id)).size,7);
 for(const [i,p]of places.entries()){assert.ok(p.public);for(const q of places.slice(i+1))assert.ok(!overlaps(p,q),p.id+" overlaps "+q.id);for(const sx of [-1,1])for(const sz of [-1,1]){assert.ok(Math.abs(p.position[0]+sx*p.size[0]/2)<townDistance(64));assert.ok(Math.abs(p.position[1]+sz*p.size[1]/2)<townDistance(54));}}
 assert.equal(places.find(p=>p.type==="community")?.name,"五六零AI社区");assert.equal(places.find(p=>p.type==="office")?.name,"五六零AI创业园");assert.equal(entrance.name,townConfig.name);
 for(const p of [...places,entrance])assert.ok(roads.some(r=>overlaps({...p,size:p.size.map(v=>v+4)},r)),p.id+" disconnected sidewalk");
});
test("detailed building geometry fits its district, height budget and keeps distinct building IDs",()=>{
 assert.equal(new Set(buildings.map(b=>b.id)).size,buildings.length);assert.equal(buildings.filter(b=>b.kind==="shop").length,10);assert.equal(buildings.filter(b=>b.kind==="home").length,4);
 for(const b of buildings){const p=places.find(p=>p.id===b.venue)!;for(const box of createBuilding(b,coastalDiorama)){const [x,y,z]=box.position,[w,h,d]=box.size;const a=b.rotation??0;const worldX=b.position[0]+x*Math.cos(a)+z*Math.sin(a),worldZ=b.position[1]-x*Math.sin(a)+z*Math.cos(a);const halfX=Math.abs(Math.cos(a))*w/2+Math.abs(Math.sin(a))*d/2,halfZ=Math.abs(Math.sin(a))*w/2+Math.abs(Math.cos(a))*d/2;
 assert.ok(Math.abs(worldX-p.position[0])+halfX<=p.size[0]/2+.001,`${b.id} width overflow`);assert.ok(Math.abs(worldZ-p.position[1])+halfZ<=p.size[1]/2+.001,`${b.id} depth overflow`);assert.ok(y+h/2+1.05<=p.heightLimit,`${b.id} height overflow`);}}
});
test("walking cannot tunnel through buildings, ponds or boundaries, and can slide along walls",()=>{
 assert.ok(canStand(0,gate.z),"main entrance remains open");
 for(const side of [-1,1]){assert.ok(!canStand(side*gate.columnX,gate.z),"entrance pier blocks walking");assert.ok(!canStand(side*(gate.columnX+gate.baseWidth/2-.1),gate.z),"pier base blocks walking");}
 assert.ok(!canStand(...townPoint([0,4])));assert.ok(!canStand(...townPoint([-50,-7])));assert.ok(!canStand(townBounds.maxX+1,0));assert.ok(!canStand(0,townBounds.maxZ+1));
 const stopped=moveWalker(walkSpawns.entrance,0,-townDistance(60));assert.ok(stopped[1]>districtSigns.task.z);assert.ok(canStand(...stopped));
 const edge=moveWalker(walkSpawns.entrance,townDistance(150),0);assert.ok(edge[0]<gate.columnX-gate.baseWidth/2);assert.ok(canStand(...edge));
 const office=buildings.find(b=>b.id==='enterprise-1')!;
 const slide=moveWalker([office.position[0]-5,office.position[1]],8,3);assert.ok(slide[1]>office.position[1]+2);assert.ok(slide[0]<office.position[0]-office.size[0]/2);assert.ok(canStand(...slide));
});
test("all seven public districts and walking start points are reachable from the entrance",()=>{
 const targets=[...Object.values(walkSpawns),townPoint([-41,-23]),townPoint([-6,5]),townPoint([8,35])];
 for(const p of targets)assert.ok(canStand(p[0],p[1]),`blocked spawn ${p}`);
 const queue:[number,number][]=[[...walkSpawns.entrance]],visited=new Set([walkSpawns.entrance.join(',')]);let head=0;
 while(head<queue.length){const [x,z]=queue[head++];for(const [dx,dz]of [[.5,0],[-.5,0],[0,.5],[0,-.5]]){const nx=x+dx,nz=z+dz,key=`${nx},${nz}`;if(!visited.has(key)&&canStand(nx,nz)&&canStand(x+dx/2,z+dz/2)){visited.add(key);queue.push([nx,nz]);}}}
 // Non-grid arrivals must connect to a reachable grid point without crossing an obstacle.
 for(const [x,z]of targets){const near=queue.filter(([gx,gz])=>Math.hypot(gx-x,gz-z)<=Math.SQRT1_2);assert.ok(near.some(p=>{const end=moveWalker(p,x-p[0],z-p[1]);return Math.hypot(end[0]-x,end[1]-z)<1e-6;}),`unreachable area ${x},${z}`);}
 assert.ok(obstacles.length>buildings.length);
});
