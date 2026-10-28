import type {BoxSpec} from "../components/town/BoxBatch.tsx";
import type {VehicleType} from "./traffic.ts";
export function vehicleBoxes(v:VehicleType):BoxSpec[]{const b:BoxSpec[]=[];const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>b.push({position:[x,y,z],size:[w,h,d],color});const W=v.width,L=v.length,H=v.height,glass="#286279",white="#f4f5ed";
 box(0,.56,0,W,.42,L,v.color);box(0,.31,0,W*.86,.12,L*.83,"#31434e");
 if(["bus","shuttle"].includes(v.kind)){
  box(0,H-.08,0,W,.16,L*.91,white);for(let z=-L*.35;z<L*.45;z+=.8){for(const s of [-1,1]){box(s*W*.45,H*.62,z,.07,H*.61,.1,white);if(v.kind==="bus")box(s*W*.46,H*.65,z-.32,.055,H*.43,.55,glass);else box(s*W*.24,.9,z-.2,.4,.35,.5,"#467d9d");}}
  box(0,H*.62,L*.44,W*.84,H*.52,.06,glass);
 }else if(v.kind==="delivery"){
  box(0,H*.57,-L*.14,W*.96,H*.8,L*.57,white);box(0,1.1,L*.31,W*.85,.85,L*.3,v.color);box(0,1.3,L*.466,W*.7,.4,.04,glass);box(0,H*.65,-L*.43,W*.8,H*.65,.05,"#bcc9cf");
 }else{
  const pickup=v.kind==="pickup",cabL=pickup?L*.36:v.kind==="wagon"||v.kind==="van"?L*.76:L*.53,cabZ=pickup?L*.2:0;
  box(0,(H+.6)/2,cabZ,W*.84,H-.5,cabL,v.color);box(0,H+.025,cabZ,W*.86,.1,cabL*.9,white);box(0,H*.8,cabZ+cabL/2+.02,W*.73,H*.32,.055,glass);box(0,H*.8,cabZ-cabL/2-.02,W*.73,H*.32,.055,glass);
  for(const side of [-1,1]){box(side*W*.43,H*.79,cabZ,.06,H*.32,cabL*.78,glass);box(side*W*.47,H*.55,cabZ+.1,.04,.045,.22,white);}
  if(pickup){box(0,.81,-L*.26,W*.78,.08,L*.32,"#445560");for(const s of [-1,1])box(s*W*.45,.93,-L*.26,.12,.5,L*.34,v.color);}
  if(v.kind==="taxi")box(0,H+.2,0,.55,.27,.35,"#ffffe5");
  if(v.kind==="suv")box(0,.91,-L*.51,.75,.75,.22,"#31434e");
  if(v.kind==="wagon"||v.kind==="van")for(const s of [-1,1])box(s*W*.3,H+.17,-.1,.08,.14,cabL*.8,"#31556c");
  if(v.kind==="sport"){box(0,H,-L*.4,W*1.02,.12,.35,"#283f53");box(0,.8,L*.33,W*.7,.07,L*.2,"#f3e9db");}
  if(v.kind==="mini")box(0,.85,L*.48,W*.45,.18,.04,"#caeee6");
 }
 for(const s of [-1,1]){box(s*W*.32,.65,L/2+.025,W*.2,.16,.05,"#fff5c5");box(s*W*.32,.64,-L/2-.025,W*.2,.14,.05,"#e75344");}
 return b;}
