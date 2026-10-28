import {townDistance as S} from '@/data/town-scale';
import {NpcNames} from "./CharacterName";
import type {MutableRefObject} from "react";
import type {TownRuntime} from "@/data/town-runtime";
import TownTraffic from "./TownTraffic";
import TownGround from "./TownGround";
import TownRoads from "./TownRoads";
import TownBuildings from "./TownBuildings";
import TownPlanting from "./TownPlanting";
import TownResidents from "./TownResidents";
import TownFurniture from "./TownFurniture";
import { activeSkin } from "@/data/skins";
import { useThree } from "@react-three/fiber";

export default function TownScene({ animate,runtime,walking }: { animate: boolean;runtime:MutableRefObject<TownRuntime>;walking:boolean }) {
  const { lighting, palette }=activeSkin;
  const width=useThree(state=>state.size.width);
  return <>
    <ambientLight intensity={lighting.ambient} />
    <hemisphereLight args={[palette.wall, palette.base, lighting.hemisphere]} />
    <directionalLight key={width<761?"mobile-shadow":"desktop-shadow"} position={[S(-55), S(100), S(65)]} intensity={lighting.sun} color={lighting.sunColor} castShadow
      shadow-mapSize={width<761?[1024,1024]:[2048,2048]} shadow-camera-left={S(-100)} shadow-camera-right={S(100)}
      shadow-camera-top={S(100)} shadow-camera-bottom={S(-100)} shadow-camera-near={1} shadow-camera-far={S(280)}
      shadow-normalBias={0.04} shadow-bias={-0.00015} />
    <TownGround walking={walking}/>
    <TownRoads />
    <TownBuildings animate={animate}/>
    <TownPlanting />
    <TownFurniture />
    <TownResidents animate={animate} runtime={runtime}/><NpcNames runtime={runtime}/>
    <TownTraffic runtime={runtime}/>
  </>;
}

