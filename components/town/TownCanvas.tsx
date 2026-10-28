"use client";
import TownOnlineResidents from './TownOnlineResidents';
import type {PlayerSpeech} from "@/data/player-speech";

import { Component, Suspense, useCallback, useEffect, useState, type ReactNode, type MutableRefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PCFShadowMap } from "three";
import { townConfig } from "@/data/town-config";
import type { CameraCommand } from "@/types/town";
import TownScene from "./TownScene";
import TownControls from "./TownControls";
import WalkControls,{type WalkInput,type WalkDestination} from "./WalkControls";
import BenchInteraction from "./BenchInteraction";
import type {TownRuntime,BenchPrompt} from "@/data/town-runtime";
import NpcInteraction,{TownSimulation} from "./NpcInteraction";
import TownPlayer from "./TownPlayer";
import { activeSkin } from "@/data/skins";
import TownSky from "./TownSky";
import ServiceEntrance from "./ServiceEntrance";
import DistrictEntries from "./DistrictEntries";
import type {DistrictEntryId} from "@/data/district-entries";

function Unavailable() {
  return <div className="scene-unavailable" role="alert"><span className="fallback-icon">≈</span><h2>暂时无法显示 3D 场地</h2><p>请开启浏览器硬件加速，或使用支持 WebGL 的浏览器查看。</p><p>当前规划：七个街区、主入口与公共步行空间。</p><button onClick={() => window.location.reload()}>重新加载</button></div>;
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <Unavailable /> : this.props.children; }
}

function SceneLifecycle({ ready, onLost }: { ready: () => void; onLost: () => void }) {
  const { gl } = useThree();
  useEffect(() => {
    ready();
    const canvas = gl.domElement;
    const lost = (event: Event) => { event.preventDefault(); onLost(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, ready, onLost]);
  return null;
}

export default function TownCanvas({ command, onReady,walking,paused,blocked=false,input,destination,runtime,view,speech,entered,nearestId,onNearest,onTalk,benchPrompt,onBench,onInteract,onEntryNear,onEnterDistrict,onServiceOpen,serviceRecommendation }: { command: CameraCommand; onReady: () => void;walking:boolean;paused:boolean;blocked?:boolean;input:MutableRefObject<WalkInput>;destination:{id:WalkDestination;serial:number};runtime:MutableRefObject<TownRuntime>;view:"third"|"first";speech:PlayerSpeech|null;entered:boolean;nearestId:string|null;onNearest:(id:string|null)=>void;onTalk:()=>void;benchPrompt:BenchPrompt|null;onBench:(prompt:BenchPrompt|null)=>void;onInteract:()=>void;onEntryNear:(id:DistrictEntryId|null)=>void;onEnterDistrict:(id:DistrictEntryId)=>void;onServiceOpen:()=>void;serviceRecommendation:string }) {
  const [lost, setLost] = useState(false);
  const [animate,setAnimate]=useState(false);
  useEffect(()=>{
    const motion=window.matchMedia("(prefers-reduced-motion: reduce)");
    const update=()=>setAnimate(!motion.matches && !document.hidden);
    update();motion.addEventListener("change",update);document.addEventListener("visibilitychange",update);
    return()=>{motion.removeEventListener("change",update);document.removeEventListener("visibilitychange",update);};
  },[]);
  const onLost = useCallback(() => setLost(true), []);
  return <SceneBoundary>{lost ? <Unavailable /> : <Canvas
    camera={{ position: townConfig.camera.position, near: .1, far: 10000, fov:35 }}
    dpr={[1, 1.5]} frameloop={animate||walking?"always":"demand"} shadows={{ type: PCFShadowMap }}
    gl={{ antialias: true, powerPreference: "default" }} fallback={<span aria-hidden="true">你的浏览器不支持画布。</span>}
    aria-label="五六零AI小镇三维场景" tabIndex={paused?-1:0} aria-hidden={paused?true:undefined}
  >
    <color attach="background" args={[activeSkin.palette.background]} />
    <Suspense fallback={null}><TownSky walking={walking}/></Suspense>
    <TownSimulation runtime={runtime} animate={animate} onNearest={onNearest} onBench={onBench}/>
    <TownOnlineResidents runtime={runtime}/><TownScene animate={animate} runtime={runtime} walking={walking}/>
    <DistrictEntries runtime={runtime} animate={animate} walking={walking} paused={paused||blocked} onNear={onEntryNear} onEnter={onEnterDistrict}/>
    <ServiceEntrance runtime={runtime} paused={paused||blocked} walking={walking} onOpen={onServiceOpen} recommendation={serviceRecommendation}/>
    {entered&&<TownPlayer runtime={runtime} walking={walking} view={view} speech={speech}/>}
    {walking&&!paused&&!blocked&&<BenchInteraction prompt={benchPrompt} onInteract={onInteract}/>}
    {walking&&!paused&&!blocked&&<NpcInteraction runtime={runtime} id={nearestId} onTalk={onTalk}/>}
    {walking?<WalkControls paused={paused||blocked} input={input} destination={destination} runtime={runtime} view={view}/>:<TownControls command={command} runtime={runtime} welcome={paused} enabled={!blocked} />}
    <SceneLifecycle ready={onReady} onLost={onLost} />
  </Canvas>}</SceneBoundary>;
}



