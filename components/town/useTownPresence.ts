"use client";
import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {POLL_MS,type PresenceSnapshot,type SpawnId,type TownPose} from '@/lib/multiplayer';
import {walkSpawns} from '@/data/town-config';
import type {PresenceRuntime} from '@/data/scene-presence';
import type {TownSceneId} from '@/lib/town-scenes';
import type {ChatAction,PrivateChat} from '@/lib/town-chat';
import type {PlayerSpeech} from '@/data/player-speech';
import type {RoomAction} from '@/lib/rooms';
type ChatReply={chat?:PrivateChat|null;speech?:PlayerSpeech;serverTime:number};
export type ConnectionState={status:'off'|'connecting'|'online'|'retrying'|'other'|'login'|'full';room:number;count:number;scene?:TownSceneId};
function nearbySpawn(p:{x:number;z:number}):SpawnId|undefined{return (Object.keys(walkSpawns) as SpawnId[]).find(id=>Math.hypot(p.x-walkSpawns[id][0],p.z-walkSpawns[id][1])<2);}
export function useTownPresence(runtime:MutableRefObject<PresenceRuntime>,userId:string|undefined,enabled:boolean,scene:TownSceneId='town'){
  const desiredScene=useRef(scene);if(desiredScene.current!==scene){desiredScene.current=scene;runtime.current.remoteResidents=[];}
  const [state,setState]=useState<ConnectionState>({status:'off',room:0,count:0}),[attempt,setAttempt]=useState(0),takeover=useRef(false);
  const [notice,setNotice]=useState('');
  useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),10000);return()=>clearTimeout(timer);},[notice]);
  const [chat,setChat]=useState<PrivateChat|null>(null),channel=useRef<((action:ChatAction)=>Promise<ChatReply>)|null>(null);
  const roomChannel=useRef<((action:RoomAction)=>Promise<void>)|null>(null),[roomVersion,setRoomVersion]=useState(0);
  const updateChat=(next:PrivateChat|null)=>setChat(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
  useEffect(()=>{
    setChat(null);channel.current=null;roomChannel.current=null;
    runtime.current.remoteResidents=[];
    if(!enabled||!userId){setState({status:'off',room:0,count:0});return;}
    let owner:string=crypto.randomUUID(),stopped=false,joined=false,healthy=false,seq=0,timer:ReturnType<typeof setTimeout>|undefined,lastDestination=runtime.current.lastDestination,failures=0,chatRevision=0,chatWrites=0,roomBusy=false,tickInFlight:Promise<void>=Promise.resolve();
    let currentScene:TownSceneId|undefined,lastRuntime=runtime.current,pendingScene:{op:'scene';owner:string;newOwner:string;scene:TownSceneId;spawn?:string}|null=null;
    channel.current=async(action)=>{
      if(stopped||!joined||!healthy||roomBusy||currentScene!==desiredScene.current||pendingScene)throw new Error('请等待场景连接恢复后再发送');
      const sentOwner=owner;
      const sentScene=currentScene;
      chatRevision++;chatWrites++;
      try{
        const response=await fetch('/api/town/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...action,owner}),signal:AbortSignal.timeout(5000)});
        const data=await response.json();
        if(stopped||sentOwner!==owner||sentScene!==desiredScene.current)throw new Error('已离开原来的房间或场景');
        if(!response.ok)throw new Error(data.error||'发送未成功，请稍后重试');
        const reply=data as ChatReply;
        if(reply.speech?.expiresAt)reply.speech={...reply.speech,expiresAt:Date.now()+Math.max(0,reply.speech.expiresAt-reply.serverTime)};
        if(Object.hasOwn(reply,'chat'))updateChat(reply.chat??null);
        return reply;
      }finally{chatWrites--;chatRevision++;}
    };
    let force=takeover.current;takeover.current=false;
    const leave=(lease=owner)=>{void fetch('/api/town/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'leave',owner:lease}),keepalive:true}).catch(()=>{});};
    const apply=(pose:TownPose)=>{
      const p=runtime.current.player;p.x=pose.x;p.z=pose.z;p.yaw=pose.yaw;p.moving=false;
      p.seat=pose.seat===null?null:{index:pose.seat,returnX:pose.x,returnZ:pose.z+1.4};
    };
    const applySnapshot=(snapshot:PresenceSnapshot)=>{
      currentScene=snapshot.scene;
      if(snapshot.scene!==desiredScene.current)return;
      const r=runtime.current;
      r.remoteResidents=snapshot.peers.map(peer=>({...peer,speech:peer.speech?{...peer.speech,expiresAt:Date.now()+Math.max(0,(peer.speech.expiresAt??0)-snapshot.serverTime)}:null}));
      setState(s=>s.status==='online'&&s.room===snapshot.room&&s.count===snapshot.count&&s.scene===snapshot.scene?s:{status:'online',room:snapshot.room,count:snapshot.count,scene:snapshot.scene});
    };
    roomChannel.current=async action=>{
      if(stopped||roomBusy)throw new Error('正在处理房间操作，请稍等');
      roomBusy=true;clearTimeout(timer);await tickInFlight;clearTimeout(timer);
      const newOwner=crypto.randomUUID(),payload={op:'room',owner,newOwner,...action};
      try{
        let response:Response|undefined;
        for(let attempt=0;attempt<2;attempt++)try{response=await fetch('/api/town/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});break;}catch{if(attempt===1){if(['enter','create'].includes(action.action))owner=newOwner;joined=false;healthy=false;seq=0;throw new Error('房间操作结果暂未确认，正在重新连接');}}
        const data=await response!.json();
        if(stopped){if(response!.ok)void fetch('/api/town/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({op:'leave',owner:data.owner}),keepalive:true});throw new Error('已离开小镇');}
        if(!response!.ok)throw new Error(data.error||'暂时无法切换房间');
        const previous=owner;owner=data.owner;
        if(data.changed){chatRevision++;setChat(null);runtime.current.remoteResidents=[];setRoomVersion(v=>v+1);}
        if(previous!==owner)seq=0;
        if(data.snapshot){joined=true;healthy=true;failures=0;applySnapshot(data.snapshot);if(data.changed&&data.snapshot.scene===desiredScene.current){apply(data.snapshot.self);runtime.current.player.exists=true;lastDestination=runtime.current.lastDestination;}}
        else{joined=false;healthy=false;seq=0;setState({status:'connecting',room:0,count:0});}
      }finally{roomBusy=false;if(!stopped)timer=setTimeout(kick,POLL_MS);}
    };
    const kick=()=>{if(!roomBusy&&!stopped)tickInFlight=run();};
    const run=async()=>{
      if(stopped||roomBusy)return;
      const r=runtime.current,p=r.player,wasJoined=joined,sentDestination=r.lastDestination,sentChatRevision=chatRevision;
      const requestedScene=desiredScene.current;
      // Account/detail pages park the lease; returning restores server-validated exact pose.
      const returningFromPrivate=joined&&currentScene==='account'&&requestedScene!=='account';
      const destination=returningFromPrivate?undefined:requestedScene==='town'?nearbySpawn(p):r.presenceSpawn;
      const spawn=!joined||currentScene!==requestedScene||sentDestination!==lastDestination||r!==lastRuntime?destination:undefined;
      if(joined&&currentScene!==requestedScene&&!pendingScene){
        pendingScene={op:'scene',owner,newOwner:crypto.randomUUID(),scene:requestedScene,...(spawn?{spawn}:{})};
        chatRevision++;setChat(null);r.remoteResidents=[];setRoomVersion(v=>v+1);
      }
      const transfer=pendingScene;
      const payload=transfer??(joined?{op:'tick',owner,scene:requestedScene,seq:++seq,pose:{x:p.x,z:p.z,yaw:p.yaw,moving:p.moving,seat:p.seat?.index??null},...(spawn?{spawn}:{})}:{op:'join',owner,scene:requestedScene,...(spawn?{spawn}:{}),takeover:force});
      if(!joined)force=false;
      let nextDelay=document.hidden?1000:POLL_MS;
      try{
        const response=await fetch('/api/town/presence',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(5000)});
        const data=await response.json();
        if(stopped){if(response.ok)leave(data.owner??owner);return;}
        if(response.status===409){pendingScene=null;joined=false;healthy=false;setChat(null);seq=0;r.remoteResidents=[];setState(s=>({...s,status:'other',count:0}));timer=setTimeout(kick,2000);return;}
        if(response.status===423){joined=false;healthy=false;setChat(null);r.remoteResidents=[];setState({status:'full',room:0,count:0});timer=setTimeout(kick,5000);return;}
        if(response.status===401||response.status===403){healthy=false;setChat(null);r.remoteResidents=[];setState(s=>({...s,status:'login',count:0}));return;}
        if(response.status===410){pendingScene=null;currentScene=undefined;owner=crypto.randomUUID();chatRevision++;setNotice(data.error||'正在重新连接');setRoomVersion(v=>v+1);joined=false;seq=0;throw new Error('expired');}
        if(!response.ok)throw new Error(data.error||'connection');
        if(transfer){owner=data.owner;seq=0;pendingScene=null;}
        const snapshot=(transfer?data.snapshot:data) as PresenceSnapshot;
        joined=true;healthy=true;failures=0;lastDestination=sentDestination;
        applySnapshot(snapshot);
        if(snapshot.scene!==desiredScene.current||r!==runtime.current){timer=setTimeout(kick,0);return;}
        lastRuntime=r;
        if(!chatWrites&&(transfer||sentChatRevision===chatRevision))updateChat(snapshot.chat);
        // Do not apply a reply to a navigation that happened after the request was sent.
        if(snapshot.corrected&&r.lastDestination===sentDestination)apply(snapshot.self);
        if(!wasJoined)r.player.exists=true;
      }catch{
        if(stopped)return;
        healthy=false;failures++;r.remoteResidents=[];setChat(null);setState(s=>({...s,status:'retrying',count:0}));nextDelay=Math.min(4000,500*2**Math.min(failures,3));
      }
      if(!stopped&&!roomBusy)timer=setTimeout(kick,nextDelay);
    };
    const pagehide=()=>{leave();};
    window.addEventListener('pagehide',pagehide);
    setState({status:'connecting',room:0,count:0});kick();
    return()=>{stopped=true;channel.current=null;roomChannel.current=null;clearTimeout(timer);window.removeEventListener('pagehide',pagehide);runtime.current.remoteResidents=[];leave();};
  },[runtime,userId,enabled,attempt]);
  const changing=state.status==='online'&&state.scene!==scene;
  return {state:changing?{...state,status:'connecting' as const}:state,chat:changing?null:chat,notice,roomVersion,roomAct:async(action:RoomAction)=>{if(!roomChannel.current)throw new Error('请先登录并进入小镇');await roomChannel.current(action);},act:async(action:ChatAction)=>{if(!channel.current)throw new Error('登录并进入在线小镇后才可以聊天');return channel.current(action);},retry:()=>{takeover.current=true;setAttempt(n=>n+1);}};
}
