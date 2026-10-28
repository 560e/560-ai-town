import type { BoxSpec } from "../../components/town/BoxBatch.tsx";
import type { BuildingSpec } from "../district-plan.ts";
import type { TownSkin } from "../../types/skin.ts";
import {buildingColors} from "./building-colors.ts";
export function createBuilding(b:BuildingSpec,skin:TownSkin):BoxSpec[]{
 const p=skin.palette,colors=buildingColors(b,skin),a=colors.accent,boxes:BoxSpec[]=[];
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>boxes.push({position:[x,y,z],size:[w,h,d],color});
 const [w,d]=b.size,H=b.floors*b.floorHeight;
 box(0,H/2,0,w,H,d,p.wall);
 // Narrow coloured corner piers and a roof fascia leave most of the facade white.
 if(b.kind==="office"||b.kind==="home"){
  for(const side of [-1,1]){
   for(const face of [-1,1])box(side*(w/2-.25),H/2,face*(d/2+.02),.46,H,.05,colors.facade);
   box(side*(w/2+.02),H/2,0,.05,H,.55,colors.facade);
  }
  box(0,H-.38,0,w+.12,.48,d+.12,a);
 }
 box(0,.12,0,w+.5,.24,d+.5,p.stone);
 for(let f=0;f<b.floors;f++){
  const y=f*b.floorHeight,n=Math.max(2,Math.floor(w/2.15));
  for(const face of [-1,1])for(let i=0;i<n;i++){
   const x=-w/2+(i+.5)*w/n,ww=w/n*.73;
   box(x,y+b.floorHeight*.55,face*(d/2+.035),ww,b.floorHeight*.68,.09,p.glass);
   box(x,y+b.floorHeight*.55,face*(d/2+.1),.09,b.floorHeight*.72,.1,p.frame);
   box(x,y+b.floorHeight*.55,face*(d/2+.11),ww,.085,.12,p.frame);
   box(x,y+b.floorHeight*.17,face*(d/2+.17),ww+.14,.13,.35,p.frame);
   if(b.kind==="home"&&f>0&&i%2===0){
    box(x,y+.22,face*(d/2+.46),ww+.25,.16,.9,p.wall);
    box(x,y+.65,face*(d/2+.84),ww+.25,.48,.1,a);
    box(x-.25,y+.63,face*(d/2+.49),.5,.38,.4,p.orange);
    box(x-.25,y+.9,face*(d/2+.49),.55,.28,.45,p.shrub);
   }
  }
  const sides=Math.max(2,Math.floor(d/2.2));
  for(const face of [-1,1])for(let j=0;j<sides;j++){
   const z=-d/2+(j+.5)*d/sides;
   box(face*(w/2+.04),y+b.floorHeight*.55,z,.09,b.floorHeight*.68,d/sides*.72,p.glass);
   box(face*(w/2+.1),y+b.floorHeight*.55,z,.1,b.floorHeight*.7,.08,p.frame);
   box(face*(w/2+.12),y+b.floorHeight*.55,z,.12,.08,d/sides*.75,p.frame);
  }
  box(0,y+b.floorHeight-.05,0,w+.25,.22,d+.25,p.frame);
 }
 box(0,H+.18,0,w+.55,.3,d+.55,p.wall);
 box(0,H+.37,0,w-.5,.15,d-.5,a);
 for(const side of [-1,1]){
  box(side*(w/2-.05),H+.65,0,.18,.65,d+.2,p.wall);
  box(0,H+.65,side*(d/2-.05),w,.65,.18,p.wall);
 }
 box(-w*.2,H+1,0,1.6,.7,1.4,p.stone);box(w*.2,H+.9,-1,1.1,.5,1.1,p.frame);
 box(0,1.25,d/2+.13,1.55,2.5,.15,p.glass);
 box(0,2.6,d/2+.52,2.4,.2,1.15,b.kind==="civic"?p.roof:a);
 box(.3,1.1,d/2+.25,.06,.38,.08,p.gold);
 if(b.kind==="civic"){
  box(0,5.4,d/2+.8,w+1,.5,3.2,p.roof);
  for(const x of [-8,-5,5,8]){box(x,2.55,d/2+1.6,.55,5.1,.55,p.wall);box(x,.2,d/2+1.6,.85,.4,.85,p.stone);}
 }
 if(b.kind==="shop"){
  for(let i=0;i<10;i++)box(-w/2+(i+.5)*w/10,3.5,d/2+1,w/10,.2,2.4,i%2?a:p.wall);
  for(const x of [-w/2+.2,w/2-.2])box(x,1.7,d/2+1.9,.1,3.4,.1,p.metal);
  box(0,H+.5,0,w*.5,.35,d*.45,p.sand);
  for(const x of [-1.6,1.6]){box(x,H+.8,0,.7,.6,.7,p.orange);box(x,H+1.3,0,.9,.65,.9,p.shrub);}
 }
 return boxes;
}
