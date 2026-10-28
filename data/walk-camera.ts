export const walkCameraLimits={third:{min:5.2,max:60,initial:7},first:{min:48,max:72,initial:62}};
export function walkCameraElevation(distance:number,pitch:number){
 const progress=Math.max(0,Math.min(1,(distance-12)/36));
 // A distant follow view rises over nearby roofs instead of remaining at street height.
 return Math.min(1.28,.32+pitch*.6+.65*progress*progress*(3-2*progress));
}
export function zoomWalkCamera(value:number,delta:number,view:'third'|'first'){
 const range=walkCameraLimits[view];return Math.max(range.min,Math.min(range.max,value*Math.exp(Math.max(-500,Math.min(500,delta))*(view==='third'?.0012:.0006))));
}
