import {places} from "./places.ts";
import type {PlaceType} from "../types/town.ts";
export type DialogueArea=PlaceType|"arrival";
export const areaNames:Record<DialogueArea,string>={plaza:"五六零AI广场",service:"五六零AI服务中心",education:"五六零AI学院",office:"五六零AI创业园",retail:"五六零AI商业街",task:"任务广场",community:"五六零AI社区",arrival:"小镇入口"};
export const dialogueLines:Record<DialogueArea,string[]>={
 retail:["你也来商业街看看有什么好玩的 AI 呀？","前面的创作工坊很有意思，来看看大家的新作品吧。","逛累了可以去咖啡店坐坐，聊聊你的 AI 灵感。","我在找能帮我整理照片的 AI 工具，你有好点子吗？","这条街的小店各有特色，慢慢逛才有惊喜。"],
 education:["今天准备学点什么？我想试试用 AI 做一个小应用。","学会一个新工具，记得亲手做个小作品试试。","遇到不懂的问题别着急，我们可以一起讨论。","刚想到一个学习计划：每天实践一个 AI 小技巧。"],
 office:["你最近在做什么项目？说不定我们能一起合作。","把一个小点子做出来，往往比一直想更有收获。","园区里有不少有趣的创意，来交流一下吧！","忙完这段工作，我准备去院子里找找灵感。"],
 plaza:["这个 560 雕塑挺醒目的，我们就在这里碰面吧！","欢迎来到五六零AI广场，先休息一会儿再出发。","从这里去学院、创业园和商业街都很方便。","你最喜欢小镇里的哪个地方？我喜欢广场的水景。"],
 community:["回来啦！忙了一天，来院子里走走吧。","这里是我们的 AI 社区，有空来和邻居们聊聊天。","院子里挺安静，适合整理一下今天的新想法。","工作和学习之外，也别忘了好好休息呀。"],
 service:["欢迎来到五六零AI服务中心，第一次来可以先了解一下小镇。","第一次来小镇吗？从广场出发逛一圈很方便。","想学 AI、找工具还是认识新伙伴？可以先逛逛学院和商业街。","有好建议记下来，让小镇一起变得更好。"],
 task:["来看看任务广场吧，找一个感兴趣的挑战试试。","从一个小任务开始，也能积累很棒的作品。","我喜欢和伙伴一起完成创作挑战，你呢？","完成作品后，可以去商业街看看其他人的创意。"],
 arrival:["欢迎来到五六零人工智能AI小镇！","绿色的小人就是你，试着往前走走吧。","沿着道路就能逛到各个街区，过马路记得留意车辆。","想学 AI、做项目还是找灵感？小镇里慢慢逛。"],
};
export function areaAt(x:number,z:number):DialogueArea{return places.find(p=>Math.abs(x-p.position[0])<=p.size[0]/2&&Math.abs(z-p.position[1])<=p.size[1]/2)?.type??"arrival";}
export function chooseLine(area:DialogueArea,previous=-1,rng=Math.random){const lines=dialogueLines[area];let index=Math.floor(rng()*(lines.length-(previous>=0?1:0)));if(previous>=0&&index>=previous)index++;return {index,text:lines[index]};}
export const npcNames=["小林","阿蓝","小禾","小海","小夏","阿辰","小宁","小叶"];

/** Handle dialogue shortcuts before the global scene handler filters focused buttons. */
export function handleDialogueKey(event:Pick<KeyboardEvent,'key'|'repeat'|'isComposing'|'ctrlKey'|'altKey'|'metaKey'|'preventDefault'|'stopPropagation'>,advance:()=>void,close:()=>void){
 if(event.isComposing||event.ctrlKey||event.altKey||event.metaKey)return false;
 const key=event.key.toLowerCase();if(!['e',' ','escape'].includes(key))return false;
 event.preventDefault();event.stopPropagation();
 if(!event.repeat){if(key==='e')advance();else close();}
 return true;
}
