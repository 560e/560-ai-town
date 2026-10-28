import {useEffect,useMemo} from "react";
import {makeLetterGeometry} from "@/data/sign-layout";
export {fitSign,makeLetterGeometry} from "@/data/sign-layout";
export default function ReliefText({text,width,height,depth=.18,color="#fcfdff",side="#e3f0f7",position=[0,0,0],anchor="center"}:{text:string;width:number;height:number;depth?:number;color?:string;side?:string;position?:[number,number,number];anchor?:"center"|"bottom"}){
 const geometry=useMemo(()=>{const g=makeLetterGeometry(text,width,height,depth);if(anchor==="bottom"){g.computeBoundingBox();g.translate(0,-g.boundingBox!.min.y,0);}return g;},[text,width,height,depth,anchor]);useEffect(()=>()=>geometry.dispose(),[geometry]);
 return <mesh geometry={geometry} position={position} castShadow={false} receiveShadow={false}><meshStandardMaterial attach="material-0" color={color} roughness={.42} metalness={.06} emissive={color} emissiveIntensity={.28}/><meshStandardMaterial attach="material-1" color={side} roughness={.45} metalness={.12} emissive={side} emissiveIntensity={.22}/></mesh>;
}
