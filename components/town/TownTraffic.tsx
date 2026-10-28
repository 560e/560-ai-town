import {useFrame} from "@react-three/fiber";
import {useMemo,useRef,useState,type MutableRefObject} from "react";
import {Group,MeshStandardMaterial} from "three";
import {vehicleTypes} from "@/data/traffic";
import {vehicleBoxes} from "@/data/vehicle-models";
import type {TownRuntime} from "@/data/town-runtime";
import BoxBatch from "./BoxBatch";
function Vehicle({id,type,runtime}:{id:number;type:number;runtime:MutableRefObject<TownRuntime>}){const root=useRef<Group>(null),wheels=useRef<Group>(null),v=vehicleTypes[type],boxes=useMemo(()=>vehicleBoxes(v),[v]);
 useFrame(()=>{const car=runtime.current.traffic.cars.find(c=>c.id===id);if(!root.current)return;root.current.visible=!!car&&car.opacity>.005;if(!car)return;root.current.position.set(car.x,.87,car.z);root.current.rotation.y=car.heading;root.current.traverse(obj=>{if("material" in obj){obj.castShadow=car.opacity>.98;const material=obj.material as MeshStandardMaterial;if(material.isMeshStandardMaterial){material.transparent=true;material.opacity=car.opacity;}}});wheels.current?.children.forEach(w=>w.rotation.x=car.wheel);});
 return <group ref={root}><BoxBatch boxes={boxes}/><group ref={wheels}>{[-1,1].flatMap(side=>[-1,1].map(end=><group key={`${side}${end}`} position={[side*(v.width/2+.03),.34,end*v.length*.32]}><mesh rotation={[0,0,Math.PI/2]} castShadow><cylinderGeometry args={[.34,.34,.16,12]}/><meshStandardMaterial color="#263541"/></mesh><mesh position={[side*.09,0,0]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.2,.2,.025,8]}/><meshStandardMaterial color="#bac8d0" metalness={.5}/></mesh></group>))}</group></group>;
}
export default function TownTraffic({runtime}:{runtime:MutableRefObject<TownRuntime>}){const [cars,setCars]=useState(()=>runtime.current.traffic.cars.map(c=>({id:c.id,type:c.type}))),last=useRef(cars.map(c=>c.id).join(","));useFrame(()=>{const list=runtime.current.traffic.cars,key=list.map(c=>c.id).join(",");if(key!==last.current){last.current=key;setCars(list.map(c=>({id:c.id,type:c.type})));}});return <group name="town-traffic">{cars.map(c=><Vehicle key={c.id} {...c} runtime={runtime}/>)}</group>;}
