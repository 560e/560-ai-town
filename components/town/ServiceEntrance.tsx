import {useFrame} from '@react-three/fiber';
import type {Group} from 'three';
import {CharacterName} from "./CharacterName";
import {useMemo,useRef,type MutableRefObject} from 'react';

import {Html} from '@react-three/drei';
import {characterParts} from './character-parts';
import {serviceEntrance} from '@/data/service-entrance';
import {type TownRuntime} from '@/data/town-runtime';
export default function ServiceEntrance({runtime,paused,walking,onOpen,recommendation}:{runtime:MutableRefObject<TownRuntime>;paused:boolean;walking:boolean;onOpen:()=>void;recommendation:string}){
  const model=useRef<Group>(null);useFrame(()=>{if(model.current)model.current.visible=runtime.current.visibleCharacterIds?.has('service-guide')??true;});
  const parts=useMemo(()=>characterParts('#298fc1','#f1bc64'),[]);
  return <group name="service-centre-guide"><group ref={model} position={[serviceEntrance.npc.x,1.04,serviceEntrance.npc.z]}>{parts.map((p,i)=><mesh key={i} position={[(p.pivot?.[0]||0)+p.position[0],(p.pivot?.[1]||0)+p.position[1],(p.pivot?.[2]||0)+p.position[2]]} castShadow><boxGeometry args={p.size}/><meshStandardMaterial color={p.color} roughness={.8}/></mesh>)}<CharacterName name="小零" npc/></group><group position={[serviceEntrance.board.x,1,serviceEntrance.board.z]}><mesh position={[0,1.35,0]} castShadow><boxGeometry args={[3,2.5,.3]}/><meshStandardMaterial color="#e3f4fc"/></mesh>{[-1.1,1.1].map(x=><mesh key={x} position={[x,.15,0]}><boxGeometry args={[.2,.7,.4]}/><meshStandardMaterial color="#3285b6"/></mesh>)}{!paused&&walking&&<Html position={[0,1.4,.2]} center distanceFactor={walking?7:32} zIndexRange={[16,0]}><button className="service-map-board" onPointerDown={e=>e.stopPropagation()} onClick={onOpen}><b>服务中心 · 身份展示板</b><span>{recommendation||'了解身份 · 申请服务'}</span><small>点击直接进入服务中心 ↗</small></button></Html>}</group></group>;
}


