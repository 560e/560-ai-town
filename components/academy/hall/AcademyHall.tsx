"use client";
import TownReturnLink from "@/components/town/TownReturnLink";
import {queueTownReturn} from "@/data/town-navigation";
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useCallback,useEffect,useRef,useState,type PointerEvent} from 'react';
import {SceneHeader,SceneDock,ScenePanel,SceneIcon} from '@/components/scene/SceneChrome';
import SceneOptions from '@/components/scene/SceneOptions';
import SiteFooter from '@/components/site/SiteFooter';
import {useAccount} from '@/components/account/AccountProvider';
import {arriveCampus,createCampusRuntime,nearestCampusStation,sitCampus,standCampus,type CampusStationId} from '@/data/academy-campus';
import AcademyPanel from './AcademyPanel';
import AcademyScene from './AcademyScene';
import {academyStations,type AcademyPanel as AcademyPanelView} from '@/data/academy-hall';
import type {HallInput} from './AcademyCanvas';
import {useScenePresence} from '@/components/town/TownPresenceProvider';
import PlayerChat from '@/components/town/PlayerChat';
import PrivateChat,{nearbyResident} from '@/components/town/PrivateChat';
import RoomPicker from '@/components/town/RoomPicker';
import {sceneLineClear} from '@/lib/town-scenes';
import {SPEECH_DURATION,type PlayerSpeech} from '@/data/player-speech';
const hallLineClear=(a:{x:number;z:number},b:{x:number;z:number})=>sceneLineClear('learning-campus',a,b);
const HallCanvas=dynamic(()=>import('./AcademyCanvas'),{ssr:false,loading:()=> <div className="hall-loading">正在打开学院校园…</div>});
export default function AcademyHall(){
 const root=useRef<HTMLElement>(null);
 const router=useRouter(),account=useAccount(),runtime=useRef(createCampusRuntime()),input=useRef<HallInput>({x:0,y:0}),[reset,setReset]=useState(0),[ready,setReady]=useState(false),[failed,setFailed]=useState(false),[compact,setCompact]=useState(false),[near,setNear]=useState<CampusStationId|null>(null),[seated,setSeated]=useState(false),[panel,setPanel]=useState<AcademyPanelView|null>(null),[stick,setStick]=useState({x:0,y:0}),stickId=useRef<number|null>(null);
 const [uiPanel,setUiPanel]=useState<'navigation'|'more'|null>(null);
 const online=useScenePresence(runtime,true,'learning-campus'),[roomsOpen,setRoomsOpen]=useState(false),[composingSpeech,setComposingSpeech]=useState(false),[speech,setSpeech]=useState<PlayerSpeech|null>(null),[nearUser,setNearUser]=useState<string|null>(null),privateInvite=useRef<(()=>void)|null>(null);
 const [nearStudent,setNearStudent]=useState(false);
 const closeUi=useCallback(()=>{setUiPanel(null);requestAnimationFrame(()=>document.querySelector<HTMLCanvasElement>('[aria-label="学院3D互动校园"] canvas')?.focus());},[]),blocked=!!panel||!!uiPanel||roomsOpen||!!online.chat;
 const movementBlocked=blocked||!!account.user&&online.state.status!=='online';
 useEffect(()=>{setSpeech(null);},[online.roomVersion]);
 useEffect(()=>{if(online.state.status!=='online')setSpeech(null);},[online.state.status]);
 useEffect(()=>{if(online.chat){setUiPanel(null);setRoomsOpen(false);}},[online.chat?.id]);
 useEffect(()=>{if(!speech)return;const timer=setTimeout(()=>setSpeech(null),Math.max(0,(speech.expiresAt??Date.now()+SPEECH_DURATION)-Date.now()));return()=>clearTimeout(timer);},[speech]);
 const release=useCallback(()=>{input.current={x:0,y:0};stickId.current=null;setStick({x:0,y:0});runtime.current.player.moving=false;},[]);
 useEffect(()=>{const footer=root.current?.querySelector<HTMLElement>('.hall-footer');if(!footer)return;const observer=new ResizeObserver(()=>root.current?.style.setProperty('--site-footer-height',`${footer.offsetHeight}px`));observer.observe(footer);return()=>observer.disconnect();},[]);
 useEffect(()=>{const media=matchMedia('(max-width:760px)');const update=()=>setCompact(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 useEffect(()=>{runtime.current.player.typing=movementBlocked;release();},[movementBlocked,release]);
 useEffect(()=>{const clear=()=>release();window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);return()=>{window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);document.body.style.cursor='';};},[release]);
 const focusScene=useCallback(()=>requestAnimationFrame(()=>document.querySelector<HTMLCanvasElement>('[aria-label="学院3D互动校园"] canvas')?.focus()),[]);
 const closePanel=useCallback(()=>{setPanel(null);release();focusScene();},[release,focusScene]);
 const open=useCallback((view:AcademyPanelView)=>{release();setUiPanel(null);setPanel(view);},[release]);
 const jump=useCallback((id:CampusStationId)=>{release();arriveCampus(runtime.current.player,id);runtime.current.presenceSpawn=id;runtime.current.lastDestination++;setSeated(false);setReset(n=>n+1);setNear(nearestCampusStation(runtime.current.player)?.id||null);focusScene();},[release,focusScene]);
 const station=useCallback((id:CampusStationId)=>{if(blocked||runtime.current.player.typing)return;if(id==='exit'){release();queueTownReturn('academy');router.push('/');return;}if(id.startsWith('bench-')){if(runtime.current.player.seat){standCampus(runtime.current.player);setSeated(false);}else {arriveCampus(runtime.current.player,id);runtime.current.presenceSpawn=id;runtime.current.lastDestination++;sitCampus(runtime.current.player,id);setSeated(true);}release();setReset(n=>n+1);focusScene();return;}if(['guide','assistant','librarian','helper','announcement','library','lecture','student'].includes(id)){open(id as AcademyPanelView);return;}open(id==='mine'?'student':'catalog');},[blocked,release,router,open,focusScene]);
 useEffect(()=>{const down=(e:KeyboardEvent)=>{if(blocked||e.defaultPrevented||e.repeat||(e.target as HTMLElement)?.closest('input,textarea,select,button,a,dialog'))return;if(e.key.toLowerCase()==='e'){if(online.state.status==='online'&&nearbyResident(runtime.current,hallLineClear)){e.preventDefault();privateInvite.current?.();return;}const active=nearestCampusStation(runtime.current.player);if(active){e.preventDefault();station(active.id);}else if(nearStudent){e.preventDefault();open('student-chat');}}};window.addEventListener('keydown',down);return()=>window.removeEventListener('keydown',down);},[blocked,station,release,online.state.status,nearStudent,open]);
 const onNear=useCallback((id:CampusStationId|null)=>{setNear(id);setSeated(!!runtime.current.player.seat);},[]);
 const onReady=useCallback(()=>setReady(true),[]),onFailure=useCallback(()=>{setFailed(true);setReady(false);},[]);
 const moveStick=(e:PointerEvent<HTMLDivElement>)=>{if(stickId.current!==e.pointerId||movementBlocked||seated||runtime.current.player.typing)return;const box=e.currentTarget.getBoundingClientRect();let x=(e.clientX-box.left-box.width/2)/29,y=(e.clientY-box.top-box.height/2)/29;const size=Math.hypot(x,y);if(size>1){x/=size;y/=size;}input.current={x,y};setStick({x:x*26,y:y*26});};
 const active=academyStations.find(s=>s.id===near);
 return <main ref={root} className="hall-page scene-layout"><div className="hall-scene" inert={blocked} aria-hidden={blocked?true:undefined}>{!failed&&<HallCanvas label="学院3D互动校园" scene={<AcademyScene runtime={runtime} onNearStudent={setNearStudent} onStudentTalk={()=>open('student-chat')} onStation={station} paused={movementBlocked||composingSpeech}/>} runtime={runtime} input={input} paused={movementBlocked||composingSpeech} speech={speech} reset={reset} compact={compact} titles={[]} onStation={station} onNear={onNear} onReady={onReady} onFailure={onFailure}/>}</div>
  <div className="hall-ui" inert={blocked} aria-hidden={blocked?true:undefined}>
   <SceneHeader title="五六零AI学院" subtitle="开放校园 · 探索、学习与交流" status={<><div className="scene-connection" role="status">{account.user?<button className="scene-room-button" aria-label="切换房间" onClick={()=>setRoomsOpen(true)}><i/>{online.state.status==='online'?`房间 ${online.state.room} · ${online.state.count}/50 人`:online.state.status==='other'?'账号正在另一页面游览':online.state.status==='full'?'公共房已满 · 选择房间':online.state.status==='login'?'登录已失效':online.state.status==='retrying'?'连接中断，正在重连…':'正在连接…'}<span>⌄</span></button>:<span className="scene-guest">登录后与居民相遇</span>}</div>{['other','retrying'].includes(online.state.status)&&<button className="scene-reconnect" onClick={online.retry}>{online.state.status==='other'?'在此页面继续':'重新连接'}</button>}</>} actions={<><Link href="/account"><SceneIcon name="user"/><span>{account.user?'个人中心':'登录／注册'}</span></Link><button onClick={()=>setUiPanel('more')} aria-haspopup="dialog"><SceneIcon name="more"/><span>更多</span></button></>}/>
   <SceneDock label="学院校园操作"><PlayerChat onEditingChange={setComposingSpeech} runtime={runtime} walking={!movementBlocked} dialogOpen={blocked} resetToken={reset+online.roomVersion} release={release} onSpeech={setSpeech} availability={!account.user?'登录后可与同房间居民聊天':online.state.status!=='online'?'请等待在线连接恢复':''} sendSpeech={async text=>{const result=await online.act({op:'speak',text,messageId:crypto.randomUUID()});return result.speech!;}} docked/><button disabled={!ready||failed} onClick={()=>setUiPanel('navigation')} aria-haspopup="dialog"><SceneIcon name="map"/><span>校园导航</span></button><button className="scene-action-primary" onClick={()=>open('catalog')} aria-haspopup="dialog"><SceneIcon name="board"/><span>公开课程</span></button><button onClick={()=>open('student')} aria-haspopup="dialog"><SceneIcon name="folder"/><span>学习服务</span></button><TownReturnLink destination="academy"><SceneIcon name="back"/><span>返回小镇</span></TownReturnLink></SceneDock>
   {failed&&<div className="hall-error" role="status"><p>当前无法显示3D校园，可从公开课程查看课程目录。</p><button onClick={()=>{setFailed(false);setReset(n=>n+1);}}>重试3D画面</button></div>}
   {!failed&&<><div className="hall-joystick" role="group" aria-label="校园移动摇杆" onPointerDown={e=>{if(stickId.current!==null||seated)return;stickId.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);moveStick(e);}} onPointerMove={moveStick} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}><span style={{transform:`translate(${stick.x}px,${stick.y}px)`}}/></div>{!active&&nearStudent&&!nearUser&&!movementBlocked&&<button className="hall-interact" onClick={()=>open('student-chat')}>与学员交流 <kbd>E</kbd></button>}{active&&!nearUser&&!movementBlocked&&<button className="hall-interact" onClick={()=>station(active.id)}>{seated?'起身继续游览':active.action} <kbd>E</kbd></button>}</>}
   <SiteFooter className="hall-footer"/>
  </div>
  <PrivateChat runtime={runtime} chat={panel?null:online.chat} act={online.act} userId={account.user?.id} enabled={!blocked&&online.state.status==='online'} inviteRef={privateInvite} onNear={setNearUser} lineOfSight={hallLineClear}/>
  {roomsOpen&&<RoomPicker current={online.state.status==='online'?online.state.room:0} onAction={online.roomAct} onClose={()=>{setRoomsOpen(false);focusScene();}}/>}
  {online.notice&&!roomsOpen&&!online.chat&&<div className="private-notice" role="status">{online.notice}</div>}
  <ScenePanel returnToScene={uiPanel==='navigation'} open={!!uiPanel} title={uiPanel==='navigation'?'校园导航':'更多设置'} onClose={closeUi}>
   <div hidden={uiPanel!=='more'}><SceneOptions talking={!!panel} help={<><p>绿色标记的小人是你。WASD / 方向键移动，Shift 加速；拖动旋转，滚轮缩放。</p><p>靠近设施按 E 或点击互动，坐下后再按 E 起身。触屏使用左侧摇杆移动，单指转动镜头、双指捏合缩放。</p><p>校园导航带你到课程或学习设施旁。课程目录在校园内打开，站外课程在新标签页打开，保留校园位置与房间。</p></>}><button onClick={()=>open('guide')}>学院引导员 <span>↗</span></button><button onClick={()=>open('announcement')}>学校公告牌 <span>↗</span></button><button onClick={()=>open('classes')}>班级与合作 · 筹备中 <span>↗</span></button></SceneOptions></div>
   {uiPanel==='navigation'&&<><p className="scene-panel-intro">选择设施，抵达对应学习区。</p><nav className="scene-destination-grid" aria-label="校园目的地">{(['announcement','guide','assistant','librarian','helper','teaching','paths','mine','library','lecture','student','bench-a','bench-b','bench-c','bench-d','bench-e','bench-f'] as CampusStationId[]).map(id=><button key={id} disabled={!ready||failed} onClick={()=>{closeUi();jump(id);}}><SceneIcon name="map"/><span>{academyStations.find(s=>s.id===id)!.label}</span><small>前往设施 ↗</small></button>)}</nav></>}
  </ScenePanel>
  {panel&&<AcademyPanel view={panel} onClose={closePanel} pendingChat={!!online.chat}/>}
 </main>;
}




