import type {CharacterAppearance} from '@/lib/character';
import {hairColors,shirtColors} from '@/lib/character';
import {characterParts,type Part} from './character-parts';
import {activeSkin} from '@/data/skins';
export function residentParts(appearance:CharacterAppearance):Part[]{
 const hair=hairColors.find(c=>c.id===appearance.hairColor)!.color,shirt=shirtColors.find(c=>c.id===appearance.shirtColor)!.color;
 const parts:Part[]=[...characterParts(shirt,hair),...[-1,1].map(s=>({position:[s*.19,.43,.44] as [number,number,number],size:[.25,.55,.27] as [number,number,number],color:activeSkin.palette.trousers}))];
 const add=(position:Part['position'],size:Part['size'])=>parts.push({position,size,color:hair});
 switch(appearance.hairStyle){
  case 'side':add([-.12,2.12,.04],[.3,.16,.44]);add([-.23,1.98,0],[.07,.25,.45]);break;
  case 'bob':for(const x of [-.25,.25])add([x,1.78,-.015],[.09,.48,.45]);add([0,1.78,-.22],[.5,.48,.12]);break;
  case 'pony':add([0,1.91,-.29],[.27,.24,.25]);add([0,1.64,-.37],[.23,.4,.22]);break;
  case 'bun':add([0,2.18,-.17],[.32,.27,.29]);add([0,2.33,-.17],[.2,.08,.2]);break;
  case 'spiky':for(const [x,z,h] of [[-.17,-.13,.21],[.04,-.12,.28],[.18,.07,.19],[-.09,.1,.25]])add([x,2.08+h/2,z],[.13,h,.17]);break;
 }
 return parts;
}
