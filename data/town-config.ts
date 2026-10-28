import type { Point, Road, SitePlot } from "../types/town.ts";
import {districtSigns} from "./district-signs.ts";
import {entranceDesign} from "./entrance-design.ts";
import {townPoint,townDistance} from './town-scale.ts';
import {serviceEntrance} from './service-entrance.ts';
export const townConfig={name:"五六零人工智能AI小镇",companyName:"五六零人工智能科技（北海）有限公司",surfaceY:.65,
 camera:{position:[0,townDistance(108),townDistance(134)] as [number,number,number],target:[0,0,townDistance(8)] as [number,number,number],minZoomRatio:.65,maxZoomRatio:5},
 outline:([[-65,-56],[65,-56],[67,-52],[67,53],[63,58],[-63,58],[-67,53],[-67,-52]] as Point[]).map(townPoint)};
export const entrance:SitePlot={id:"main-entrance",name:townConfig.name,position:townPoint([0,52]),size:townPoint([34,9])};
const baseRoads:Road[]=[
 ...[-1,1].flatMap(side=>[-49,46].map(z=>({id:`exit-${side}-${z}`,position:[side*63,z] as Point,size:[6,6] as Point}))),
 {id:"west-ring",position:[-60,-1.5],size:[6,95]}, {id:"east-ring",position:[60,-1.5],size:[6,95]},
 {id:"north-ring",position:[0,-49],size:[120,6]}, {id:"south-ring",position:[0,46],size:[120,6]},
 {id:"west-spine",position:[-22,-1.5],size:[6,95]}, {id:"east-spine",position:[22,-1.5],size:[6,95]},
 {id:"academy-cross",position:[-19,-12.5],size:[82,5]}, {id:"square-cross",position:[0,22],size:[44,4]},
 {id:"community-cross",position:[41,14.5],size:[38,5]},
];
// Fixed arrivals at the centre of each gateway, facing inward (-Z).
export const roads:Road[]=baseRoads.map(r=>({...r,position:townPoint(r.position),size:townPoint(r.size)}));
// The service sign is wall-mounted: use the right side of its doorway to clear the forecourt tree.
export const walkSpawns={
 entrance:[0,entranceDesign.z] as Point,
 academy:[districtSigns.academy.x,districtSigns.academy.z] as Point,
 service:[serviceEntrance.arrival.x,serviceEntrance.arrival.z] as Point,
 office:[districtSigns.office.x,districtSigns.office.z] as Point,
 retail:[districtSigns.retail.x,districtSigns.retail.z] as Point,
 community:[districtSigns.community.x,districtSigns.community.z] as Point,
 plaza:[districtSigns.plaza.x,districtSigns.plaza.z] as Point,
 tasks:[0,districtSigns.task.z+3] as Point,
};
