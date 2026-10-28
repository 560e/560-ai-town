import type {Point} from '../types/town.ts';
// Main town ground coordinates only. Models, movement speed and indoor halls keep their scale.
export const TOWN_SCALE=1.5;
export const TOWN_LAYOUT_VERSION=2;
export const townDistance=(value:number)=>value*TOWN_SCALE;
export const townPoint=(point:readonly [number,number]):Point=>[townDistance(point[0]),townDistance(point[1])];
export const townBounds={minX:townDistance(-63.8),maxX:townDistance(63.8),minZ:townDistance(-53.8),maxZ:townDistance(56)};
/** Position an unchanged model detail relative to its moved building/feature anchor. */
export const townDetail=(point:readonly [number,number],anchor:readonly [number,number]):Point=>[townDistance(anchor[0])+point[0]-anchor[0],townDistance(anchor[1])+point[1]-anchor[1]];
