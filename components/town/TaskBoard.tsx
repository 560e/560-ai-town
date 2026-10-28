import {useMemo} from "react";
import {districtSigns} from "@/data/district-signs";
import BoxBatch,{type BoxSpec} from "./BoxBatch";
import TownSign from "./TownSign";

/** Public task pavilion: three categories and nine illustrative notice cards. */
export default function TaskBoard(){
 const task=districtSigns.task;
 const boxes=useMemo(()=>{
  const parts:BoxSpec[]=[];
  const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>parts.push({position:[x,y,z],size:[w,h,d],color});
  box(0,1.22,0,task.boardWidth,.4,task.boardDepth,"#d0e5df");
  box(0,4.3,0,24.5,6,.85,"#eff9f5");
  box(0,task.headerY,0,24.5,3.1,.9,"#2d9a64");
  box(0,task.roofY,0,26.4,.28,2.2,"#effaf6");
  box(0,task.roofY+.2,0,25.7,.12,1.75,"#76c9a3");
  box(0,7.3,.66,24.5,.14,.28,"#c6e3d5");
  for(const side of [-1,1]){
   box(side*12.15,5.7,0,1,9,1.4,"#f4faf7");
   box(side*12.15,5.7,.74,.17,8.1,.12,"#8bd3ad");
   box(side*12.15,1.5,0,1.1,.4,2,"#c0ddce");
   // Paired golden tabs make the main header distinct without adding new colours to the district.
   for(const y of [8.6,9.15])box(side*9.4,y,.51,1.1,.14,.08,"#f4dfa6");
  }
  for(const [i,x]of [-task.panelStep,0,task.panelStep].entries()){
   box(x,4.3,.5,6.9,5.5,.2,"#d2e9df");
   box(x,6.65,.66,6.6,.85,.18,"#218956");
   for(let row=0;row<3;row++){
    const y=5.55-row*1.48;
    box(x,y,.69,6.1,1.15,.17,"#fcfdf4");
    box(x-2.65,y,.8,.18,.86,.07,["#62b6d9","#ecc56f","#70b996"][i]);
    box(x-.1,y+.22,.8,4.5,.12,.06,"#75a395");
    box(x-.75,y-.04,.8,3.2,.08,.06,"#bad1c7");
    box(x-1.1,y-.27,.8,2.5,.07,.06,"#c7dcd2");
    box(x+2.05,y-.22,.81,1.15,.3,.07,"#a9daba");
   }
  }
  return parts;
 },[task]);
 // Scale from the base so the smaller wall stays planted on the paving.
 return <group position={[0,task.groundY*(1-task.scale),task.z]} scale={task.scale} name="task-square-notice-pavilion">
  <BoxBatch boxes={boxes}/>
  <TownSign text={task.text} position={[0,task.headerY,.66]} width={task.maxWidth} height={task.height} color="#18833f"/>
  {task.categories.map((text,i)=><TownSign key={text} text={text} position={[(i-1)*task.panelStep,6.65,.81]} width={5.7} height={.75} color="#218956"/>)}
 </group>;
}
