import {useFrame} from "@react-three/fiber";
import {Html} from "@react-three/drei";
import {useRef,type MutableRefObject} from "react";
import {Group} from "three";
import type {TownRuntime} from "@/data/town-runtime";
import {nearestBench,nearestNpc,stepTown,type BenchPrompt} from "@/data/town-runtime";
export function TownSimulation({runtime,animate,onNearest,onBench}:{runtime:MutableRefObject<TownRuntime>;animate:boolean;onNearest:(id:string|null)=>void;onBench:(prompt:BenchPrompt|null)=>void}){const lastBench=useRef("");const last=useRef<string|null>(null);useFrame((_,dt)=>{stepTown(runtime.current,dt,animate);},-4);useFrame(()=>{const npc=nearestNpc(runtime.current),id=npc?.id??null;const r=runtime.current,index=r.player.walking&&!r.player.typing&&!r.talkingId?(r.player.seat?.index??nearestBench(r)):null,key=`${index}:${!!r.player.seat}`;
 if(key!==lastBench.current){lastBench.current=key;onBench(index===null?null:{index,seated:!!r.player.seat});}
 runtime.current.nearestId=id;if(id!==last.current){last.current=id;onNearest(id);}},-1);return null;}
export default function NpcInteraction({runtime,id,onTalk}:{runtime:MutableRefObject<TownRuntime>;id:string|null;onTalk:()=>void}){const group=useRef<Group>(null);useFrame(()=>{const npc=runtime.current.npcs.find(n=>n.id===id);if(group.current){group.current.visible=!!npc; if(npc)group.current.position.set(npc.x,3.9,npc.z);}});if(!id)return null;return <group ref={group}><Html center zIndexRange={[30,0]}><button className="npc-talk-prompt" onPointerDown={e=>e.stopPropagation()} onClick={onTalk} aria-label="与附近NPC对话">•••<small>E / 对话</small></button></Html></group>;}
