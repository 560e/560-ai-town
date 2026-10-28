import {townDistance as S} from '@/data/town-scale';
import { useMemo } from "react";
import { roads } from "@/data/town-config";
import { activeSkin } from "@/data/skins";
import BoxBatch,{type BoxSpec} from "./BoxBatch";
export default function TownRoads(){const boxes=useMemo(()=>{const p=activeSkin.palette,b:BoxSpec[]=[];
 for(const road of roads){const [x,z]=road.position,[w,d]=road.size;b.push({position:[x,.72,z],size:[w+.4,.12,d+.4],color:p.marking},{position:[x,.8,z],size:[w,.06,d],color:p.road});const vertical=d>w,length=Math.max(w,d);
 for(let t=-length/2+1;t<length/2-1;t+=3){const px=x+(vertical?0:t),pz=z+(vertical?t:0);if(roads.some(r=>r.id!==road.id&&Math.abs(px-r.position[0])<r.size[0]/2+.3&&Math.abs(pz-r.position[1])<r.size[1]/2+.3))continue;b.push({position:[px,.84,pz],size:vertical?[.12,.015,1.3]:[1.3,.015,.12],color:p.marking});}}
 for(const [x,z,vertical] of [[-22,-17,0],[22,-17,0],[-22,39,0],[22,38,0],[0,-12.5,1],[0,22,1],[41,14.5,1],[0,46,1],[-48,46,1],[41,-49,1]])for(let i=0;i<7;i++)b.push({position:[S(x)+(vertical?S((i-3)*.65):0),.86,S(z)+(vertical?0:S((i-3)*.65))],size:vertical?[S(.32),.018,S(4)]:[S(4),.018,S(.32)],color:p.marking});
 return b;},[]);return <BoxBatch boxes={boxes} castShadow={false}/>;}
