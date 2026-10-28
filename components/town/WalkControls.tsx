import {WALK_SPEED,RUN_SPEED} from '@/data/walking-speed';
import {useEffect,useRef,type MutableRefObject} from "react";
import {useFrame,useThree} from "@react-three/fiber";
import {PerspectiveCamera,Vector3} from "three";
import {buildings} from "@/data/district-plan";
import {movePlayer,type TownRuntime} from "@/data/town-runtime";
import {walkSpawns} from "@/data/town-config";
import {zoomWalkCamera,walkCameraElevation} from '@/data/walk-camera';
import {WalkGesture} from '@/data/walk-gestures';
export interface WalkInput{x:number;y:number}
export type WalkDestination=keyof typeof walkSpawns;
export default function WalkControls({input,destination,runtime,view,paused=false}:{paused?:boolean;input:MutableRefObject<WalkInput>;destination:{id:WalkDestination;serial:number};runtime:MutableRefObject<TownRuntime>;view:"third"|"first"}){
 const {gl,camera}=useThree(),keys=useRef(new Set<string>()),goal=useRef(new Vector3()),target=useRef(new Vector3());
 const zoom=useRef(runtime.current.walkZoom),distance=useRef(runtime.current.walkZoom.third);
 const gesture=useRef(new WalkGesture()),clearGesture=useRef<()=>void>(()=>{});
 useEffect(()=>{const r=runtime.current,p=r.player;if(r.lastDestination!==destination.serial){keys.current.clear();input.current={x:0,y:0};p.moving=false;p.stride=0;p.seat=null;[p.x,p.z]=walkSpawns[destination.id];p.lookYaw=0;p.yaw=Math.PI;p.pitch=.15;r.lastDestination=destination.serial;}if(camera instanceof PerspectiveCamera){camera.fov=view==="third"?56:62;camera.updateProjectionMatrix();}},[destination,input,runtime,camera,view]);
 useEffect(()=>{const canvas=gl.domElement,g=gesture.current;
 const blocked=()=>paused||runtime.current.player.typing||!!runtime.current.talkingId;
 const down=(e:KeyboardEvent)=>{if(paused||runtime.current.player.typing||runtime.current.talkingId||(e.target as HTMLElement)?.closest("input,select,textarea"))return;const k=e.key.toLowerCase();if(["w","a","s","d","arrowup","arrowdown","arrowleft","arrowright","shift"].includes(k)){e.preventDefault();document.querySelector<HTMLElement>('[aria-label="五六零AI小镇三维场景"]')?.focus();keys.current.add(k);}};
 const up=(e:KeyboardEvent)=>keys.current.delete(e.key.toLowerCase());
 const clear=()=>{keys.current.clear();input.current={x:0,y:0};const ids=g.pointerIds;g.reset();for(const id of ids)if(canvas.hasPointerCapture(id))canvas.releasePointerCapture(id);};
 clearGesture.current=clear;
 const pd=(e:PointerEvent)=>{if(blocked()){clear();return;}if(e.target!==canvas||e.button!==0)return;if(g.start(e.pointerId,e.clientX,e.clientY,e.pointerType))canvas.setPointerCapture(e.pointerId);};
 const pm=(e:PointerEvent)=>{if(blocked()){clear();return;}const change=g.move(e.pointerId,e.clientX,e.clientY),p=runtime.current.player;p.lookYaw-=change.rotateX*.004;p.pitch=Math.max(-.65,Math.min(.9,p.pitch+change.rotateY*.004));if(change.zoomDelta){e.preventDefault();zoom.current[view]=zoomWalkCamera(zoom.current[view],change.zoomDelta,view);}};
 const pu=(e:PointerEvent)=>{g.end(e.pointerId);if(canvas.hasPointerCapture(e.pointerId))canvas.releasePointerCapture(e.pointerId);};
 const cancel=(e:PointerEvent)=>{if(g.pointerIds.includes(e.pointerId))clear();};
 // Capture before the scene's click handlers; keep the guard through both releases.
 const click=(e:MouseEvent)=>{if(g.blocksClick){e.preventDefault();e.stopImmediatePropagation();}};
 const wheel=(e:WheelEvent)=>{if(paused||runtime.current.player.typing||runtime.current.talkingId)return;e.preventDefault();zoom.current[view]=zoomWalkCamera(zoom.current[view],e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1),view);};
 canvas.addEventListener('wheel',wheel,{passive:false});
 window.addEventListener("keydown",down);window.addEventListener("keyup",up);window.addEventListener("blur",clear);document.addEventListener("visibilitychange",clear);
 canvas.addEventListener("pointerdown",pd);canvas.addEventListener("pointermove",pm);canvas.addEventListener("pointerup",pu);canvas.addEventListener("pointercancel",cancel);canvas.addEventListener("lostpointercapture",cancel);canvas.addEventListener("click",click,true);canvas.addEventListener("dblclick",click,true);
 return()=>{clear();clearGesture.current=()=>{};canvas.removeEventListener('wheel',wheel);window.removeEventListener("keydown",down);window.removeEventListener("keyup",up);window.removeEventListener("blur",clear);document.removeEventListener("visibilitychange",clear);canvas.removeEventListener("pointerdown",pd);canvas.removeEventListener("pointermove",pm);canvas.removeEventListener("pointerup",pu);canvas.removeEventListener("pointercancel",cancel);canvas.removeEventListener("lostpointercapture",cancel);canvas.removeEventListener("click",click,true);canvas.removeEventListener("dblclick",click,true);};
 },[gl,input,runtime,paused,view]);
 useFrame((_,delta)=>{if(paused){clearGesture.current();runtime.current.player.moving=false;return;}const r=runtime.current,p=r.player,k=keys.current;if(r.talkingId||p.typing)clearGesture.current();const blocked=!!r.talkingId||p.typing||!!p.seat;if(blocked)k.clear();
 let x=blocked?0:input.current.x+(k.has("d")||k.has("arrowright")?1:0)-(k.has("a")||k.has("arrowleft")?1:0),z=blocked?0:input.current.y+(k.has("s")||k.has("arrowdown")?1:0)-(k.has("w")||k.has("arrowup")?1:0);
 const length=Math.hypot(x,z);if(length>1){x/=length;z/=length;}const dt=Math.min(delta,.05),speed=dt*(k.has("shift")?RUN_SPEED:WALK_SPEED),oldX=p.x,oldZ=p.z;
 movePlayer(r,(x*Math.cos(p.lookYaw)+z*Math.sin(p.lookYaw))*speed,(-x*Math.sin(p.lookYaw)+z*Math.cos(p.lookYaw))*speed);
 const moved=Math.hypot(p.x-oldX,p.z-oldZ);p.moving=moved>.001;if(p.moving){p.yaw=Math.atan2(p.x-oldX,p.z-oldZ);p.stride+=moved;}
 if(view==="first"){if(camera instanceof PerspectiveCamera&&Math.abs(camera.fov-zoom.current.first)>.01){camera.fov+=(zoom.current.first-camera.fov)*(1-Math.exp(-delta*12));camera.updateProjectionMatrix();}camera.position.set(p.x,2.9,p.z);camera.rotation.set(-p.pitch,p.lookYaw,0,"YXZ");}
 else{distance.current+=(zoom.current.third-distance.current)*(1-Math.exp(-delta*12));const back=distance.current;target.current.set(p.x,2.4,p.z);const elevation=walkCameraElevation(back,p.pitch);goal.current.set(p.x+Math.sin(p.lookYaw)*back*Math.cos(elevation),Math.max(1.6,2.4+back*Math.sin(elevation)),p.z+Math.cos(p.lookYaw)*back*Math.cos(elevation));
 // Shorten the follow camera before it crosses a building, including rotated shops.
 for(let t=.08;t<=1;t+=.04){const q=target.current.clone().lerp(goal.current,t);if(buildings.some(b=>{const w=b.rotation?b.size[1]:b.size[0],d=b.rotation?b.size[0]:b.size[1];return Math.abs(q.x-b.position[0])<w/2+.3&&Math.abs(q.z-b.position[1])<d/2+.3&&q.y<b.floors*b.floorHeight+2.4;})){goal.current.copy(target.current).lerp(goal.current,Math.max(.12,t-.06));break;}}
 camera.position.copy(goal.current);camera.lookAt(target.current);}
 },-2);return null;
}


