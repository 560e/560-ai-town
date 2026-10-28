import {activeSkin} from "@/data/skins";
export type Part={position:[number,number,number];size:[number,number,number];color:string;pivot?:[number,number,number];swing?:number};
export function characterParts(shirt:string,hair:string):Part[]{const p=activeSkin.palette,parts:Part[]=[
 {position:[0,1.15,0],size:[.64,.7,.38],color:shirt},{position:[0,1.78,0],size:[.48,.48,.44],color:p.skin},
 {position:[0,2.04,0],size:[.5,.12,.46],color:hair},{position:[-.12,1.82,.23],size:[.055,.07,.035],color:p.shoes},{position:[.12,1.82,.23],size:[.055,.07,.035],color:p.shoes},{position:[0,1.16,.205],size:[.07,.56,.035],color:p.wall}];
 for(const s of [-1,1])parts.push({position:[0,-.33,0],size:[.25,.66,.27],color:p.trousers,pivot:[s*.19,.8,0],swing:s},{position:[0,-.69,.07],size:[.3,.16,.43],color:p.shoes,pivot:[s*.19,.8,0],swing:s},{position:[0,-.21,0],size:[.21,.42,.25],color:shirt,pivot:[s*.44,1.43,0],swing:-s*.8},{position:[0,-.5,0],size:[.2,.21,.23],color:p.skin,pivot:[s*.44,1.43,0],swing:-s*.8});return parts;}
