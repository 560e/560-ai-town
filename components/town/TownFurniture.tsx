import {townDistance as S,townPoint} from '@/data/town-scale';
import { useMemo } from "react";
import { benches,lamps } from "@/data/district-plan";
import { activeSkin } from "@/data/skins";
import BoxBatch,{type BoxSpec} from "./BoxBatch";
import { Disk,Block } from "./primitives";
export default function TownFurniture(){const p=activeSkin.palette;const boxes=useMemo(()=>{const b:BoxSpec[]=[];const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>b.push({position:[x,y,z],size:[w,h,d],color});
 for(const [x,z] of lamps){box(x,3.3,z,.15,5,.15,p.metal);box(x,5.65,z,.6,.75,.6,p.metal);box(x,5.65,z+.32,.4,.48,.04,p.wall);box(x,6.12,z,.8,.16,.8,p.metal);box(x,1,z,.6,.3,.6,p.stone);}
 for(const [x,z] of benches){for(let i=0;i<4;i++)box(x,1.65,z-.45+i*.25,2.8,.13,.2,p.orange);box(x,2.15,z-.5,2.8,.65,.14,p.orange);for(const dx of [-1,1])box(x+dx,1.35,z,.13,.55,1,p.metal);}
 for(const [x,z] of ([[38,26],[44,35]] as [number,number][]).map(townPoint)){for(const dx of [-1.5,1.5])box(x+dx,2.2,z,.16,2.6,.16,p.trunk);for(let i=0;i<6;i++)box(x,3.6,z-1+i*.4,3.8,.15,.18,p.orange);}
 return b;},[p]);return <group><BoxBatch boxes={boxes}/>
 <Disk position={[S(41),1.3,S(31)]} radius={2.35} height={.5} color={p.stone}/><Disk position={[S(41),1.57,S(31)]} radius={2} height={.08} color={p.sea}/>
 <Disk position={[S(-41),1.3,S(14)]} radius={2.5} height={.5} color={p.stone}/><Disk position={[S(-41),1.58,S(14)]} radius={2.2} height={.06} color={p.ground}/>
 {[-1,1].map(s=><Block key={s} position={[S(41)+s*.75,1.7,S(31)+s*.4]} size={[.45,.15,.6]} color={p.gold}/>)}
 {([[38,7],[44,7]] as [number,number][]).map(townPoint).map(([x,z])=><group key={x}><Disk position={[x,1.8,z]} radius={1} height={.14} color={p.orange}/><Block position={[x,2,z]} size={[.1,2,.1]} color={p.metal}/><mesh position={[x,3.8,z]} castShadow><coneGeometry args={[1.7,.6,8]}/><meshStandardMaterial color={x<S(40)?p.roof:p.orange}/></mesh></group>)}
 </group>;}
