import {townDistance as S} from '@/data/town-scale';
import {useFrame} from "@react-three/fiber";
import {useMemo,useRef} from "react";
import {Shape,type Group} from "three";
import {Disk} from "./primitives";
import ReliefText from "./ReliefText";
import {activeSkin} from "@/data/skins";

function WaveIcon(){
 const shapes=useMemo(()=>{
  const body=new Shape().moveTo(-3.6,0)
   .bezierCurveTo(-2.4,.6,-1.9,1.7,-1.3,3)
   .bezierCurveTo(-.5,5.3,1.5,5.7,3.1,4.4)
   .bezierCurveTo(2.1,4.85,.7,4.3,.95,3.2)
   .bezierCurveTo(1.1,2.45,2.1,2.3,2.5,3.1)
   .bezierCurveTo(3,2.4,2.8,1.8,2.1,1.5)
   .bezierCurveTo(1.5,1.1,2.6,.5,3.6,0).closePath();
  const foam=new Shape().moveTo(-1.3,3)
   .bezierCurveTo(-.5,5.3,1.5,5.7,3.1,4.4)
   .bezierCurveTo(2.65,4.55,2.35,4.48,2.03,4.28)
   .bezierCurveTo(1.85,4.64,1.5,4.68,1.26,4.38)
   .bezierCurveTo(1.02,4.77,.6,4.65,.49,4.27)
   .bezierCurveTo(.15,4.56,-.16,4.29,-.19,3.98)
   .bezierCurveTo(-.59,4.1,-.99,3.45,-1.3,3).closePath();
  const swash=new Shape().moveTo(-3.45,.05)
   .bezierCurveTo(-2.1,.8,-1.05,1.6,-.65,2.7)
   .bezierCurveTo(-.2,3.85,.24,4.03,.85,4.14)
   .bezierCurveTo(-.02,3.45,.15,2.31,.98,1.92)
   .bezierCurveTo(1.65,1.45,2.8,.8,3.46,.05).closePath();
  return {body,foam,swash};
 },[]);
 return <group position={[0,2.54,-1.22]} name="coastal-wave-icon">
  <mesh castShadow><extrudeGeometry args={[shapes.body,{depth:.65,bevelEnabled:true,bevelSize:.07,bevelThickness:.06,bevelSegments:3,curveSegments:28}]}/><meshStandardMaterial color="#159ccc" roughness={.36} metalness={.12}/></mesh>
  {/* Colour layers on both faces keep the sculpture finished throughout its rotation. */}
  {[{z:.72,depth:.045},{z:-.11,depth:.045}].map(({z,depth})=><group key={z} position={[0,0,z]}>
   <mesh><extrudeGeometry args={[shapes.swash,{depth,bevelEnabled:false,curveSegments:28}]}/><meshStandardMaterial color="#44cbd1" roughness={.4} metalness={.08}/></mesh>
   <mesh position={[0,0,.003]}><extrudeGeometry args={[shapes.foam,{depth:depth+.025,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2,curveSegments:28}]}/><meshStandardMaterial color="#f5fcff" roughness={.35} metalness={.06}/></mesh>
  </group>)}
 </group>;
}

export default function TownSculpture({animate}:{animate:boolean}){
 const sculpture=useRef<Group>(null);
 useFrame((_,delta)=>{if(animate&&sculpture.current)sculpture.current.rotation.y=(sculpture.current.rotation.y+Math.min(delta,.05)*Math.PI*2/80)%(Math.PI*2);});
 const blue=activeSkin.palette.glass;
 return <group position={[0,0,S(4)]} name="560-coastal-sculpture">
  <group ref={sculpture} name="560-and-wave-rotating-ensemble">
   <Disk position={[0,1.96,0]} radius={4.15} height={.44} color={blue}/><Disk position={[0,2.22,0]} radius={4.1} height={.13} color="#f8fcff"/>
   <Disk position={[0,2.35,0]} radius={3.55} height={.16} color={blue}/><Disk position={[0,2.46,0]} radius={3.5} height={.09} color="#f8fcff"/>
   <WaveIcon/>
   <group position={[0,2.53,.15]}>
    <ReliefText text="560" width={8.45} height={4.1} depth={.85} color="#dcebf3" side="#c4e2f0" anchor="bottom"/>
    <ReliefText text="560" width={8.2} height={3.95} depth={.09} color={blue} side={blue} position={[0,.075,.86]} anchor="bottom"/>
    <ReliefText text="560" width={8.2} height={3.95} depth={.09} color={blue} side={blue} position={[0,.075,-.1]} anchor="bottom"/>
   </group>
  </group>
 </group>;
}
