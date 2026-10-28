import {useMemo} from "react";
import {townConfig} from "@/data/town-config";
import {entranceDesign as gate} from "@/data/entrance-design";
import {activeSkin} from "@/data/skins";
import BoxBatch,{type BoxSpec} from "./BoxBatch";
import TownSign from "./TownSign";
import EntranceOrnaments from "./EntranceOrnaments";

export default function TownEntrance(){
 const p=activeSkin.palette;
 const boxes=useMemo(()=>{
  const parts:BoxSpec[]=[];
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>parts.push({position:[x,y,z],size:[w,h,d],color});
  for(const side of [-1,1]){
   const x=side*gate.columnX;
   box(x,1.35,0,gate.baseWidth,.8,gate.baseDepth,"#d7e6ef");
   box(x,5.85,0,gate.columnWidth,8.3,gate.columnDepth,p.wall);
   box(x,6,1.24,1.45,7.8,.14,p.glass);
   for(const offset of [-.86,.86])box(x+offset,6,1.34,.1,7.8,.1,"#b4d5e5");
   box(x,9.9,0,3.4,.42,3.1,p.wall);
   box(x,10.17,0,3.6,.15,3.3,"#a8c9dc");
  }
  box(0,gate.signY,0,gate.beamWidth,3.65,2.05,p.wall);
  box(0,8.48,0,gate.beamWidth+.4,.22,2.4,"#d4e6f1");
  box(0,12.3,0,gate.beamWidth+1.2,.45,3.05,p.wall);
  box(0,12.59,0,gate.beamWidth+1.6,.12,3.25,"#aed2e3");
  box(0,12.77,0,gate.beamWidth-.3,.24,2.35,p.glass);
  box(0,12.95,0,gate.beamWidth-.8,.13,2.55,p.wall);
  // A silver edge below the nameplate adds definition without a dark outline.
  box(0,8.72,1.21,29.7,.1,.13,"#b8d9e9");
  return parts;
 },[p]);
 return <group position={[0,0,gate.z]} name="main-entrance-architecture">
  <BoxBatch boxes={boxes}/>
  <TownSign text={townConfig.name} position={[0,gate.signY,1.12]} width={gate.signWidth} height={gate.signHeight} paddingX={2.2} color={p.glass}/>
  <EntranceOrnaments/>
 </group>;
}
