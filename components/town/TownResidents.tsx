import {useLayoutEffect,useMemo,useRef,type MutableRefObject} from "react";
import {useFrame} from "@react-three/fiber";
import {Color,InstancedMesh,Matrix4,Object3D} from "three";
import {activeSkin} from "@/data/skins";
import type {TownRuntime} from "@/data/town-runtime";
import {characterParts} from "./character-parts";
export default function TownResidents({animate,runtime}:{animate:boolean;runtime:MutableRefObject<TownRuntime>}){
 const mesh=useRef<InstancedMesh>(null);
 const actors=useMemo(()=>runtime.current.npcs.map((npc,index)=>({npc,parts:characterParts(activeSkin.residents[index%activeSkin.residents.length],index%3?activeSkin.palette.gold:activeSkin.palette.trunk)})),[runtime]);
 const count=actors.reduce((sum,a)=>sum+a.parts.length,0),matrices=useMemo(()=>({root:new Object3D(),part:new Object3D(),matrix:new Matrix4(),color:new Color()}),[]);
 useLayoutEffect(()=>{if(!mesh.current)return;let i=0;for(const actor of actors)for(const part of actor.parts)mesh.current.setColorAt(i++,matrices.color.set(part.color));if(mesh.current.instanceColor)mesh.current.instanceColor.needsUpdate=true;},[actors,matrices]);
 useFrame(()=>{if(!mesh.current)return;const {root,part,matrix}=matrices;let i=0;actors.forEach((a,index)=>{const state=a.npc,wave=animate&&state.moving?Math.sin(state.clock*8.5+index)*.52:0;root.position.set(state.x,1.04+Math.abs(wave)*.04,state.z);root.rotation.set(0,state.heading,0);root.scale.setScalar(runtime.current.visibleCharacterIds&&!runtime.current.visibleCharacterIds.has(state.id)?0:1);root.updateMatrix();
 for(const p of a.parts){const angle=wave*(p.swing??0),[x,y,z]=p.position,[px,py,pz]=p.pivot??[0,0,0];part.position.set(px+x,py+y*Math.cos(angle)-z*Math.sin(angle),pz+y*Math.sin(angle)+z*Math.cos(angle));part.rotation.set(angle,0,0);part.scale.set(...p.size);part.updateMatrix();matrix.multiplyMatrices(root.matrix,part.matrix);mesh.current!.setMatrixAt(i++,matrix);}});mesh.current.instanceMatrix.needsUpdate=true;});
 return <instancedMesh name="town-residents" ref={mesh} args={[undefined,undefined,count]} frustumCulled={false} castShadow receiveShadow><boxGeometry args={[1,1,1]}/><meshStandardMaterial roughness={.8}/></instancedMesh>;
}
