import {activeSkin} from "@/data/skins";
import ReliefText,{fitSign} from "./ReliefText";
import {Block} from "./primitives";
export default function TownSign({text,position,width=10,height=2,rotation=0,color=activeSkin.palette.glass,ink="#ffffff",paddingX}:{text:string;position:[number,number,number];width?:number;height?:number;rotation?:number;color?:string;ink?:string;paddingX?:number}){
 const depth=Math.min(.13,height*.07);
 const fit=fitSign(text,width,height,paddingX);
 return <group position={position} rotation={[0,rotation,0]}>
 <Block position={[0,0,-.18]} size={[fit.width+.3,height+.26,.42]} color="#a9c9df" castShadow/>
 <Block position={[0,0,.055]} size={[fit.width,height,.14]} color={color} castShadow/>
 <ReliefText text={fit.label} width={fit.textWidth} height={fit.textHeight} depth={depth} position={[0,0,.15]} color={ink} side="#e3f0f7"/>
 </group>;
}
