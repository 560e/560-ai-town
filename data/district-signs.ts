import {fitSign} from "./sign-layout.ts";
import {townDistance} from './town-scale.ts';

function plaque(text:string,maxWidth:number,height:number){return {text,maxWidth,height,width:fitSign(text,maxWidth,height).width};}
function gateway(text:string,maxWidth:number,height:number,x:number,z:number,baseWidth:number,baseDepth:number){
 const sign=plaque(text,maxWidth,height);
 return {...sign,x:townDistance(x),z:townDistance(z),postX:sign.width/2+.75,baseWidth,baseDepth};
}
export const districtSigns={
 service:plaque("五六零AI服务中心",19.5,2.1),
 academy:gateway("五六零AI学院",18,2.15,0,-16,1.35,1.35),
 office:gateway("五六零AI创业园",20.5,2.3,-41,40,1.1,1.1),
 retail:gateway("五六零AI商业街",19.8,2.15,41,9,.95,1.05),
 community:gateway("五六零AI社区",18.5,2.1,41,41,1.05,1.05),
 plaza:gateway("五六零AI广场",17.5,2.15,0,18,1.05,1.1),
 task:{...plaque("任务广场",20,3),scale:.72,groundY:1.02,boardWidth:25.4,boardDepth:2.4,panelStep:7.5,z:townDistance(30),headerY:8.9,roofY:10.6,categories:["学习任务","创作挑战","社区活动"]},
};
export const districtSignObstacles=[districtSigns.academy,districtSigns.office,districtSigns.retail,districtSigns.community,districtSigns.plaza].flatMap(sign=>[-1,1].map(side=>({x:sign.x+side*sign.postX,z:sign.z,w:sign.baseWidth,d:sign.baseDepth})));
