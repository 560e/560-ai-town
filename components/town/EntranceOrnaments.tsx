import {entranceDesign as gate,entranceCouplets} from "@/data/entrance-design";
import ReliefText from "./ReliefText";

export default function EntranceOrnaments(){
 return <group name="entrance-couplets">
  {entranceCouplets.map(({side,text})=><group key={text} name={text}>
   {[...text].map((character,i)=><ReliefText key={i} text={character} width={1.08} height={.7} depth={.075} position={[side*gate.columnX,8.1-i*.77,1.4]} color="#ffffff" side="#e3f2fa"/>)}
  </group>)}
 </group>;
}
