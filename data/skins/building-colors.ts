import type {BuildingSpec} from "../district-plan.ts";
import type {TownSkin} from "../../types/skin.ts";

// One restrained family per district; windows and white walls tie the town together.
const sand=["#e6b96c","#efca8c","#eac17a","#e6b96c"];
const mint=["#45bea4","#75d4b6","#60c9ae","#45bea4"];
export const serviceAppearance={accent:"#eb927e"};
export function buildingColors(b:BuildingSpec,skin:TownSkin){
 const index=Math.max(0,Number(b.id.split("-").at(-1))-1)||0;
 const accent=b.kind==="civic"?serviceAppearance.accent:b.kind==="office"?sand[index%sand.length]:b.kind==="home"?mint[index%mint.length]:b.accent??skin.palette.roof;
 return {accent,facade:b.kind==="office"?"#f6dfb7":b.kind==="home"?"#c0ecdd":skin.palette.wall};
}
