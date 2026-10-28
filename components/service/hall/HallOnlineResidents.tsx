import {useFrame,useThree} from '@react-three/fiber';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {visibleCharacters,type OnlineResident} from '@/lib/multiplayer';
import type {PlayerState} from '@/data/town-runtime';
import type {HallRuntime} from '@/data/service-hall';
import TownPlayer from '@/components/town/TownPlayer';
function RemoteResident({resident,world}:{resident:OnlineResident;world:MutableRefObject<HallRuntime>}){
 const runtime=useRef<{player:PlayerState}>({player:{x:resident.pose.x,z:resident.pose.z,yaw:resident.pose.yaw,lookYaw:0,pitch:0,exists:true,walking:true,moving:false,view:'third',stride:0,typing:false,seat:null}});
 useFrame((_,delta)=>{
  const target=world.current.remoteResidents?.find(r=>r.id===resident.id)?.pose,p=runtime.current.player;
  if(!target){p.exists=false;return;}
  const dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz),blend=1-Math.exp(-Math.min(delta,.1)*12);
  if(distance>8||target.seat!==null||p.seat!==null){p.x=target.x;p.z=target.z;}else{p.x+=dx*blend;p.z+=dz*blend;}
  p.yaw+=Math.atan2(Math.sin(target.yaw-p.yaw),Math.cos(target.yaw-p.yaw))*blend;
  p.moving=target.moving&&distance>.02;p.stride+=Math.min(distance*blend,1);
  p.seat=target.seat===null?null:{index:target.seat,returnX:target.x,returnZ:target.z+1.4};
  p.exists=world.current.visibleCharacterIds?.has(`user:${resident.id}`)??false;
 },-1);
 return <TownPlayer runtime={runtime} walking view="third" floor={.13} speech={resident.speech??null} remote={resident}/>;
}
export default function HallOnlineResidents({runtime,maxResidents=28}:{runtime:MutableRefObject<HallRuntime>;maxResidents?:number}){
 const invalidate=useThree(s=>s.invalidate),frameloop=useThree(s=>s.frameloop);
 useEffect(()=>{if(frameloop!=='demand')return;let previous=runtime.current.remoteResidents;const timer=setInterval(()=>{const next=runtime.current.remoteResidents;if(next!==previous){previous=next;invalidate();}},250);return()=>clearInterval(timer);},[runtime,frameloop,invalidate]);
 const [residents,setResidents]=useState<OnlineResident[]>([]),last=useRef(''),elapsed=useRef(1);
 useFrame((_,delta)=>{
  elapsed.current+=delta;if(elapsed.current<.2)return;elapsed.current=0;
  const r=runtime.current,peers=r.remoteResidents||[];
  // Each scene reserves the local resident and its own NPCs from the 30 character slots.
  r.visibleCharacterIds=visibleCharacters(peers.map(p=>({id:`user:${p.id}`,x:p.pose.x,z:p.pose.z,kind:'user' as const})),r.player,r.visibleCharacterIds||new Set(),maxResidents);
  const visible=peers.filter(p=>r.visibleCharacterIds!.has(`user:${p.id}`));
  const identity=JSON.stringify(visible.map(p=>({id:p.id,name:p.name,badges:p.badges,character:p.character,speech:p.speech?.id??null})));
  if(identity!==last.current){last.current=identity;setResidents(visible);}
 },-1.5);
 return <group name="hall-online-residents">{residents.map(resident=><RemoteResident key={resident.id} resident={resident} world={runtime}/>)}</group>;
}
