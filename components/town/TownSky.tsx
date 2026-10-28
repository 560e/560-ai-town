import {useEffect,useMemo,useRef} from "react";
import {useFrame} from "@react-three/fiber";
import {useTexture} from "@react-three/drei";
import {BackSide,Color,SRGBColorSpace,type Mesh} from "three";

const skyVertex=`varying vec2 skyUv;
void main(){skyUv=uv;gl_Position=vec4(position.xy,1.0,1.0);}`;
const skyFragment=`uniform sampler2D skyMap;
uniform vec3 haze;
uniform float heading;
uniform float horizontalSpan;
varying vec2 skyUv;
void main(){
 // Show the cloud-bearing upper hemisphere above a calm lower backdrop.
 vec2 sampleUv=vec2(fract(0.65+heading+(skyUv.x-0.5)*horizontalSpan),mix(0.38,0.72,skyUv.y));
 vec3 clouds=texture2D(skyMap,sampleUv).rgb;
 float amount=smoothstep(0.32,0.87,skyUv.y)*0.82;
 gl_FragColor=vec4(mix(haze,clouds,amount),1.0);
 #include <colorspace_fragment>
}`;

export default function TownSky({walking}:{walking:boolean}){
 const texture=useTexture("/textures/coastal-sky.png"),sky=useRef<Mesh>(null);
 const uniforms=useMemo(()=>({skyMap:{value:texture},haze:{value:new Color("#c6e4f7")},heading:{value:0},horizontalSpan:{value:.2}}),[texture]);
 useEffect(()=>{texture.colorSpace=SRGBColorSpace;texture.needsUpdate=true;},[texture]);
 useFrame(({camera,size})=>{uniforms.horizontalSpan.value=.34*(size.width/size.height)/2;sky.current?.position.copy(camera.position);uniforms.heading.value=Math.atan2(camera.position.x,camera.position.z)/(Math.PI*2);});
 if(!walking)return <mesh renderOrder={-100} frustumCulled={false} name="overview-sky-backdrop">
  <planeGeometry args={[2,2]}/><shaderMaterial uniforms={uniforms} vertexShader={skyVertex} fragmentShader={skyFragment} depthWrite={false} depthTest={false} toneMapped={false}/>
 </mesh>;
 return <>
  <fog attach="fog" args={["#d7ecf7",100,650]}/>
  <mesh ref={sky} scale={4000} renderOrder={-100} frustumCulled={false}>
   <sphereGeometry args={[1,48,32]}/>
   <meshBasicMaterial map={texture} side={BackSide} depthWrite={false} toneMapped={false} fog={false}/>
  </mesh>
 </>;
}
