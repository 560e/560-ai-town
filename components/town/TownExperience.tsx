"use client";
import dynamic from "next/dynamic";
import {useScenePresence} from "./TownPresenceProvider";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {serviceRequest} from "@/components/service/shared";
import {useAccount} from "@/components/account/AccountProvider";
import SignIn from '@/components/account/SignIn';
import {useCallback,useEffect,useRef,useState,type PointerEvent} from "react";
import PlayerChat from "./PlayerChat";
import RoomPicker from "./RoomPicker";
import PrivateChat,{nearbyResident} from "./PrivateChat";
import {SPEECH_DURATION,type PlayerSpeech} from "@/data/player-speech";
import {SceneHeader,SceneDock,ScenePanel,SceneIcon} from "@/components/scene/SceneChrome";
import SceneOptions from "@/components/scene/SceneOptions";
import TownWelcome from "./TownWelcome";
import DistrictWindow from "@/components/scene/DistrictWindow";

import SiteFooter from "@/components/site/SiteFooter";
import type {CSSProperties} from "react";
import {districtEntries,districtEntry,districtPresentation,nearbyDistrict,type DistrictEntryId} from "@/data/district-entries";
import {townConfig,walkSpawns} from "@/data/town-config";
import {createTownRuntime,nearestNpc,nearestBench,sitOnBench,standFromBench,type BenchPrompt} from "@/data/town-runtime";
import {areaNames,chooseLine,handleDialogueKey} from "@/data/npc-dialogue";
import type {CameraCommand} from "@/types/town";
import {captureTownReturn,restoreTownReturn,saveTownReturn,type TownReturnState} from "@/data/town-return";
import type {WalkInput,WalkDestination} from "./WalkControls";
const TownCanvas=dynamic(()=>import("./TownCanvas"),{ssr:false,loading:()=> <div className="scene-loading">正在展开七个街区…</div>});
const destinations:{id:WalkDestination;name:string}[]=[{id:"entrance",name:"主入口"},{id:"academy",name:"AI学院"},{id:"service",name:"服务中心"},{id:"office",name:"创业园"},{id:"retail",name:"商业街"},{id:"community",name:"AI社区"},{id:"plaza",name:"AI广场"},{id:"tasks",name:"任务广场"}];
export default function TownExperience({returnTo=null,resumeState=null,initialDistrict=null}:{initialDistrict?:DistrictEntryId|null;returnTo?:WalkDestination|null;resumeState?:TownReturnState|null}){
 const account=useAccount();
 const [pendingDistrict,setPendingDistrict]=useState<DistrictEntryId|null>(initialDistrict);
 const [districtWindow,setDistrictWindow]=useState<DistrictEntryId|null>(null);
 const router=useRouter(),[entryNear,setEntryNear]=useState<DistrictEntryId|null>(null),[serviceRecommendation,setServiceRecommendation]=useState("");
 useEffect(()=>{setServiceRecommendation('');if(account.user)void serviceRequest("/api/service").then(data=>{setServiceRecommendation(data.titles.slice(0,2).map((t:{config:{name:string}})=>t.config.name).join(" · "));}).catch(()=>{});},[account.user?.id]);

 const [footerHeight,setFooterHeight]=useState(20);
 useEffect(()=>{const footer=document.querySelector<HTMLElement>(".company-credit");if(!footer)return;const observer=new ResizeObserver(()=>setFooterHeight(footer.offsetHeight));observer.observe(footer);return()=>observer.disconnect();},[]);
 const [welcome,setWelcome]=useState(resumeState?resumeState.mode==="welcome":!returnTo);
 const [benchPrompt,setBenchPrompt]=useState<BenchPrompt|null>(null),[seatNotice,setSeatNotice]=useState("");
 const [speech,setSpeech]=useState<PlayerSpeech|null>(null);
 useEffect(()=>{if(!speech)return;const timer=setTimeout(()=>setSpeech(null),speech.expiresAt?Math.max(0,speech.expiresAt-Date.now()):SPEECH_DURATION);return()=>clearTimeout(timer);},[speech]);
 const [world]=useState(()=>{const r=createTownRuntime();if(returnTo){[r.player.x,r.player.z]=walkSpawns[returnTo];r.player.exists=true;r.player.walking=true;}if(resumeState)restoreTownReturn(r,resumeState);return r;}),runtime=useRef(world);
 const [command,setCommand]=useState<CameraCommand>({type:"reset",serial:0}),[ready,setReady]=useState(false),[walking,setWalking]=useState(resumeState?resumeState.mode==="walking":!!returnTo),[entered,setEntered]=useState(resumeState?resumeState.player.exists:!!returnTo),[view,setView]=useState<"third"|"first">(resumeState?.player.view??"third"),[nearestId,setNearestId]=useState<string|null>(null),[destination,setDestination]=useState<{id:WalkDestination;serial:number}>({id:returnTo||"entrance",serial:0});
 const online=useScenePresence(runtime,!welcome,"town");
 const privateInvite=useRef<(()=>void)|null>(null),[nearUser,setNearUser]=useState<string|null>(null);
 const [dialog,setDialog]=useState<{name:string;area:string;text:string;service?:boolean}|null>(null),lastLines=useRef<Record<string,number>>({}),dialogBox=useRef<HTMLDivElement>(null),closeButton=useRef<HTMLButtonElement>(null);
 const input=useRef<WalkInput>({x:0,y:0}),stickPointer=useRef<number|null>(null),[stick,setStick]=useState({x:0,y:0});
 const release=useCallback(()=>{stickPointer.current=null;input.current={x:0,y:0};setStick({x:0,y:0});},[]);
 const rememberTown=()=>{saveTownReturn(captureTownReturn(runtime.current,welcome?"welcome":walking?"walking":"overview"));release();runtime.current.player.moving=false;};
 const onReady=useCallback(()=>setReady(true),[]);
 const closeDialog=useCallback(()=>{runtime.current.talkingId=null;setDialog(null);setNearestId(nearestNpc(runtime.current)?.id??null);document.querySelector<HTMLElement>('[aria-label="五六零AI小镇三维场景"]')?.focus();},[]);
 const talk=useCallback(()=>{const r=runtime.current,npc=r.talkingId?r.npcs.find(n=>n.id===r.talkingId):nearestNpc(r);if(!npc||r.player.typing)return;const key=`${npc.id}:${npc.area}`,line=chooseLine(npc.area,lastLines.current[key]);lastLines.current[key]=line.index;r.talkingId=npc.id;release();setNearestId(null);setDialog({name:npc.name,area:areaNames[npc.area],text:line.text});},[release]);
 const enterDistrict=useCallback((id:DistrictEntryId)=>{const entry=districtEntry(id);if(!entry)return;release();runtime.current.player.moving=false;runtime.current.talkingId=null;setDialog(null);if(!account.user){setPendingDistrict(id);return;}saveTownReturn(captureTownReturn(runtime.current,welcome?'welcome':walking?'walking':'overview'));setPendingDistrict(null);if(districtPresentation(id)==='panel'){setDistrictWindow(id);return;}router.push(entry.href);},[account.user,release,router,welcome,walking]);
 useEffect(()=>{if(!account.loading&&!account.user&&districtWindow){setPendingDistrict(districtWindow);setDistrictWindow(null);}},[account.loading,account.user,districtWindow]);
 useEffect(()=>{if(account.user&&pendingDistrict)enterDistrict(pendingDistrict);},[account.user,pendingDistrict,enterDistrict]);
 const openService=useCallback(()=>enterDistrict("civic-hall"),[enterDistrict]);
 const interact=useCallback(()=>{
  const r=runtime.current;if(!r.player.walking||r.player.typing)return;
  if(r.talkingId==="service-guide"){enterDistrict('civic-hall');return;}
  if(r.talkingId){talk();return;}
  if(r.player.seat){const success=standFromBench(r);setSeatNotice(success?"":"旁边有人，请稍等或换个时机起身");release();return;}
  if(nearbyResident(r)){privateInvite.current?.();return;}
  const index=nearestBench(r);if(index!==null){if(sitOnBench(r,index)){setSeatNotice("");release();setNearestId(null);}return;}const entry=nearbyDistrict(r);if(entry){enterDistrict(entry.id);return;}talk();
 },[talk,release,enterDistrict,router]);
 const send=(type:CameraCommand["type"])=>setCommand(p=>({type,serial:p.serial+1}));
 const exit=useCallback(()=>{runtime.current.player.walking=false;runtime.current.player.moving=false;closeDialog();setWalking(false);setNearestId(null);setBenchPrompt(null);setSeatNotice("");release();setCommand(p=>({type:"reset",serial:p.serial+1}));},[closeDialog,release]);
 const start=(id?:WalkDestination)=>{closeDialog();release();setBenchPrompt(null);setSeatNotice("");if(id)setDestination(p=>({id,serial:p.serial+1}));runtime.current.player.exists=true;runtime.current.player.walking=true;setEntered(true);setWalking(true);};
 useEffect(()=>{const down=(e:KeyboardEvent)=>{if(welcome||!walking||runtime.current.player.typing||e.defaultPrevented||e.repeat||(e.target as HTMLElement)?.closest("input,textarea,select,button,a,summary"))return;if(e.key.toLowerCase()==="e"){e.preventDefault();interact();}if(e.key==="Escape"){e.preventDefault();if(runtime.current.talkingId)closeDialog();else exit();}};window.addEventListener("keydown",down);return()=>window.removeEventListener("keydown",down);},[welcome,walking,interact,closeDialog,exit]);
 useEffect(()=>{runtime.current.player.walking=walking&&!welcome;if(welcome){runtime.current.player.moving=false;release();}},[welcome,walking,release]);
 const dismissWelcome=()=>{exit();setWelcome(false);requestAnimationFrame(()=>document.querySelector<HTMLElement>('[aria-label="五六零AI小镇三维场景"]')?.focus());};
 const showWelcome=()=>{exit();setWelcome(true);};
 const [roomsOpen,setRoomsOpen]=useState(false),[uiPanel,setUiPanel]=useState<"more"|"navigation"|"camera"|null>(null);
 const closeUi=useCallback(()=>setUiPanel(null),[]);
 const hasPrivate=!!online.chat,controlsBlocked=hasPrivate||roomsOpen||!!uiPanel||!!pendingDistrict||!!districtWindow;
 useEffect(()=>{if(hasPrivate){setRoomsOpen(false);setUiPanel(null);}},[hasPrivate]);
 useEffect(()=>{setSpeech(null);},[online.roomVersion]);
 useEffect(()=>{if(controlsBlocked){runtime.current.talkingId=null;setDialog(null);release();runtime.current.player.moving=false;}runtime.current.player.typing=controlsBlocked;},[controlsBlocked,closeDialog,release]);
 useEffect(()=>{if(online.state.status!=="online")setSpeech(null);},[online.state.status,account.user?.id]);
 const hasDialog=!!dialog;
 useEffect(()=>{if(hasDialog)closeButton.current?.focus();},[hasDialog]);
 const updateStick=(e:PointerEvent<HTMLDivElement>)=>{if(runtime.current.player.typing||runtime.current.player.seat||runtime.current.talkingId||stickPointer.current!==e.pointerId)return;const r=e.currentTarget.getBoundingClientRect();let x=(e.clientX-r.left-r.width/2)/35,y=(e.clientY-r.top-r.height/2)/35;const l=Math.hypot(x,y);if(l>1){x/=l;y/=l;}input.current={x,y};setStick({x:x*28,y:y*28});};
 return <main style={{"--site-footer-height":`${footerHeight}px` } as CSSProperties} className={`town-app scene-layout ${walking?"is-walking":""} ${welcome?"has-welcome":""}`}>
 <div className="scene-shell" inert={controlsBlocked}><TownCanvas command={command} onReady={onReady} walking={walking} paused={welcome} blocked={controlsBlocked} input={input} destination={destination} runtime={runtime} view={view} speech={speech} entered={entered||!!account.user&&!welcome} nearestId={nearestId} onNearest={setNearestId} onTalk={talk} benchPrompt={benchPrompt} onBench={setBenchPrompt} onInteract={interact} onEntryNear={setEntryNear} onEnterDistrict={enterDistrict} onServiceOpen={openService} serviceRecommendation={serviceRecommendation}/></div>
 <div className="town-stage" inert={welcome||controlsBlocked} aria-hidden={welcome||controlsBlocked?true:undefined}>

 {walking&&view==="first"&&speech&&<div key={speech.id} className="first-person-speech" role="status">你说：{speech.text}</div>}
 <SceneHeader title={townConfig.name} subtitle={walking?'自由漫游':'全景沙盘'} status={<>
 <div className="scene-connection" role="status">{account.user?<button className="scene-room-button" aria-label="切换房间" onClick={()=>setRoomsOpen(true)}><i/>{online.state.status==="online"?`房间 ${online.state.room} · ${online.state.count}/50 人`:online.state.status==="full"?"公共房已满 · 选择房间":online.state.status==="other"?"账号正在另一页面游览":online.state.status==="login"?"登录已失效":online.state.status==="retrying"?"连接中断，正在重连…":"正在连接…"}<span>⌄</span></button>:<span className="scene-guest">游客浏览 · 登录后与居民相遇</span>}</div>
 {["other","retrying"].includes(online.state.status)&&<button className="scene-reconnect" onClick={online.retry}>{online.state.status==="other"?"在此页面继续":"重新连接"}</button>}</>} actions={<><Link href="/account" onClick={rememberTown}><SceneIcon name="user"/><span>{account.user?"个人中心":"登录／注册"}</span></Link><button onClick={()=>setUiPanel("more")} aria-haspopup="dialog"><SceneIcon name="more"/><span>更多</span></button></>}/>
 <SceneDock label={walking?'小镇步行操作':'全景沙盘操作'}>
 {!walking&&<button className="scene-action-primary" onClick={()=>start()} disabled={!ready}><SceneIcon name="walk"/><span>进入小镇</span></button>}
 <button onClick={()=>setUiPanel("navigation")} aria-haspopup="dialog"><SceneIcon name="map"/><span>{walking?'前往街区':'街区导航'}</span></button>
 <PlayerChat runtime={runtime} walking={walking&&!welcome&&!controlsBlocked} dialogOpen={!!dialog} resetToken={destination.serial} release={release} onSpeech={setSpeech} availability={!account.user?"登录后，发言可被同房间居民看到":online.state.status!=="online"?"请等待在线连接恢复":""} sendSpeech={async text=>{const result=await online.act({op:"speak",text,messageId:crypto.randomUUID()});return result.speech!;}} docked/>
 {walking?<><button onClick={()=>{const next=view==="third"?"first":"third";runtime.current.player.view=next;setView(next);}} aria-label={view==="third"?"切换第一视角":"切换跟随视角"}><SceneIcon name="view"/><span>{view==="third"?"第一视角":"跟随视角"}</span></button><button onClick={exit}><SceneIcon name="back"/><span>返回全景</span></button></>:<button onClick={()=>setUiPanel("camera")} aria-haspopup="dialog"><SceneIcon name="camera"/><span>镜头工具</span></button>}
 </SceneDock>
 {walking&&<>

 {view==="first"&&<div className="crosshair" aria-hidden="true"/>}
 {!dialog&&!benchPrompt?.seated&&<div className="joystick" role="group" aria-label="步行移动摇杆" onPointerDown={e=>{if(stickPointer.current!==null)return;stickPointer.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);updateStick(e);}} onPointerMove={updateStick} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}><span style={{transform:`translate(${stick.x}px,${stick.y}px)`}}/></div>}

 {benchPrompt&&!dialog&&!hasPrivate&&!nearUser&&<button className="nearby-talk bench-action" onClick={interact}>{benchPrompt.seated?"正在休息 · 起身":"在长凳上坐下"} <kbd>E</kbd></button>}
 {seatNotice&&walking&&benchPrompt?.seated&&<div className="seat-notice" role="status">{seatNotice}</div>}
 {entryNear&&!benchPrompt&&!dialog&&!hasPrivate&&!nearUser&&<button className="nearby-talk district-entry-action" onClick={()=>enterDistrict(entryNear)}>进入{districtEntry(entryNear)?.name} <kbd>E</kbd></button>}
 {nearestId&&!entryNear&&!benchPrompt&&!dialog&&!hasPrivate&&!nearUser&&<button className="nearby-talk" onClick={talk}>与附近居民聊聊 <kbd>E</kbd></button>}
 {dialog&&<div className="dialog-shade"><div ref={dialogBox} className="npc-dialog" role="dialog" aria-modal="true" aria-labelledby="npc-name" onKeyDown={e=>{if(handleDialogueKey(e.nativeEvent,interact,closeDialog))return;if(e.key!=="Tab")return;const buttons=dialogBox.current?.querySelectorAll("button");if(!buttons)return;if(e.shiftKey&&document.activeElement===buttons[0]){e.preventDefault();buttons[buttons.length-1].focus();}else if(!e.shiftKey&&document.activeElement===buttons[buttons.length-1]){e.preventDefault();buttons[0].focus();}}}>
 <div className="dialog-person"><span className="npc-portrait" aria-hidden="true">●</span><div><h2 id="npc-name">{dialog.name}<small>小镇居民</small></h2><span>{dialog.area}</span></div></div><p aria-live="polite">{dialog.text}</p><div className="dialog-actions"><span>{dialog.service?"身份与服务展示板":"随意聊聊，慢慢逛"}</span>{dialog.service?<button onClick={()=>enterDistrict('civic-hall')}>打开展示板 <kbd>E</kbd></button>:<button onClick={talk}>再聊一句 <kbd>E</kbd></button>}<button ref={closeButton} onClick={closeDialog}>下次见 <kbd>空格</kbd></button></div>
 </div></div>}
 </>}
 <SiteFooter className="company-credit"/>
 </div>
 <PrivateChat runtime={runtime} chat={districtWindow||pendingDistrict?null:online.chat} act={online.act} userId={account.user?.id} enabled={walking&&!welcome&&!controlsBlocked&&online.state.status==="online"} inviteRef={privateInvite} onNear={setNearUser}/>
 {online.notice&&!roomsOpen&&!hasPrivate&&!welcome&&<div className="private-notice" role="status">{online.notice}</div>}
 <ScenePanel returnToScene={uiPanel==='navigation'||uiPanel==='camera'} open={!!uiPanel&&!welcome} title={uiPanel==='navigation'?(walking?'前往街区':'街区导航'):uiPanel==='camera'?'镜头工具':'更多设置'} onClose={closeUi}>
 <div hidden={uiPanel!=='more'}><SceneOptions talking={!!dialog||welcome} help={<><p>拖动旋转 · 滚轮缩放，支持 360° 浏览。</p><p>进入小镇后：WASD / 方向键移动，Shift 加速，E 互动或起身，Enter 说话。</p><p>触屏：左侧摇杆移动，单指拖动转向，双指张开放大、捏合缩小，点击靠近时出现的按钮互动。</p><p>绿色标记是你；房间号决定与哪些居民相遇。</p></>}><button onClick={()=>{closeUi();showWelcome();}}>关于小镇 <span>↗</span></button></SceneOptions></div>
 {uiPanel==='navigation'&&<><p className="scene-panel-intro">{walking?'选择目的地，抵达对应的入口。':'选择街区，探索场景或打开版块窗口。'}</p><nav className="scene-destination-grid" aria-label={walking?'步行起点':'街区子页面'}>{walking?destinations.map(d=><button key={d.id} onClick={()=>{closeUi();start(d.id);}}><SceneIcon name="map"/><span>{d.name}</span><small>前往入口 ↗</small></button>):districtEntries.map(d=><button key={d.id} onClick={()=>{closeUi();enterDistrict(d.id);}}><SceneIcon name="map"/><span>{d.name}</span><small>进入版块 ↗</small></button>)}</nav></>}
 {uiPanel==='camera'&&<><p className="scene-panel-intro">也可以直接拖动旋转，滚轮调整远近。</p><div className="scene-tool-grid">{([{type:'zoom-in',label:'放大场地',icon:'＋'},{type:'zoom-out',label:'缩小场地',icon:'−'},{type:'plan',label:'俯视布局',icon:'▱'},{type:'reset',label:'恢复全景',icon:'↺'}] as const).map(item=><button key={item.type} disabled={!ready} onClick={()=>{send(item.type);closeUi();}}><b>{item.icon}</b>{item.label}</button>)}</div></>}
 </ScenePanel>
 {districtWindow&&<DistrictWindow id={districtWindow} onClose={()=>setDistrictWindow(null)} onService={()=>{setDistrictWindow(null);enterDistrict("civic-hall");}}/>}
 {pendingDistrict&&<ScenePanel open title={`注册／登录后进入${districtEntry(pendingDistrict)?.name||'版块'}`} onClose={()=>setPendingDistrict(null)}><p className="scene-panel-intro">游客可以在主地图自由游览。成为小镇居民后，即可进入各版块；登录成功后会继续前往刚才选择的入口。</p>{account.loading?<p role="status">正在核验账户…</p>:<SignIn/>}<button className="account-secondary" onClick={()=>setPendingDistrict(null)}>继续游览小镇</button></ScenePanel>}
 {roomsOpen&&!welcome&&<RoomPicker current={online.state.status==="online"?online.state.room:0} onAction={online.roomAct} onClose={()=>setRoomsOpen(false)}/>}
 {welcome&&<TownWelcome ready={ready} onEnter={dismissWelcome} onAccount={rememberTown}/>}
 </main>;
}



