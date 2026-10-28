import {townDetail} from './town-scale.ts';
const at=(x:number,z:number)=>{const p=townDetail([x,z],[-41,-34]);return {x:p[0],z:p[1]};};
export const serviceEntrance={arrival:at(-40,-27),npc:at(-37.5,-26.7),board:at(-34,-26.7),radius:4.5};
