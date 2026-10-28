import type { PlaceType } from "./town.ts";

export type BuildingModel = "civic" | "campus" | "workspace" | "market" | "forum" | "fountain" | "residential";
export interface BuildingAppearance { model: BuildingModel; height: number; accent: string }
export interface TownSkin {
  id: string;
  name: string;
  palette: {
    background: string; floor: string; wood: string; woodLight: string; base: string;
    sea: string; shallows: string; sand: string; ground: string; road: string; curb: string; marking: string;
    wall: string; stone: string; frame: string; glass: string; roof: string; metal: string;
    gold: string; orange: string; foliage: string; shrub: string; trunk: string;
    skin: string; trousers: string; shoes: string;
  };
  lighting: { ambient: number; hemisphere: number; sun: number; sunColor: string };
  buildings: Record<PlaceType, BuildingAppearance>;
  residents: string[];
  ui: { ink: string; muted: string; panel: string; line: string; accent: string; label: string };
}
