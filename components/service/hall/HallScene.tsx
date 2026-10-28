"use client";
import {useEffect,useMemo,type ReactNode} from 'react';
import {CanvasTexture,SRGBColorSpace} from 'three';
import {type ThreeEvent} from '@react-three/fiber';
import BoxBatch,{type BoxSpec} from '@/components/town/BoxBatch';
import {characterParts} from '@/components/town/character-parts';
import {hallStations,type HallStationId} from '@/data/service-hall';
import {hallInterior} from '@/data/service-hall-camera';
import type {PublicTitle} from '@/lib/service';

const palette={white:'#f7fcff',blue:'#147fc2',light:'#d9eef7',trim:'#76bbdc',stone:'#f0e8d8',gold:'#e8b95e',wood:'#d4a578',green:'#75ad69'};
function architecture(academy=false){
 const colors=academy?{...palette,stone:'#edf5fb',gold:'#91c7e8',wood:'#a8c6d6'}:palette;
 const boxes:BoxSpec[]=[];
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>boxes.push({position:[x,y,z],size:[w,h,d],color:academy?(color===palette.gold?colors.gold:color===palette.stone?colors.stone:color===palette.wood?colors.wood:color==='#c18a39'?'#247fc0':color==='#fbf2dd'?'#e6f4fb':color==='#f3eee2'?'#f1f8fc':color==='#eee7d9'?'#e7f1f7':color):color});
 box(0,-.58,0,31,1,25,'#277c9a');box(0,-.12,0,30.6,.3,24.6,palette.white);
 // A closed interior shell fills the viewport from every permitted camera angle.
 box(0,0,0,30,.12,24,palette.stone);
 for(let x=-14;x<15;x+=2)for(let z=-11;z<12;z+=2)box(x,.071,z,1.97,.016,1.97,(x+z)%4===1?'#f3eee2':'#eee7d9');
 box(0,.085,2.5,5.2,.024,17,'#d9edf1');
 box(-2.65,.102,2.5,.06,.02,17,palette.gold);box(2.65,.102,2.5,.06,.02,17,palette.gold);
 box(0,3,-11.8,30,6,.4,palette.white);box(0,.4,-11.5,30,.8,.2,palette.light);
 const height=hallInterior.ceiling;
 for(const x of [-14.8,14.8]){
  box(x,height/2,0,.4,height,24,palette.white);
  box(x*.979,.65,0,.16,1.3,23.2,palette.light);
  box(x*.976,1.35,0,.1,.06,23.2,palette.gold);
  for(const z of [-7,0,7]){box(x*.984,4,z,.15,3.1,4.7,'#c3e5f0');box(x*.976,4,z,.12,.12,4.8,palette.white);box(x*.976,4,z,.12,3.2,.12,palette.white);}
 }
 box(0,6.7,-11.8,30,1.4,.4,palette.white);
 box(0,height/2,11.8,30,height,.4,palette.white);
 // Opaque glazing suggests daylight without exposing empty space outside the room.
 box(0,2.3,11.54,7.4,4.6,.14,'#93cadd');
 for(const x of [-3.8,0,3.8])box(x,2.3,11.42,.16,4.6,.2,palette.white);
 box(0,4.7,11.42,7.8,.22,.2,palette.blue);
 for(const x of [-.3,.3])box(x,2.1,11.27,.08,.7,.12,palette.gold);
 box(0,height+.15,0,30,.3,24,'#edf5f7');
 for(const x of [-14.45,14.45])box(x,height-.2,0,.22,.25,23.2,palette.trim);
 for(const z of [-11.4,11.4])box(0,height-.2,z,29,.25,.22,palette.trim);
 for(const z of [-7,0,7]){box(0,height-.12,z,20,.12,.75,palette.white);box(0,height-.2,z,17,.06,.4,'#fff4d9');}
 for(const x of [-14.6,-5.1,5.1,14.6]){box(x,3.15,-11.3,.65,6.3,.7,palette.white);box(x,6.1,-11.3,.9,.3,.95,palette.trim);}
 box(0,6.25,-11.5,30.5,.35,.9,palette.blue);box(0,6.48,-11.5,30.7,.12,1,palette.white);
 for(const x of [-9.8,9.8]){box(x,3.25,-11.48,7,3.8,.13,'#9dd5ef');box(x,3.25,-11.29,.12,3.95,.12,palette.white);box(x,3.25,-11.29,7.2,.12,.12,palette.white);for(const dx of [-3.55,3.55])box(x+dx,3.25,-11.3,.15,4,.16,palette.white);}
 // Central desk: blue inlay, layered white stone top and a warm foot rail.
 box(0,.88,-6.3,7.2,1.7,2.2,palette.white);box(0,1.15,-5.16,6.4,.7,.08,palette.blue);box(0,.16,-5.1,6.8,.14,.18,palette.gold);box(0,1.82,-6.3,7.5,.19,2.5,'#fbfbf5');
 for(const x of [-2.4,2.4]){box(x,2.12,-6.35,.8,.55,.08,'#267f9f');box(x,1.96,-6.23,.2,.35,.28,palette.white);}
 // Exhibition boards and sculpted feet.
 for(const x of [-9,9]){const accent=x<0?palette.blue:'#c18a39';box(x,.15,-5,6.3,.2,1.2,palette.white);for(const dx of [-2.5,2.5])box(x+dx,1,-5,.28,1.8,.4,accent);box(x,3.05,-5,6.1,3.8,.3,palette.white);box(x,3.05,-4.81,5.83,3.5,.12,x<0?'#e6f4fb':'#fbf2dd');box(x,5.06,-5,6.4,.22,.6,accent);}
 // Personal progress kiosk, angled screen is represented by a robust local frame.
 box(10,.9,3,1.8,1.7,1,palette.white);box(10,.18,3,2.4,.28,1.3,palette.blue);box(10,2.15,3,2.05,1.15,.25,palette.blue);
 // Existing town bench proportions, facing into the room.
 for(const z of [3.5,7.3]){box(-10,.82,z,1.1,.18,2.6,palette.wood);box(-10.53,1.26,z,.16,.72,2.6,palette.wood);for(const dz of [-.9,.9])box(-10,.4,z+dz,.8,.8,.14,'#4d91a6');}
 // Planters have matching walk collision footprints.
 for(const x of [-13,13])for(const z of [-9,9]){box(x,.45,z,1.7,.8,1.7,palette.white);box(x,.89,z,1.4,.08,1.4,'#c3a477');box(x,1.6,z,.18,1.5,.18,palette.wood);box(x,2.3,z,1.45,1.35,1.35,palette.green);box(x+.2,2.85,z,.85,.6,.95,'#99c36b');}
 for(const x of [-4,4]){box(x,1.85,11.5,.48,3.7,.55,palette.white);box(x,.32,11.5,.7,.6,.8,palette.blue);}
 box(0,.1,10.5,7.5,.04,2.25,'#6aadc7');
 return boxes;
}
function labelTexture(lines:string[],background:string,color:string,width:number,height:number){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*height/width);const ctx=canvas.getContext('2d')!;
 ctx.fillStyle=background;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.textAlign='center';ctx.textBaseline='middle';
 const gap=canvas.height/(lines.length+1);lines.forEach((line,i)=>{ctx.fillStyle=i===0?color:(background==='#147fc2'?'#d8efff':'#658393');let size=i===0?Math.min(gap*.8,82):Math.min(gap*.58,48);ctx.font=`${i===0?700:500} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;while(ctx.measureText(line).width>920&&size>18){size-=2;ctx.font=`${i===0?700:500} ${size}px "Microsoft YaHei", "PingFang SC", sans-serif`;}ctx.fillText(line,512,gap*(i+1));});
 const texture=new CanvasTexture(canvas);texture.colorSpace=SRGBColorSpace;return texture;
}
export function HallLabel({lines,position,width,height,background='#f5fbff',color='#147fc2',onClick,rotation}:{lines:string[];position:[number,number,number];width:number;height:number;background?:string;color?:string;onClick?:()=>void;rotation?:[number,number,number]}){
 const key=lines.join('\n'),texture=useMemo(()=>labelTexture(key.split('\n'),background,color,width,height),[key,background,color,width,height]);useEffect(()=>()=>texture.dispose(),[texture]);
 return <mesh position={position} rotation={rotation} onClick={onClick?(e:ThreeEvent<MouseEvent>)=>{e.stopPropagation();if(e.delta>5)return;onClick();}:undefined} onPointerOver={onClick?e=>{e.stopPropagation();document.body.style.cursor='pointer';}:undefined} onPointerOut={onClick?()=>{document.body.style.cursor='';}:undefined}><planeGeometry args={[width,height]}/><meshBasicMaterial map={texture} toneMapped={false}/></mesh>;
}
export default function HallScene({titles,onStation,variant='service',children}:{titles:PublicTitle[];onStation:(id:HallStationId)=>void;variant?:'service'|'academy';children?:ReactNode}){
 const academy=variant==='academy';
 const boxes=useMemo(()=>architecture(academy),[academy]),npc=useMemo(()=>characterParts('#278dcc','#dca557').map(p=>({position:[(p.pivot?.[0]||0)+p.position[0],(p.pivot?.[1]||0)+p.position[1],(p.pivot?.[2]||0)+p.position[2]] as [number,number,number],size:p.size,color:p.color})),[]);
 const summary=(kind:'permission'|'honor')=>{const items=titles.filter(t=>t.config.kind===kind);return items.length?[...items.slice(0,2).map(t=>t.config.name.length>16?t.config.name.slice(0,15)+'…':t.config.name),`共 ${items.length} 项 · 点击查看`]:['新的身份，即将相遇','公开发布后在这里展示'];};
 return <group name={academy?"academy-hall-architecture":"service-hall-architecture"}><BoxBatch boxes={boxes}/>
  <HallLabel lines={academy?['五六零AI学院','LEARN · EXPLORE · CREATE']:['五六零AI服务中心','SERVICE CENTRE · 560']} position={[0,4.5,-11.22]} width={9} height={2.4} background="#147fc2" color="#fff"/>
  <HallLabel lines={['返回五六零AI小镇','靠近出口按 E 返回']} position={[0,5.5,11.37]} rotation={[0,Math.PI,0]} width={7.5} height={1.1} background="#147fc2" color="#fff" onClick={()=>onStation('exit')}/>
  <HallLabel lines={[academy?'学习接待 · 从这里开始':'接待 · 身份办理']} position={[0,1.18,-5.105]} width={4.6} height={.54} background="#147fc2" color="#fff" onClick={()=>onStation('guide')}/>
  <group position={[0,.1,-8]} onClick={e=>{e.stopPropagation();if(e.delta>5)return;onStation('guide');}}><BoxBatch boxes={npc}/></group>
  <HallLabel lines={[academy?'小零 · 学院学习向导':'小零 · NPC服务向导']} position={[0,2.95,-7.8]} width={3.3} height={.6} onClick={()=>onStation('guide')}/>
  <HallLabel lines={academy?['公开课程','找到适合你的第一课','图文 · 视频 · 学习资料','点击浏览已发布课程']:['权限称号','学习与共创，从身份开始',...summary('permission')]} position={[-9,3.1,-4.73]} width={5.65} height={3.3} onClick={()=>onStation('permission')}/>
  <HallLabel lines={academy?['学习路径','一步一步，找到学习方向','按主题与阶段探索','点击查看学习路径']:['荣誉称号','每一份热爱，都值得被看见',...summary('honor')]} position={[9,3.1,-4.73]} width={5.65} height={3.3} background={academy?'#f5fbff':'#fff7e6'} color={academy?'#147fc2':'#a8752c'} onClick={()=>onStation('honor')}/>
  <HallLabel lines={academy?['我的学习','课程 · 进度 · 继续学习']:['我的办理','身份 · 申请 · 消息']} position={[10,2.16,3.14]} width={1.86} height={.97} onClick={()=>onStation('mine')}/>
  <HallLabel lines={['返回小镇  ↓']} position={[0,.133,10.5]} rotation={[-Math.PI/2,0,0]} width={6.5} height={1.8} background="#6aadc7" color="#fff" onClick={()=>onStation('exit')}/>
  {hallStations.filter(s=>!s.id.startsWith('bench')).map(s=><mesh key={s.id} position={[s.arrival.x,.13,s.arrival.z]} rotation={[-Math.PI/2,0,0]} onClick={e=>{e.stopPropagation();if(e.delta>5)return;onStation(s.id);}}><ringGeometry args={[.47,.57,32]}/><meshBasicMaterial color={!academy&&s.id==='honor'?'#c7984e':'#419dc4'} transparent opacity={.55}/></mesh>)}
  {hallStations.filter(s=>s.id.startsWith('bench')).map(s=><mesh key={s.id} position={[s.at.x,1,s.at.z]} onClick={e=>{e.stopPropagation();if(e.delta>5)return;onStation(s.id);}}><boxGeometry args={[1.5,1.5,2.8]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>)}
  {children}
 </group>;
}


