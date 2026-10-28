import {useEffect,useMemo,useRef,type MutableRefObject} from 'react';
import {Billboard,Html} from '@react-three/drei';
import {useFrame} from '@react-three/fiber';
import {ExtrudeGeometry,PerspectiveCamera,Shape,Vector3,type Group} from 'three';
import {districtEntries,nearbyDistrict,type DistrictEntry,type DistrictEntryId} from '@/data/district-entries';
import type {TownRuntime} from '@/data/town-runtime';

function makeArrow(){
 const shape=new Shape();
 shape.moveTo(-.18,.7);shape.lineTo(.18,.7);shape.lineTo(.18,-.02);
 shape.lineTo(.47,-.02);shape.lineTo(0,-.7);shape.lineTo(-.47,-.02);shape.lineTo(-.18,-.02);shape.closePath();
 const geometry=new ExtrudeGeometry(shape,{depth:.2,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.045,bevelThickness:.035});
 geometry.translate(0,0,-.1);
 return geometry;
}

function EntryArrow({entry,index,geometry,animate,walking,onEnter}:{entry:DistrictEntry;index:number;geometry:ExtrudeGeometry;animate:boolean;walking:boolean;onEnter:(id:DistrictEntryId)=>void}){
 const floating=useRef<Group>(null),sized=useRef<Group>(null),position=useRef(new Vector3());
 const pointerStart=useRef<[number,number]|null>(null);
 useFrame(({clock,camera,size})=>{
  if(!floating.current||!sized.current)return;
  floating.current.position.y=3.4+(animate?Math.sin(clock.elapsedTime*2.1+index*.45)*.23:0);
  floating.current.getWorldPosition(position.current);
  if(camera instanceof PerspectiveCamera){
   // Keep the visible arrow small at every zoom, while retaining a comfortable click target.
   const pixels=size.width<761?22:26;
   const worldHeight=2*Math.tan(camera.fov*Math.PI/360)*camera.position.distanceTo(position.current)*pixels/size.height;
   sized.current.scale.setScalar(worldHeight/1.5);
  }
 });
 return <group name={`entry-${entry.id}`} position={[entry.arrival[0],1.08,entry.arrival[1]]}>
  <mesh rotation={[-Math.PI/2,0,0]}><ringGeometry args={[1.25,1.5,48]}/><meshBasicMaterial color="#ffd447" transparent opacity={.72} depthWrite={false}/></mesh>
  {!walking&&<group ref={floating} position={[0,3.4,0]}>
   <Billboard><group ref={sized}><mesh geometry={geometry} rotation={[.08,-.28,-.02]} renderOrder={30}>
    <meshStandardMaterial attach="material-0" color="#ffd744" emissive="#c59418" emissiveIntensity={.18} roughness={.34} metalness={.12} depthTest={false} depthWrite={false}/>
    <meshBasicMaterial attach="material-1" color="#f69826" toneMapped={false} depthTest={false} depthWrite={false}/>
   </mesh></group></Billboard>
   <Html center zIndexRange={[22,0]}><button className="district-arrow-target" aria-label={`进入${entry.name}`}
    onPointerDown={event=>{event.stopPropagation();pointerStart.current=[event.clientX,event.clientY];}}
    onClick={event=>{event.stopPropagation();const start=pointerStart.current;pointerStart.current=null;if(event.detail!==0&&start&&Math.hypot(event.clientX-start[0],event.clientY-start[1])>6)return;onEnter(entry.id);}}/></Html>
  </group>}
 </group>;
}

export default function DistrictEntries({runtime,animate,walking,paused,onNear,onEnter}:{runtime:MutableRefObject<TownRuntime>;animate:boolean;walking:boolean;paused:boolean;onNear:(id:DistrictEntryId|null)=>void;onEnter:(id:DistrictEntryId)=>void}){
 const last=useRef<DistrictEntryId|null>(null);
 const geometry=useMemo(makeArrow,[]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useFrame(()=>{const id=!paused?nearbyDistrict(runtime.current)?.id||null:null;if(id!==last.current){last.current=id;onNear(id);}});
 if(paused)return null;
 return <group name="seven-district-entries">{districtEntries.map((entry,index)=><EntryArrow key={entry.id} entry={entry} index={index} geometry={geometry} animate={animate} walking={walking} onEnter={onEnter}/>)}</group>;
}

