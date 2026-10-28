import type { Place } from "../types/town.ts";
import {townPoint} from './town-scale.ts';
const venue=(id:string,number:string,name:string,shortName:string,type:Place["type"],position:[number,number],size:[number,number]):Place=>({id,number,name,shortName,type,position:townPoint(position),size:townPoint(size),parentId:null,public:true,requiredTagIds:[],heightLimit:20,description:name+"公共空间"});
export const places:Place[]=[
  venue("town-square","01","五六零AI广场","AI广场","plaza",[0,5],[35,30]),
  venue("civic-hall","02","五六零AI服务中心","AI服务中心","service",[-41,-31],[30,24]),
  venue("learning-campus","03","五六零AI学院","AI学院","education",[0,-30],[35,30]),
  venue("office-campus","04","五六零AI创业园","AI创业园","office",[-41,13],[32,58]),
  venue("creative-street","05","五六零AI商业街","AI商业街","retail",[41,-17],[31,56]),
  venue("task-square","06","任务广场","任务广场","task",[0,33],[35,18]),
  venue("ai-community","07","五六零AI社区","AI社区","community",[41,30],[31,24]),
];
