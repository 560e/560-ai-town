import {townDistance as S} from '@/data/town-scale';
import {useLayoutEffect,useRef,type MutableRefObject} from "react";
import {OrbitControls} from "@react-three/drei";
import {useThree} from "@react-three/fiber";
import type {OrbitControls as OrbitControlsImpl} from "three-stdlib";
import {PerspectiveCamera,Vector3} from "three";
import {townConfig} from "@/data/town-config";
import type {CameraCommand} from "@/types/town";
import type {TownRuntime} from '@/data/town-runtime';
export default function TownControls({command,runtime,enabled=true,welcome=false}:{command:CameraCommand;runtime:MutableRefObject<TownRuntime>;enabled?:boolean;welcome?:boolean}){
 const controls=useRef<OrbitControlsImpl>(null),last=useRef<CameraCommand|null>(null),appliedDistance=useRef<number|null>(null);
 const initialPose=useRef(runtime.current.overviewCamera);
 const {camera,size,invalidate}=useThree();
 // Fit the whole town into the space beside the introduction, without moving world geometry.
 const previewOnRight=welcome&&size.width>760;
 const previewLeft=previewOnRight?Math.min(554,size.width*.44)+Math.min(104,Math.max(28,size.width*.06))-32:0;
 const previewWidth=previewOnRight?Math.max(260,size.width-previewLeft-28):size.width;
 const offsetX=previewOnRight?(previewLeft+previewWidth/2)-size.width/2:0;
 const verticalFit=Math.max(.32,(size.height-130)/size.height),horizontalFit=Math.max(.5,(previewWidth-80)/previewWidth);
 const fitDistance=(size.width>760?1.08:1)*Math.max(S(146)/(2*Math.tan(35*Math.PI/360)*(previewWidth/size.height)*horizontalFit),S(107)/(2*Math.tan(35*Math.PI/360)*verticalFit));
 useLayoutEffect(()=>{if(!(camera instanceof PerspectiveCamera)||!controls.current)return;const control=controls.current;
 const changed=last.current?.serial!==command.serial||last.current?.type!==command.type;
 const target=new Vector3(...townConfig.camera.target),direction=camera.position.clone().sub(control.target);let distance=fitDistance;
 if(!last.current&&initialPose.current){direction.set(...initialPose.current.position).sub(target);distance=direction.length()/initialPose.current.fitDistance*fitDistance;}
 else if(changed&&(command.type==="reset"||command.type==="plan")){direction.set(...(command.type==="plan"?[0,140,.01] as [number,number,number]:townConfig.camera.position));if(command.type==="plan")distance*=1.12;}
 else if(appliedDistance.current){distance=direction.length()/appliedDistance.current*fitDistance;if(changed)distance*=command.type==="zoom-in"?1/1.2:1.2;}
 else direction.set(...townConfig.camera.position);
 distance=Math.max(fitDistance*.18,Math.min(fitDistance*1.45,distance));
 camera.position.copy(target).add(direction.normalize().multiplyScalar(distance));camera.zoom=1;camera.fov=35;
 if(previewOnRight)camera.setViewOffset(size.width,size.height,-offsetX,0,size.width,size.height);else camera.clearViewOffset();
 camera.updateProjectionMatrix();control.target.copy(target);control.update();appliedDistance.current=fitDistance;last.current=command;invalidate();
 },[camera,command,fitDistance,invalidate,previewOnRight,offsetX,size.width,size.height]);
 useLayoutEffect(()=>()=>{if(camera instanceof PerspectiveCamera){camera.clearViewOffset();camera.updateProjectionMatrix();}},[camera]);
 return <OrbitControls enabled={enabled} ref={controls} makeDefault target={townConfig.camera.target} enablePan={false} enableZoom={!welcome} enableDamping dampingFactor={.12} rotateSpeed={.5} zoomSpeed={.8} minPolarAngle={.01} maxPolarAngle={Math.PI/2.15} minDistance={fitDistance*.18} maxDistance={fitDistance*1.45} onChange={()=>{runtime.current.overviewCamera={position:[camera.position.x,camera.position.y,camera.position.z],fitDistance};invalidate();}}/>;
}
