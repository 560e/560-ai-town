import {ExtrudeGeometry,ShapePath} from "three";
import glyphs from "./sign-glyphs.json" with {type:"json"};
type Glyph={commands:(string|number)[][];advance:number};
const font=glyphs as Record<string,Glyph>;
const aspectCache=new Map<string,number>();
/** Fit the plaque to the actual relief glyph bounds, keeping natural letter proportions. */
export function fitSign(text:string,maxWidth:number,height:number,padding=height*.32){
 const label=text.replace("☕","").trim();
 let aspect=aspectCache.get(label);
 if(aspect===undefined){const geometry=makeLetterGeometry(label,1000,1,.01);geometry.computeBoundingBox();const box=geometry.boundingBox!;aspect=(box.max.x-box.min.x)/(box.max.y-box.min.y);geometry.dispose();aspectCache.set(label,aspect);}
 const width=Math.min(maxWidth,aspect*height*.72+padding*2);
 return {label,width,textWidth:Math.max(.1,width-padding*2),textHeight:height*.72};
}
export function makeLetterGeometry(text:string,width:number,height:number,depth:number){
 let offset=0;const paths:ShapePath[]=[];
 for(const ch of text){if(ch===" "){offset+=60;continue;}const glyph=font[ch]??font["?"];const path=new ShapePath();
 for(const [cmd,...v]of glyph.commands){const n=v as number[];if(cmd==="M")path.moveTo(offset+n[0],n[1]);else if(cmd==="L")path.lineTo(offset+n[0],n[1]);else if(cmd==="C")path.bezierCurveTo(offset+n[0],n[1],offset+n[2],n[3],offset+n[4],n[5]);else path.currentPath?.closePath();}
 paths.push(path);offset+=glyph.advance+5;}
 const shapes=paths.flatMap(p=>p.toShapes(false));
 const geometry=new ExtrudeGeometry(shapes,{depth:12,bevelEnabled:true,bevelThickness:1.3,bevelSize:1.1,bevelSegments:2,curveSegments:5,steps:1});geometry.computeBoundingBox();const b=geometry.boundingBox!;
 const scale=Math.min(width/(b.max.x-b.min.x),height/(b.max.y-b.min.y));geometry.translate(-(b.max.x+b.min.x)/2,-(b.max.y+b.min.y)/2,-b.min.z);geometry.scale(scale,scale,depth/(b.max.z-b.min.z));geometry.computeVertexNormals();return geometry;
}
