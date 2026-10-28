import {useFrame,useThree} from '@react-three/fiber';
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {visibleCharacters,type OnlineResident} from '@/lib/multiplayer';
import {serviceEntrance} from '@/data/service-entrance';
import type {PlayerState,TownRuntime} from '@/data/town-runtime';
import TownPlayer from './TownPlayer';
function RemoteResident({resident,world}:{resident:OnlineResident;world:MutableRefObject<TownRuntime>}){
  const runtime=useRef<{player:PlayerState}>({player:{x:resident.pose.x,z:resident.pose.z,yaw:resident.pose.yaw,lookYaw:0,pitch:0,exists:true,walking:true,moving:false,view:'third',stride:0,typing:false,seat:null}});
  useFrame((_,delta)=>{
    const target=world.current.remoteResidents?.find(r=>r.id===resident.id)?.pose;if(!target){runtime.current.player.exists=false;return;}
    const p=runtime.current.player,dx=target.x-p.x,dz=target.z-p.z,distance=Math.hypot(dx,dz),blend=1-Math.exp(-Math.min(delta,.1)*12);
    if(distance>8||target.seat!==null||p.seat!==null){p.x=target.x;p.z=target.z;}else{p.x+=dx*blend;p.z+=dz*blend;}
    p.yaw+=Math.atan2(Math.sin(target.yaw-p.yaw),Math.cos(target.yaw-p.yaw))*blend;
    p.moving=target.moving&&distance>.02;p.stride+=Math.min(distance*blend,1);
    p.seat=target.seat===null?null:{index:target.seat,returnX:target.x,returnZ:target.z+1.4};
    p.exists=world.current.visibleCharacterIds?.has(`user:${resident.id}`)??true;
  },-1);
  return <TownPlayer runtime={runtime} walking view="third" speech={resident.speech??null} remote={resident}/>;
}
export default function TownOnlineResidents({runtime}:{runtime:MutableRefObject<TownRuntime>}){
  const invalidate=useThree(s=>s.invalidate),frameloop=useThree(s=>s.frameloop);
  useEffect(()=>{if(frameloop!=='demand')return;let previous=runtime.current.remoteResidents;const timer=setInterval(()=>{const next=runtime.current.remoteResidents;if(next!==previous){previous=next;invalidate();}},250);return()=>clearInterval(timer);},[runtime,frameloop,invalidate]);
  const [residents,setResidents]=useState<OnlineResident[]>([]),last=useRef(''),elapsed=useRef(1);
  useFrame((_,delta)=>{
    elapsed.current+=delta;if(elapsed.current<.2)return;elapsed.current=0;
    const r=runtime.current,peers=r.remoteResidents||[],identity=JSON.stringify(peers.map(p=>({id:p.id,name:p.name,badges:p.badges,character:p.character,speech:p.speech?.id??null})));
    if(identity!==last.current){last.current=identity;setResidents(peers);}
    const origin=r.player.exists?r.player:{x:0,z:0};
    r.visibleCharacterIds=visibleCharacters([
      ...peers.map(p=>({id:`user:${p.id}`,x:p.pose.x,z:p.pose.z,kind:'user' as const})),
      ...r.npcs.map(p=>({id:p.id,x:p.x,z:p.z,kind:'npc' as const,priority:r.talkingId===p.id})),
      {id:'service-guide',...serviceEntrance.npc,kind:'npc',priority:Math.hypot(origin.x-serviceEntrance.npc.x,origin.z-serviceEntrance.npc.z)<10}
    ],origin,r.visibleCharacterIds||new Set(),29);
  },-1.5);
  return <group name="online-residents">{residents.map(resident=><RemoteResident key={resident.id} resident={resident} world={runtime}/>)}</group>;
}
