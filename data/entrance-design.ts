// Shared by the entrance architecture and walking collision geometry.
import {townDistance} from './town-scale.ts';
export const entranceDesign={
 z:townDistance(54),columnX:14,columnWidth:2.6,columnDepth:2.4,
 baseWidth:3.6,baseDepth:3.5,beamWidth:32,signWidth:28.4,
 signY:10.35,signHeight:3.15,
};

export const entranceCouplets=[{side:1,text:"智汇五六零启新境"},{side:-1,text:"梦起北部湾创未来"}];
