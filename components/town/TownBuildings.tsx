import TaskBoard from "./TaskBoard";
import {townDistance as S} from '@/data/town-scale';
import { useMemo } from "react";
import { buildings } from "@/data/district-plan";
import type { BuildingSpec } from "@/data/district-plan";
import { activeSkin } from "@/data/skins";
import { createBuilding } from "@/data/skins/diorama-models";
import BoxBatch from "./BoxBatch";
import { Disk } from "./primitives";
import TownSign from "./TownSign";
import DistrictSigns from "./DistrictSigns";
import TownSculpture from "./TownSculpture";
function Building({b}:{b:BuildingSpec}){const boxes=useMemo(()=>createBuilding(b,activeSkin),[b]);return <group position={[b.position[0],1.05,b.position[1]]} rotation={[0,b.rotation??0,0]}><BoxBatch boxes={boxes}/>
 {b.name&&<TownSign text={b.name} position={[0,b.kind==="shop"?4.8:2.1,b.size[1]/2+.24]} width={b.kind==="shop"?6:1.5} height={b.kind==="shop"?1.5:.6} color={activeSkin.palette.glass}/>}
 </group>;}
export default function TownBuildings({animate}:{animate:boolean}){const p=activeSkin.palette;return <group>
 {buildings.map(b=><Building key={b.id} b={b}/>)}
 <DistrictSigns/>
 <Disk position={[0,1.35,S(4)]} radius={5} height={.6} color={p.stone}/><Disk position={[0,1.69,S(4)]} radius={4.5} height={.1} color={p.sea}/>
 {[2.6,3.5,4.25].map(r=><Disk key={r} position={[0,1.76,S(4)]} radius={r} inner={r-.06} color={p.shallows}/>)}
 <TownSculpture animate={animate}/>
 <TaskBoard/>
 </group>;}
