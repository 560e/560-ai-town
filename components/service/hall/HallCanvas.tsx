"use client";
import {WALK_SPEED,RUN_SPEED} from '@/data/walking-speed';
import {Component,useCallback,useEffect,useRef,useState,type MutableRefObject,type ReactNode} from 'react';
import {Canvas,useFrame,useThree} from '@react-three/fiber';
import {PCFSoftShadowMap,PerspectiveCamera} from 'three';
import TownPlayer from '@/components/town/TownPlayer';
import {moveHall,nearestHallStation,type HallRuntime,type HallStationId} from '@/data/service-hall';
import {initialHallCameraDistance,zoomHallCamera,resolveHallCamera} from '@/data/service-hall-camera';
import type {PublicTitle} from '@/lib/service';
import HallScene from './HallScene';
import HallOnlineResidents from './HallOnlineResidents';
import type {PlayerSpeech} from '@/data/player-speech';
export type HallInput={x:number;y:number};
type Props={scene?:ReactNode;label?:string;runtime:MutableRefObject<HallRuntime>;input:MutableRefObject<HallInput>;paused:boolean;speech:PlayerSpeech|null;reset:number;compact:boolean;titles:PublicTitle[];onStation:(id:HallStationId)=>void;onNear:(id:HallStationId|null)=>void;onReady:()=>void;onFailure:()=>void};
class HallBoundary extends Component<{children:ReactNode;onFailure:()=>void},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}componentDidCatch(){this.props.onFailure();}render(){return this.state.failed?<div className="hall-render-fallback">3D画面暂不可用，请使用上方服务面板继续办理。</div>:this.props.children;}}
function Controller({runtime,input,paused,reset,onNear,onReady,onFailure,onCloseCamera}:Props&{onCloseCamera:(close:boolean)=>void}){
 const {gl,camera,size}=useThree(),keys=useRef(new Set<string>()),last=useRef<HallStationId|null>(null),closeCamera=useRef(false);
 const orbit=useRef({distance:initialHallCameraDistance(size.width/size.height),elevation:.24,yaw:0});
 useEffect(()=>{const canvas=gl.domElement;canvas.tabIndex=0;canvas.setAttribute('aria-label','大厅画面，WASD移动，拖动旋转，滚轮缩放，E互动');canvas.focus({preventScroll:true});onReady();const lost=(event:Event)=>{event.preventDefault();onFailure();};canvas.addEventListener('webglcontextlost',lost);return()=>canvas.removeEventListener('webglcontextlost',lost);},[gl,onReady,onFailure]);
 useEffect(()=>{if(camera instanceof PerspectiveCamera){camera.fov=size.width/size.height<.85?75:68;camera.updateProjectionMatrix();}},[size.width,size.height,camera]);
 useEffect(()=>{
  const canvas=gl.domElement,pointers=new Map<number,{x:number;y:number}>();
  const clear=()=>{keys.current.clear();input.current={x:0,y:0};runtime.current.player.moving=false;for(const id of pointers.keys()){if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);}pointers.clear();};
  const down=(e:KeyboardEvent)=>{if(paused||runtime.current.player.typing||(e.target as HTMLElement)?.closest('input,textarea,select,button,a,[role=dialog]'))return;const key=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(key)){e.preventDefault();keys.current.add(key);}};
  const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
  const pd=(e:PointerEvent)=>{if(paused||e.button!==0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});};
  const pm=(e:PointerEvent)=>{const before=pointers.get(e.pointerId);if(!before||paused)return;const other=[...pointers.entries()].find(([id])=>id!==e.pointerId)?.[1];if(other){const oldGap=Math.hypot(before.x-other.x,before.y-other.y),newGap=Math.hypot(e.clientX-other.x,e.clientY-other.y);if(oldGap>0&&newGap>0)orbit.current.distance=zoomHallCamera(orbit.current.distance,Math.log(oldGap/newGap)/.0015);}else{orbit.current.yaw-=(e.clientX-before.x)*.004;orbit.current.elevation=Math.max(-.08,Math.min(.55,orbit.current.elevation+(e.clientY-before.y)*.003));}pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});};
  const pu=(e:PointerEvent)=>pointers.delete(e.pointerId);
  const wheel=(e:WheelEvent)=>{if(paused)return;e.preventDefault();orbit.current.distance=zoomHallCamera(orbit.current.distance,e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?size.height:1));};
  window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('blur',clear);document.addEventListener('visibilitychange',clear);
  canvas.addEventListener('pointerdown',pd);canvas.addEventListener('pointermove',pm);canvas.addEventListener('pointerup',pu);canvas.addEventListener('pointercancel',pu);canvas.addEventListener('lostpointercapture',pu);canvas.addEventListener('wheel',wheel,{passive:false});
  return()=>{clear();window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('blur',clear);document.removeEventListener('visibilitychange',clear);canvas.removeEventListener('pointerdown',pd);canvas.removeEventListener('pointermove',pm);canvas.removeEventListener('pointerup',pu);canvas.removeEventListener('pointercancel',pu);canvas.removeEventListener('lostpointercapture',pu);canvas.removeEventListener('wheel',wheel);};
 },[paused,reset,runtime,input,gl,size.height]);
 useFrame((_,delta)=>{
  const p=runtime.current.player;if(paused||p.typing){keys.current.clear();input.current={x:0,y:0};p.moving=false;return;}
  const o=orbit.current;
  p.lookYaw=o.yaw;
  const k=keys.current;let x=input.current.x+(k.has('d')||k.has('arrowright')?1:0)-(k.has('a')||k.has('arrowleft')?1:0),z=input.current.y+(k.has('s')||k.has('arrowdown')?1:0)-(k.has('w')||k.has('arrowup')?1:0);const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}
  const speed=(k.has('shift')?RUN_SPEED:WALK_SPEED)*Math.min(delta,.045),oldX=p.x,oldZ=p.z;
  moveHall(p,(x*Math.cos(o.yaw)+z*Math.sin(o.yaw))*speed,(-x*Math.sin(o.yaw)+z*Math.cos(o.yaw))*speed);
  const distance=Math.hypot(p.x-oldX,p.z-oldZ);p.moving=distance>.001;if(p.moving){p.stride+=distance;p.yaw=Math.atan2(p.x-oldX,p.z-oldZ);}
  const resolved=resolveHallCamera({x:p.x,z:p.z,seated:!!p.seat},o);
  camera.position.set(resolved.position.x,resolved.position.y,resolved.position.z);camera.lookAt(resolved.target.x,resolved.target.y,resolved.target.z);
  const close=resolved.distance<1.5;if(close!==closeCamera.current){closeCamera.current=close;onCloseCamera(close);}
  const near=nearestHallStation(p)?.id||null;if(near!==last.current){last.current=near;onNear(near);}
 },-2);
 return null;
}
export default function HallCanvas(props:Props){
 const [closeCamera,setCloseCamera]=useState(false);
 const [visible,setVisible]=useState(true);useEffect(()=>{const update=()=>setVisible(!document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update);},[]);
 const failed=useCallback(()=>props.onFailure(),[props.onFailure]);
 return <HallBoundary onFailure={failed}><Canvas camera={{position:[0,2.9,11.2],fov:68,near:.1,far:240}} dpr={props.compact?1:[1,1.5]} shadows={props.compact?false:{type:PCFSoftShadowMap}} frameloop={!props.paused&&visible?'always':'demand'} gl={{antialias:!props.compact,powerPreference:'default'}} aria-label={props.label||"服务中心3D互动大厅"} tabIndex={props.paused?-1:0} fallback={<span aria-hidden="true">当前浏览器无法显示3D。</span>}>
  <color attach="background" args={['#e5f0f4']}/>
  <hemisphereLight args={['#eef9ff','#cebea1',2.2]}/><directionalLight position={[-4,6.8,4]} intensity={1.5} castShadow={!props.compact} shadow-mapSize={[1024,1024]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={24} shadow-camera-bottom={-24} shadow-normalBias={.08}/>
  {props.scene??<HallScene titles={props.titles} onStation={props.onStation}/>}<TownPlayer runtime={props.runtime} walking view={closeCamera?'first':'third'} speech={props.speech} floor={.13}/><HallOnlineResidents runtime={props.runtime}/>
  <Controller {...props} onCloseCamera={setCloseCamera}/>
 </Canvas></HallBoundary>;
}



