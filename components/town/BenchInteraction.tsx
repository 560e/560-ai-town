import {Html} from "@react-three/drei";
import {benches} from "@/data/district-plan";
import type {BenchPrompt} from "@/data/town-runtime";
export default function BenchInteraction({prompt,onInteract}:{prompt:BenchPrompt|null;onInteract:()=>void}){
 if(!prompt||prompt.seated)return null;const [x,z]=benches[prompt.index];
 return <Html center position={[x,3.4,z]} zIndexRange={[30,0]}><button className="npc-talk-prompt bench-prompt" onPointerDown={e=>e.stopPropagation()} onClick={onInteract} aria-label="坐在长凳上">坐<small>E / 坐下</small></button></Html>;
}
