import {townDetail} from '@/data/town-scale';
import {districtSigns as signs} from "@/data/district-signs";
import {activeSkin} from "@/data/skins";
import {useMemo} from "react";
import {CatmullRomCurve3,Shape,Vector3} from "three";
import {RoundedBox} from "@react-three/drei";
import {Block} from "./primitives";
import TownSign from "./TownSign";
import ReliefText,{fitSign} from "./ReliefText";
export function Ribbon({points,color="#eef8ff",radius=.15,closed=false}:{points:[number,number,number][];color?:string;radius?:number;closed?:boolean}){
 const curve=useMemo(()=>new CatmullRomCurve3(points.map(p=>new Vector3(...p)),closed,"centripetal"),[points,closed]);
 return <mesh castShadow><tubeGeometry args={[curve,96,radius,10,closed]}/><meshStandardMaterial color={color} roughness={.33} metalness={.18} emissive={color} emissiveIntensity={.08}/></mesh>;
}
function Triangle({width,height,color,position}:{width:number;height:number;color:string;position:[number,number,number]}){const shape=useMemo(()=>new Shape().moveTo(-width/2,0).lineTo(width/2,0).lineTo(0,height).closePath(),[width,height]);return <mesh position={position}><extrudeGeometry args={[shape,{depth:.28,bevelEnabled:false}]}/><meshStandardMaterial color={color}/></mesh>;}
function PillSign({text,width,height,color,position}:{text:string;width:number;height:number;color:string;position:[number,number,number]}){const fit=fitSign(text,width,height);return <group position={position}><RoundedBox args={[fit.width,height,.35]} radius={.3} smoothness={4}><meshStandardMaterial color={color} roughness={.65}/></RoundedBox><ReliefText text={fit.label} width={fit.textWidth} height={fit.textHeight} depth={.1} position={[0,0,.2]}/></group>;}
const attached=(x:number,y:number,z:number,anchor:[number,number]):[number,number,number]=>{const p=townDetail([x,z],anchor);return [p[0],y,p[1]];};
export default function DistrictSigns(){
 const {service,academy,office,retail,community,plaza}=signs,blue=activeSkin.palette.glass;
 return <group name="district-identities">
 {/* Service centre: compact wall frame and a narrow projecting cornice. */}
 <Block position={attached(-41,8,-28.5,[-41,-34])} size={[service.width+.7,service.height+.48,.35]} color="#f2f8fc"/>
 <Block position={attached(-41,9.32,-28.3,[-41,-34])} size={[service.width+1,.2,.95]} color="#d7e9f3"/>
 <TownSign text={service.text} position={attached(-41,8,-28.12,[-41,-34])} width={service.maxWidth} height={service.height} color={blue}/>
 <TownSign text="AI教学楼" position={attached(0,12,-31.8,[0,-37])} width={8.5} height={1.65} color={blue}/>
 {/* Academy: a compact classical gateway, sized from the nameplate. */}
 <group position={[academy.x,0,academy.z]}>
 {[-1,1].map(side=><group key={side}>
  <Block position={[side*academy.postX,3.65,0]} size={[.9,5.3,1]} color="#f4faff"/>
  <Block position={[side*academy.postX,6.38,0]} size={[1.35,.22,1.35]} color="#d5e8f4"/>
  <Block position={[side*academy.postX,1.25,0]} size={[academy.baseWidth,.5,academy.baseDepth]} color="#d5e8f4"/>
 </group>)}
 <Block position={[0,6.5,0]} size={[academy.width+1.85,2.45,.7]} color="#f4faff"/>
 <TownSign text={academy.text} position={[0,6.5,.5]} width={academy.maxWidth} height={academy.height} color={blue}/>
 <Triangle width={academy.width*.76} height={1.05} color="#dceffb" position={[0,7.82,-.1]}/>
 <Triangle width={academy.width*.61} height={.65} color="#539bd0" position={[0,7.95,.21]}/>
 </group>
 {/* Enterprise: a shorter asymmetric frame with one full-height pier. */}
 <group position={[office.x,0,office.z]}>
 <Block position={[-office.postX,3.97,0]} size={[.8,5.94,.8]} color="#f8fcff"/>
 <Block position={[office.postX,2.75,0]} size={[.65,3.5,.8]} color="#f8fcff"/>
 <Block position={[-office.postX,4,.46]} size={[.18,5.35,.08]} color="#64bcd3"/>
 {[-1,1].map(side=><Block key={side} position={[side*office.postX,1.2,0]} size={[office.baseWidth,.4,office.baseDepth]} color="#d9eaf2"/>)}
 <Block position={[0,6.95,0]} size={[office.width+2.5,.22,1]} color="#c2dfed"/>
 <TownSign text={office.text} position={[0,5.5,.45]} width={office.maxWidth} height={office.height} color={blue}/>
 </group>
 {/* Retail: suspended plaque, slim columns and a matching short line of pennants. */}
 <group position={[retail.x,0,retail.z]}>
 {[-1,1].map(side=><group key={side}>
  <Block position={[side*retail.postX,5.25,0]} size={[.48,8.5,.55]} color="#f3fbff"/>
  <Block position={[side*retail.postX,9.6,0]} size={[.85,.2,.85]} color="#69bccf"/>
  <Block position={[side*retail.postX,1.18,0]} size={[retail.baseWidth,.36,retail.baseDepth]} color="#d8edf0"/>
  <Block position={[side*retail.width*.3,9.5,.12]} size={[.1,.8,.1]} color="#abcbdc"/>
 </group>)}
 <Ribbon points={[[-retail.postX,9.6,0],[-retail.width*.25,9.87,0],[0,9.95,0],[retail.width*.25,9.87,0],[retail.postX,9.6,0]]} color="#b8dfe8" radius={.13}/>
 <PillSign text={retail.text} width={retail.maxWidth} height={retail.height} color={blue} position={[0,8.05,.35]}/>
 {[-2,-1,0,1,2].map((n,i)=><Triangle key={n} width={.8} height={-.5} color={i%2?"#f0dbad":"#73ccda"} position={[n*retail.width/5,6.66,.08]}/>)}
 </group>
 {/* Community: the soft arch hugs the plaque instead of spanning the whole block. */}
 <group position={[community.x,0,community.z]}>
 <Ribbon points={[[-community.postX,1.05,0],[-community.postX,4.7,0],[-community.width*.4,6.65,0],[0,6.95,0],[community.width*.4,6.65,0],[community.postX,4.7,0],[community.postX,1.05,0]]} radius={.32} color="#f2faf7"/>
 <PillSign text={community.text} width={community.maxWidth} height={community.height} color={blue} position={[0,5.25,.45]}/>
 {[-1,1].map(side=><Block key={side} position={[side*community.postX,1.4,0]} size={[community.baseWidth,.7,community.baseDepth]} color="#c1e2db"/>)}
 </group>
 {/* Plaza: a small wave-shaped support, keeping the central opening unobstructed. */}
 <group position={[plaza.x,0,plaza.z]}>
 <Block position={[-plaza.postX,3.7,0]} size={[.7,5.4,.85]} color="#f3faff"/>
 <Block position={[plaza.postX,3.4,0]} size={[.6,4.8,.85]} color="#d8eaf4"/>
 {[-1,1].map(side=><Block key={side} position={[side*plaza.postX,1.2,0]} size={[plaza.baseWidth,.4,plaza.baseDepth]} color="#d5eaf3"/>)}
 <Ribbon points={[[-plaza.postX,6.4,0],[-plaza.width*.3,6.8,0],[0,6.9,0],[plaza.width*.32,6.65,0],[plaza.postX,5.8,0]]} radius={.16} color="#77c9d6"/>
 <PillSign text={plaza.text} width={plaza.maxWidth} height={plaza.height} color={blue} position={[0,5.25,.4]}/>
 </group>
 </group>;
}
