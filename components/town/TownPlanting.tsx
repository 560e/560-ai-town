import { useMemo } from "react";
import { gardens,trees,hedges } from "@/data/district-plan";
import { activeSkin } from "@/data/skins";
import BoxBatch,{type BoxSpec} from "./BoxBatch";
export default function TownPlanting(){const boxes=useMemo(()=>{const p=activeSkin.palette,b:BoxSpec[]=[];const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>b.push({position:[x,y,z],size:[w,h,d],color});
 gardens.forEach(g=>{box(g.x,1.08,g.z,g.w+.2,.16,g.d+.2,p.stone);box(g.x,1.19,g.z,g.w,.15,g.d,p.ground);});
 trees.forEach(([x,z],i)=>{const h=2.8+i%3*.25;box(x,1+h/2,z,.4,h,.4,p.trunk);box(x,1+h,z,1.9,2,1.8,i%3===0?"#69b720":p.foliage);box(x-.25,2.1+h,z-.15,1.35,.65,1.2,p.shrub);});
 hedges.forEach(h=>box(h.x,1.5,h.z,h.w,.95,h.d,p.shrub));
 return b;},[]);return <BoxBatch boxes={boxes}/>;}
