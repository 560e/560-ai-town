import type {OnlineResident} from '@/lib/multiplayer';
import type {PlayerSpeech} from "@/data/player-speech";
import {useLayoutEffect,useMemo,useRef,type MutableRefObject} from "react";
import {useFrame} from "@react-three/fiber";
import {Html} from "@react-three/drei";
import {Color,Group,InstancedMesh,Object3D} from "three";
import type {TownRuntime} from "@/data/town-runtime";
import {activeSkin} from "@/data/skins";
import {type Part} from "./character-parts";
import {residentParts} from "./resident-parts";
import {useAccount} from "@/components/account/AccountProvider";
import {defaultAppearance,type CharacterAppearance} from "@/lib/character";
import {CharacterName} from "./CharacterName";
import PlayerSpeechBubble from './PlayerSpeechBubble';
export default function TownPlayer({runtime,walking,view,speech,floor=1.05,appearance,preview=false,remote}:{runtime:MutableRefObject<Pick<TownRuntime,'player'>>;walking:boolean;view:"third"|"first";speech:PlayerSpeech|null;floor?:number;appearance?:CharacterAppearance;preview?:boolean;remote?:OnlineResident}){
 const account=useAccount(),look=appearance??remote?.character??account.user?.character??defaultAppearance;
 const root=useRef<Group>(null),mesh=useRef<InstancedMesh>(null),parts=useMemo(()=>residentParts(look),[look.hairStyle,look.hairColor,look.shirtColor]),dummy=useMemo(()=>new Object3D(),[]);
 useLayoutEffect(()=>{parts.forEach((p,i)=>mesh.current!.setColorAt(i,new Color(p.color)));if(mesh.current?.instanceColor)mesh.current.instanceColor.needsUpdate=true;},[parts]);
 useFrame(()=>{const p=runtime.current.player;if(!root.current||!mesh.current)return;root.current.visible=p.exists&&(!walking||view==="third");root.current.position.set(p.x,floor,p.z);root.current.rotation.y=p.yaw;const wave=p.moving?Math.sin(p.stride*5)*.5:0;
 parts.forEach((raw,i)=>{const part=raw as Part;const angle=p.seat&&part.pivot&&part.pivot[1]===1.43?-.65:wave*(part.swing??0),[x,y,z]=part.position,[px,py,pz]=part.pivot??[0,0,0];dummy.position.set(px+x,py+y*Math.cos(angle)-z*Math.sin(angle),pz+y*Math.sin(angle)+z*Math.cos(angle));dummy.rotation.set(angle,0,0);dummy.scale.set(...part.size);
 if(i===14||i===15){dummy.scale.setScalar(p.seat?1:0);if(p.seat)dummy.scale.set(...part.size);}
 if(p.seat&&(i===6||i===10)){dummy.position.set(part.pivot![0],.8,.22);dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.set(.25,.44,.25);}
 if(p.seat&&(i===7||i===11)){dummy.position.set(part.pivot![0],.1,.52);dummy.rotation.set(0,0,0);}
 dummy.updateMatrix();mesh.current!.setMatrixAt(i,dummy.matrix);});mesh.current.instanceMatrix.needsUpdate=true;});
 return <group ref={root} name={remote?`resident-${remote.id}`:"local-player"}><instancedMesh key={parts.length} ref={mesh} args={[undefined,undefined,parts.length]} frustumCulled={false} castShadow receiveShadow><boxGeometry args={[1,1,1]}/><meshStandardMaterial roughness={.7}/></instancedMesh>
 {!preview&&!remote&&<mesh rotation={[-Math.PI/2,0,0]} position={[0,.05,0]}><ringGeometry args={[.58,.7,32]}/><meshBasicMaterial color="#2cdb82" transparent opacity={.65}/></mesh>}
 {!preview&&!remote&&(!walking||view==="third")&&<Html center position={[0,2.35,0]} zIndexRange={[15,0]}><span className="player-arrow" aria-label="你的位置"/></Html>}
 {!preview&&(!walking||view==="third")&&<CharacterName name={remote?.name??account.user?.name??"游客"} self={!remote} badges={remote?remote.badges||[]:account.badges}/> }
 {speech&&(!walking||view==="third")&&<PlayerSpeechBubble speech={speech} badgeOffset={!!(remote?remote.badges?.length:account.badges.length)}/>}</group>;
}

