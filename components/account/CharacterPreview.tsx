"use client";
import {Component,useRef,type ReactNode} from 'react';
import {Canvas} from '@react-three/fiber';
import {OrbitControls} from '@react-three/drei';
import TownPlayer from '@/components/town/TownPlayer';
import type {CharacterAppearance} from '@/lib/character';
import type {PlayerState} from '@/data/town-runtime';
class PreviewBoundary extends Component<{children:ReactNode},{failed:boolean}>{state={failed:false};static getDerivedStateFromError(){return {failed:true};}render(){return this.state.failed?<p className="character-preview-fallback">预览暂不可用，仍可选择并保存形象。</p>:this.props.children;}}
export default function CharacterPreview({appearance}:{appearance:CharacterAppearance}){
 const runtime=useRef<{player:PlayerState}>({player:{x:0,z:0,yaw:0,lookYaw:0,pitch:0,moving:false,exists:true,walking:false,view:'third',stride:0,typing:false,seat:null}});
 return <div className="character-preview" role="img" aria-label="角色形象3D预览，可拖动旋转"><PreviewBoundary><Canvas camera={{position:[3,2.5,4.6],fov:33}} dpr={[1,1.5]} frameloop="demand" gl={{antialias:true}} fallback={<p>仍可选择并保存形象</p>}>
  <color attach="background" args={['#eef6f4']}/><ambientLight intensity={1.6}/><directionalLight position={[3,6,5]} intensity={2}/>
  <TownPlayer runtime={runtime} walking={false} view="third" speech={null} floor={.12} appearance={appearance} preview/>
  <mesh position={[0,.02,0]}><cylinderGeometry args={[.9,1.05,.15,48]}/><meshStandardMaterial color="#cfdfd9"/></mesh>
  <OrbitControls target={[0,1.3,0]} enablePan={false} enableZoom={false} minPolarAngle={.6} maxPolarAngle={1.6}/>
 </Canvas></PreviewBoundary><span>拖动看看不同角度</span></div>;
}
