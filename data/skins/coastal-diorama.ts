import type { TownSkin } from "../../types/skin.ts";

export const coastalDiorama: TownSkin = {
  id: "coastal-diorama",
  name: "蓝白AI小镇",
  palette: {
    background:"#c6e4f7",floor:"#94c9ee",wood:"#b7d1db",woodLight:"#d6e4e8",base:"#086b95",
    sea:"#16b9ed",shallows:"#77e6fb",sand:"#efe4c9",ground:"#81c638",road:"#6d7d84",curb:"#f5f1dc",marking:"#ffffff",
    wall:"#f3f8fc",stone:"#c5d3d8",frame:"#f9fdff",glass:"#1288d2",roof:"#177acb",metal:"#284d63",
    gold:"#ffd33c",orange:"#f69826",foliage:"#4fa416",shrub:"#82c42a",trunk:"#8b6641",skin:"#ffc260",trousers:"#15518d",shoes:"#253e55",
  },
  lighting:{ambient:.6,hemisphere:1.1,sun:3.4,sunColor:"#fff8eb"},
  buildings: {
    community:{model:"residential",height:13,accent:"#147adb"},
    plaza: { model: "fountain", height: 7, accent: "#147ddb" },
    service: { model: "civic", height: 8, accent: "#147ddb" },
    education: { model: "campus", height: 14, accent: "#147ddb" },
    office: { model: "workspace", height: 18, accent: "#147ddb" },
    retail: { model: "market", height: 7, accent: "#ed9528" },
    task: { model: "forum", height: 7, accent: "#20864c" },
  },
  residents: ["#0d69c5", "#2588d9", "#ffb523", "#1678c9", "#2b98dd", "#fa9825"],
  ui:{ink:"#163c5b",muted:"#527487",panel:"rgba(248,253,255,.92)",line:"rgba(57,117,150,.2)",accent:"#167cd3",label:"#f7fcff"},
};
