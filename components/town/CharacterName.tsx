import {IdentityBadges} from '@/components/account/IdentityBadges';
import type {IdentityBadge} from '@/lib/identity-display';
import {Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {useRef,type MutableRefObject} from 'react';
import {Group,Vector3} from 'three';
import type {TownRuntime} from '@/data/town-runtime';
export function CharacterName({name,badges=[],npc=false,self=true,position=[0,2.75,0]}:{name:string;badges?:IdentityBadge[];npc?:boolean;self?:boolean;position?:[number,number,number]}){
 const anchor=useRef<Group>(null),label=useRef<HTMLDivElement>(null),world=useRef(new Vector3());
 useFrame(({camera,size})=>{
  if(!anchor.current||!label.current)return;anchor.current.getWorldPosition(world.current);
  const distance=camera.position.distanceTo(world.current),limit=size.width<761?36:52;
  label.current.classList.toggle("is-distant",distance>(size.width<761?30:38));
  let visible=true;for(let node:import('three').Object3D|null=anchor.current;node;node=node.parent)if(!node.visible)visible=false;
  label.current.style.display=!visible||distance>limit?'none':'';
  label.current.style.opacity=String(Math.max(0,Math.min(1,(limit-distance)/10)));
 });
 return <group ref={anchor} position={position}><Html center zIndexRange={[17,0]} style={{pointerEvents:'none'}}><div ref={label} className={`character-label${!npc&&badges.length?' has-identities':''}`}><div className={`character-name${npc?' is-npc':self?'':' is-resident'}`}><span>{name}</span><small>{npc?'NPC':self?'我':'居民'}</small></div>{!npc&&<div className="character-identity-row"><IdentityBadges badges={badges} compact/></div>}</div></Html></group>;
}
function NpcName({runtime,index}:{runtime:MutableRefObject<TownRuntime>;index:number}){
 const root=useRef<Group>(null),npc=runtime.current.npcs[index];
 useFrame(()=>{if(root.current){root.current.position.set(npc.x,1.04,npc.z);root.current.visible=runtime.current.visibleCharacterIds?.has(npc.id)??true;}});
 return <group ref={root}><CharacterName name={npc.name} npc/></group>;
}
export function NpcNames({runtime}:{runtime:MutableRefObject<TownRuntime>}){return <group name="npc-name-labels">{runtime.current.npcs.map((npc,index)=><NpcName key={npc.id} runtime={runtime} index={index}/>)}</group>;}
