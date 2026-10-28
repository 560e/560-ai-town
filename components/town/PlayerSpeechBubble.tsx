import {useRef} from 'react';
import {useFrame} from '@react-three/fiber';
import {Html} from '@react-three/drei';
import {Group,Vector3,type Object3D} from 'three';
import type {PlayerSpeech} from '@/data/player-speech';
export default function PlayerSpeechBubble({speech,badgeOffset=false}:{speech:PlayerSpeech;badgeOffset?:boolean}){
 const anchor=useRef<Group>(null),bubble=useRef<HTMLDivElement>(null),world=useRef(new Vector3());
 useFrame(({camera,size})=>{
  if(!anchor.current||!bubble.current)return;
  anchor.current.getWorldPosition(world.current);
  let visible=!speech.expiresAt||Date.now()<speech.expiresAt;
  for(let node:Object3D|null=anchor.current;node;node=node.parent)if(!node.visible)visible=false;
  bubble.current.style.display=visible&&camera.position.distanceTo(world.current)<(size.width<761?36:52)?'':'none';
 });
 return <group ref={anchor} position={[0,3.4,0]}><Html center zIndexRange={[22,0]} style={{pointerEvents:'none'}}><div ref={bubble} key={speech.id} className="player-speech-bubble" style={badgeOffset?{marginTop:-28}:undefined} role="status">{speech.text}</div></Html></group>;
}
