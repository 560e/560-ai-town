import {townDistance as S} from '@/data/town-scale';
import { useMemo } from "react";
import { buildings } from "@/data/district-plan";
import { places } from "@/data/places";
import { townConfig } from "@/data/town-config";
import { activeSkin } from "@/data/skins";
import BoxBatch,{type BoxSpec} from "./BoxBatch";
import { Block,Slab } from "./primitives";
import TownEntrance from "./TownEntrance";
import type {MeshStandardMaterial} from "three";
// Fade only the distant display floor, retaining opaque ground and shadows around the town.
const fadeFloor:MeshStandardMaterial["onBeforeCompile"]=(shader)=>{
 shader.vertexShader=shader.vertexShader.replace("#include <common>","#include <common>\nvarying vec2 townFloorPosition;").replace("#include <begin_vertex>","#include <begin_vertex>\ntownFloorPosition=(modelMatrix*vec4(position,1.0)).xz;");
 shader.fragmentShader=shader.fragmentShader.replace("#include <common>","#include <common>\nvarying vec2 townFloorPosition;").replace("#include <alphatest_fragment>",`diffuseColor.a *= 1.0-smoothstep(96.0,180.0,length(townFloorPosition / vec2(${S(1.1)},${S(1)})));\nif(diffuseColor.a<0.001)discard;\n#include <alphatest_fragment>`);
};
export default function TownGround({walking}:{walking:boolean}){
 const p=activeSkin.palette;
 const boxes=useMemo(()=>{const b:BoxSpec[]=[];const add=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>b.push({position:[x,y,z],size:[w,h,d],color});
 const layout=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>add(S(x),y,S(z),S(w),h,S(d),color);
 for(let x=-63;x<=63;x+=3){for(const z of [-55,55]){if(z>0&&Math.abs(x)<12)continue;layout(x,2,z,.45,3.1,.55,p.wall);layout(x+1.4,1.8,z,2.4,2.4,.35,p.roof);for(let k=0;k<5;k++)layout(x+.45+k*.42,1.85,z+.2,.08,2.3,.08,p.glass);}}
 for(let z=-52;z<=52;z+=3){for(const x of [-65,65]){if(Math.abs(z+49)<5||Math.abs(z-46)<5)continue;layout(x,2,z,.55,3.1,.45,p.wall);layout(x,1.8,z+1.4,.35,2.4,2.4,p.roof);}}
 for(const place of places){const [x,z]=place.position,[w,d]=place.size;add(x,.85,z,w,.35,d,p.curb);
  for(let k=-w/2+2;k<w/2;k+=2)add(x+k,1.035,z,.025,.012,d,p.stone);
  for(let k=-d/2+2;k<d/2;k+=2)add(x,1.037,z+k,w,.012,.025,p.stone);
 }
 // Grass courts with paved connectors reproduce the reference's garden districts.
 for(const [x,z,w,d] of [[-41,13,29,54],[41,30,28,21]]){
  layout(x,1.057,z,w,.025,d,p.ground);
  layout(x,1.078,z,7,.015,d,p.curb);
 }
 for(const z of [-13,1,16,39])layout(-41,1.08,z,29,.018,3.2,p.curb);
 for(const z of [19.5,29,39])layout(41,1.08,z,28,.018,2.5,p.curb);
 for(const b of buildings.filter(b=>b.kind==="home"||b.kind==="office")){
  add(b.position[0],1.086,b.position[1],b.size[0]+1.6,.025,b.size[1]+1.6,p.curb);
  const center=S(b.kind==="home"?41:-41),front=b.position[1]+b.size[1]/2+1;
  add((center+b.position[0])/2,1.082,front,Math.abs(center-b.position[0])+2,.02,2,p.curb);
 }
 layout(0,.9,52,32,.3,9,p.sand);
 return b;},[p]);
 return <group>
 <mesh rotation={[-Math.PI/2,0,0]} position={[0,-2.3,0]} receiveShadow><planeGeometry args={[20000,20000]}/>{walking?<meshStandardMaterial key="walk-floor" color={p.floor}/>:<meshStandardMaterial key="overview-floor" color={p.floor} transparent depthWrite={false} onBeforeCompile={fadeFloor}/>}</mesh>
 <Slab outline={townConfig.outline} y={-1.8} depth={1.5} color={p.base}/>
 <Slab outline={townConfig.outline} y={-.3} depth={.5} color={p.wall} scale={.996}/>
 <Slab outline={townConfig.outline} y={.2} depth={.35} color={p.ground} scale={.99}/>
 <Block position={[0,.62,0]} size={[S(128),.12,S(108)]} color={p.curb}/>
 <BoxBatch boxes={boxes}/>
 <TownEntrance/>
 </group>;
}
