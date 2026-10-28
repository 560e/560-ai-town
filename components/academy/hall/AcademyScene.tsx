"use client";
import {useMemo,useRef,type MutableRefObject} from 'react';
import {useFrame,type ThreeEvent} from '@react-three/fiber';
import {Group} from 'three';
import BoxBatch,{type BoxSpec} from '@/components/town/BoxBatch';
import ReliefText from '@/components/town/ReliefText';
import {CharacterName} from '@/components/town/CharacterName';
import {characterParts} from '@/components/town/character-parts';
import {HallLabel} from '@/components/service/hall/HallScene';
import {campusGateColumns,campusStations,campusBuildings,campusBenches,campusSceneryObstacles,canStandCampus,type CampusStationId,type CampusRuntime} from '@/data/academy-campus';

type StudentPosition={x:number;z:number};
type StudentInteraction={runtime?:MutableRefObject<CampusRuntime>;onNearStudent?:(near:boolean)=>void;onStudentTalk?:()=>void};
const colors={white:'#f7fbff',blue:'#187ac1',glass:'#9bcfe4',trim:'#bfddea',grass:'#a3c78b',wood:'#d4ad79',ink:'#376575'};
const click=(fn:()=>void)=>(event:ThreeEvent<MouseEvent>)=>{event.stopPropagation();if(event.delta<=5)fn();};
function Sign({text,x,y,z,width=10}:{text:string;x:number;y:number;z:number;width?:number}){
 return <ReliefText text={text} width={width} height={1.08} depth={.14} color={colors.blue} side="#0a518b" position={[x,y,z]}/>;
}

function architecture(){
 const boxes:BoxSpec[]=[];
 const box=(x:number,y:number,z:number,w:number,h:number,d:number,color:string,rotation?:[number,number,number])=>boxes.push({position:[x,y,z],size:[w,h,d],color,rotation});
 // The lawn and paved spine remain flat, keeping every accessible route at y=0.
 box(0,-.4,0,86,.7,90,'#79a978');box(0,-.025,0,84,.08,88,colors.grass);
 box(0,.025,-3,9,.05,38,'#eaf1ee');box(0,.035,4,54,.06,8,'#eaf1ee');
 box(0,.032,0,26,.055,24,'#e5edf0');box(0,.04,-16,35,.07,8,'#edf3f4');
 box(0,.025,35,24,.05,8,'#edf3f4');for(const x of [-10,10])box(x,.025,23,6,.05,25,'#edf3f4');
 box(-9,.035,32,12,.055,7,'#edf3f4');
 for(const x of [-4.65,4.65])box(x,.05,-1,.14,.06,29,'#78b7cf');
 for(let z=-16;z<16;z+=4)box(0,.062,z,.16,.025,1.3,'#aeced9');
 const remap=(start:number,cx:number,cz:number,scaleX:number,scaleZ:number,turn=0,newX=cx,newZ=cz)=>{for(let i=start;i<boxes.length;i++){const b=boxes[i],x=(b.position[0]-cx)*scaleX,z=(b.position[2]-cz)*scaleZ;b.position[0]=newX+x*Math.cos(turn)+z*Math.sin(turn);b.position[2]=newZ-x*Math.sin(turn)+z*Math.cos(turn);b.size[0]*=scaleX;b.size[2]*=scaleZ;b.rotation=[b.rotation?.[0]??0,(b.rotation?.[1]??0)+turn,b.rotation?.[2]??0];}};
 let start=boxes.length;
 // Teaching building: a taller middle and two classroom wings.
 box(0,5.9,-28,13,11.8,14,colors.white);
 for(const x of [-13.5,13.5]){
  box(x,4.65,-28,14,9.3,14,colors.white);box(x,9.45,-28,14.3,.3,14.2,colors.blue);
  for(const y of [2,4.8,7.6]){box(x,y,-20.93,12.2,1.65,.1,colors.glass);box(x,y,-35.07,12.2,1.65,.1,colors.glass);for(let dx=-5;dx<=5;dx+=2.5){box(x+dx,y,-20.82,.12,1.75,.2,colors.white);box(x+dx,y,-35.17,.12,1.75,.2,colors.white);}}
 }
 box(0,12,-28,13.4,.4,14.4,colors.blue);box(0,12.26,-28,13.6,.12,14.6,colors.white);
 box(0,6.8,-20.86,10,2,.22,colors.glass);box(0,10,-20.83,11,1.6,.25,colors.white);
 for(const x of [-4.5,-1.5,1.5,4.5])box(x,6.8,-20.67,.16,2.1,.22,colors.white);
 box(0,2.25,-20.82,5.6,4.5,.2,'#72b6d8');for(const x of [-2.9,0,2.9])box(x,2.3,-20.63,.14,4.6,.22,colors.white);
 box(0,4.85,-22.7,9,.45,3,colors.white);box(0,5.12,-22.7,9.2,.12,3.2,colors.blue);
 for(const x of [-3.6,3.6])box(x,2.3,-21.4,.5,4.6,.5,colors.white);
 remap(start,0,-28,campusBuildings[0].w/41,1);
 for(let i=start;i<boxes.length;i++){boxes[i].position[1]*=campusBuildings[0].height/12;boxes[i].size[1]*=campusBuildings[0].height/12;}
 start=boxes.length;
 // Library: warm reading bays under a faceted, open-book glass roof.
 box(-27,2.9,-4,16,5.8,16,colors.white);box(-27,1.6,4.08,14,2.9,.15,'#f1d8a7');
 box(-27,4.35,4.12,14,1.65,.15,colors.glass);box(-27,3.4,4.23,14.6,.2,.22,colors.white);
 for(const x of [-33,-30,-27,-24,-21])box(x,2.9,4.27,.18,5.7,.23,colors.white);
 for(const x of [-31.5,-22.5]){box(x,1.4,4.2,3.3,1.2,.12,'#ba996d');for(let k=0;k<8;k++)box(x-1.35+k*.39,1.48,4.3,.22,.82,.1,['#5c92af','#dfbd72','#b9c4a1'][k%3]);}
 for(const x of [-32,-22]){box(x,1.05,3.35,2.6,.15,1.05,colors.wood);for(const dx of [-.8,.8])box(x+dx,.5,3.35,.15,1,.65,colors.ink);box(x,.62,2.3,2.6,.16,.65,colors.wood);}
 box(-27,1.6,4.35,3.2,3.2,.15,'#8dc0d4');box(-27,5.9,-4,16.5,.28,16.5,colors.white);
 for(const s of [-1,1]){box(-27+s*4,6.7,-4,8.2,.3,16.3,colors.glass,[0,0,s*.18]);box(-27+s*4,6.85,4.08,8.3,.15,.25,colors.blue,[0,0,s*.18]);}
 remap(start,-27,-4,campusBuildings[1].d/16,campusBuildings[1].w/16,Math.PI/2);
 start=boxes.length;
 // Lecture hall's flat south facade anchors the curved auditorium behind it.
 box(27,2.7,3.8,16,5.4,.4,colors.white);box(27,2.25,4.05,6,4.4,.12,colors.glass);
 for(const x of [21,24,30,33])box(x,2.75,4.12,.15,5.5,.18,colors.trim);
 box(27,5.5,3.8,16.4,.25,.7,colors.blue);box(27,4.95,4.2,10,1.2,.16,colors.white);
 remap(start,27,-4,22/16,1, -Math.PI/2,27,-4);
 // Rectangular front half joins a semicircular back roof, filling the collision footprint.
 box(22.5,2.7,-4,9,5.4,22,colors.white);
 box(17.94,2.3,-4,.14,4.4,6,colors.glass);
 start=boxes.length;
 // Student centre: smaller two-storey building with a planted terrace.
 box(15,2.9,24,13,5.8,10,colors.white);box(15,1.7,29.08,10.8,2.7,.14,colors.glass);box(15,4.4,29.08,10.8,1.5,.14,colors.glass);
 for(const x of [10,12.5,15,17.5,20])box(x,2.95,29.19,.16,5.5,.2,colors.white);
 box(15,3.1,29.25,13.2,.24,.45,colors.blue);box(15,5.95,24,13.4,.3,10.4,colors.white);box(15,6.15,24,12.8,.12,9.8,'#7faf76');
 for(const x of [9,21])box(x,6.37,24,.25,.55,9.5,colors.white);
 for(const z of [19.3,28.7])box(15,6.37,z,12.3,.55,.25,colors.white);
 for(const x of [11,14,17,20])box(x,6.45,21,1.7,.45,1.6,'#689b64');
 remap(start,15,24,campusBuildings[3].w/13,campusBuildings[3].d/10,0,campusBuildings[3].x,campusBuildings[3].z);
 start=boxes.length;
 // Independent school notice board with two substantial square columns.
 for(const x of [-13.3,-4.7]){box(x,2.65,33,.58,5.3,.65,colors.white);box(x,.22,33,.95,.44,.95,colors.blue);}
 box(-9,3.12,33,8.25,3.7,.32,colors.white);box(-9,5.18,33,9.5,.4,1.1,colors.blue);
 remap(start,-9,33,7/9.5,.7/1.1,0,-9,32.7);
 for(let i=start;i<boxes.length;i++){boxes[i].position[1]*=.75;boxes[i].size[1]*=.75;}
 // Campus gate is open, with a wide return route through its centre.
 for(const {x,z,w,d,h} of campusGateColumns){box(x,h/2,z,.85,h,.9,colors.white);box(x,.35,z,w,.7,d,colors.blue);}
 box(0,5.9,40,15.3,.7,1.2,colors.white);
 // Low perimeter edging avoids obscuring the school from a distant overview.
 for(const x of [-41.7,41.7])box(x,.18,0,.5,.36,87,'#dae9d8');
 box(0,.18,-43.7,84,.36,.5,'#dae9d8');
 for(const x of [-25,25])box(x,.18,43.7,34,.36,.5,'#dae9d8');
 return boxes;
}

function Person({name,position,station,onStation,shirt='#4996c0',paused=false,route,studentPositions,onStudentTalk,runtime}:{name:string;position:[number,number,number];station?:CampusStationId;onStation:(id:CampusStationId)=>void;shirt?:string;paused?:boolean;route?:[number,number][];studentPositions?:MutableRefObject<Map<string,StudentPosition>>;onStudentTalk?:()=>void;runtime?:MutableRefObject<CampusRuntime>}){
 const ref=useRef<Group>(null),elapsed=useRef(0),destination=useRef(0),rest=useRef(1);
 const parts=useMemo(()=>characterParts(shirt,'#4d403a').map(p=>({position:[(p.pivot?.[0]??0)+p.position[0],(p.pivot?.[1]??0)+p.position[1],(p.pivot?.[2]??0)+p.position[2]] as [number,number,number],size:p.size,color:p.color})),[shirt]);
 useFrame((_,dt)=>{if(ref.current&&route)studentPositions?.current.set(name,{x:ref.current.position.x,z:ref.current.position.z});if(paused||runtime?.current.player.typing||!route||!ref.current)return;const step=Math.min(dt,.05);elapsed.current+=step;if(rest.current>0){rest.current-=step;return;}const target=route[destination.current],pos=ref.current.position,dx=target[0]-pos.x,dz=target[1]-pos.z,d=Math.hypot(dx,dz);if(d<.2){destination.current=Math.floor(Math.random()*route.length);rest.current=1+Math.random()*4;return;}const nx=pos.x+dx/d*step*1.15,nz=pos.z+dz/d*step*1.15;if(canStandCampus(nx,nz,.35)){pos.set(nx,Math.sin(elapsed.current*10)*.025,nz);ref.current.rotation.y=Math.atan2(dx,dz);}else{destination.current=(destination.current+1)%route.length;rest.current=.5;}});
 return <group ref={ref} position={position} onClick={route&&onStudentTalk?click(onStudentTalk):station?click(()=>onStation(station)):undefined}><BoxBatch boxes={parts}/><CharacterName name={name} npc position={[0,2.6,0]}/></group>;
}

export default function AcademyScene({onStation,paused=false,runtime,onNearStudent,onStudentTalk}:{onStation:(id:CampusStationId)=>void;paused?:boolean}&StudentInteraction){
 const studentPositions=useRef(new Map<string,StudentPosition>()),wasNear=useRef(false);
 useFrame(()=>{const p=runtime?.current.player;const near=!!p&&!paused&&!p.typing&&!p.seat&&[...studentPositions.current.values()].some(s=>{if(Math.hypot(p.x-s.x,p.z-s.z)>2.6)return false;return [0,.25,.5,.75,1].every(t=>canStandCampus(p.x+(s.x-p.x)*t,p.z+(s.z-p.z)*t,.2));});if(near!==wasNear.current){wasNear.current=near;onNearStudent?.(near);}});
 const boxes=useMemo(architecture,[]);
 return <group name="academy-outdoor-campus"><BoxBatch boxes={boxes}/>
  <Sign text="AI 教学楼" x={0} y={8.34} z={-20.55} width={9}/>
  <group position={[-17.7,0,-4]} rotation={[0,Math.PI/2,0]}><Sign text="AI 图书馆" x={0} y={5.25} z={0} width={9}/></group>
  <group position={[17.7,0,-4]} rotation={[0,-Math.PI/2,0]}><Sign text="AI 讲堂" x={0} y={4.98} z={0} width={8}/></group>
  <Sign text="学生中心" x={campusBuildings[3].x} y={5.2} z={campusBuildings[3].z+campusBuildings[3].d/2+.3} width={7}/>
  <Sign text="学校公告牌" x={-9} y={3.88} z={33.09} width={5.9}/>
  <Sign text="五六零 AI 学院" x={0} y={5.95} z={40.65} width={12}/>
  <group position={[27,0,-4]} scale={[.82,1,1]} rotation={[0,0,0]}>
   <mesh position={[0,2.65,0]} castShadow receiveShadow><cylinderGeometry args={[11,11,5.3,28,1,false,0,Math.PI]}/><meshStandardMaterial color={colors.white}/></mesh>
   {[0,1,2].map(i=><mesh key={i} position={[0,5.45+i*.5,0]} castShadow><cylinderGeometry args={[11.2-i*.7,11.2-i*.7,.35,28,1,false,0,Math.PI]}/><meshStandardMaterial color={i===1?colors.glass:colors.blue}/></mesh>)}
  </group>
  <group name="learning-square-sculpture" position={[0,0,0]}>
   <mesh position={[0,.22,0]} receiveShadow><cylinderGeometry args={[2.45,2.7,.44,40]}/><meshStandardMaterial color="#f4fafc"/></mesh>
   <mesh position={[0,.63,0]}><cylinderGeometry args={[1.7,2,.4,32]}/><meshStandardMaterial color={colors.blue}/></mesh>
   {[-1,1].map(s=><group key={s} position={[s*.68,2.2,0]} rotation={[0,0,s*-.27]}><mesh castShadow><boxGeometry args={[1.5,3,.8]}/><meshStandardMaterial color={colors.blue} metalness={.28} roughness={.45}/></mesh>{[0,1,2].map(i=><mesh key={i} position={[s*.05,.03+i*.06,.46+i*.055]}><boxGeometry args={[1.35,2.72,.04]}/><meshStandardMaterial color={i===2?'#f7fdff':'#cee6f3'}/></mesh>)}</group>)}
   <ReliefText text="学习广场" width={3.8} height={.55} depth={.06} color={colors.blue} side="#0c568b" position={[0,.35,2.59]}/>
  </group>
  {[[-2.1,.34,-2.1],[2.1,.34,-2.1],[-2.1,.34,2.1],[2.1,.34,2.1]].map(([x,y,z],i)=><mesh key={i} position={[x,y,z]}><sphereGeometry args={[.17,10,8]}/><meshStandardMaterial color="#218dc5" emissive="#218dc5" emissiveIntensity={.4}/></mesh>)}
  <CampusDetails onStation={onStation} paused={paused} runtime={runtime} studentPositions={studentPositions} onStudentTalk={onStudentTalk}/>
 </group>;
}

function CampusDetails({onStation,paused,runtime,studentPositions,onStudentTalk}:{onStation:(id:CampusStationId)=>void;paused:boolean;studentPositions:MutableRefObject<Map<string,StudentPosition>>}&StudentInteraction){
 const furnishing=useMemo(()=>{
  const boxes:BoxSpec[]=[];const add=(x:number,y:number,z:number,w:number,h:number,d:number,color:string)=>boxes.push({position:[x,y,z],size:[w,h,d],color});
  for(const s of campusBenches){const{x,z}=s.at;add(x,.76,z,1.1,.18,2.6,colors.wood);add(x+(x<0?-.52:.52),1.17,z,.15,.68,2.6,colors.wood);for(const dz of [-.95,.95])add(x,.36,z+dz,.85,.72,.16,colors.ink);}
  for(const o of campusSceneryObstacles){
   if(o.kind==='tree'){add(o.x,.18,o.z,o.w,.36,o.d,'#e2ebda');add(o.x,.38,o.z,o.w-.3,.1,o.d-.3,'#83b17a');add(o.x,2.2,o.z,.35,4.2,.35,'#a88963');add(o.x,4.15,o.z,3.2,2.8,3.2,'#75a76e');add(o.x+.2,5.35,o.z,2.2,.9,2.2,'#a1c487');}
   if(o.kind==='bed'){add(o.x,.17,o.z,o.w,.34,o.d,'#e3ecdd');add(o.x,.5,o.z,o.w-.25,.65,o.d-.25,'#7ea675');for(const dx of [-1.6,0,1.6])add(o.x+dx,.85,o.z,.7,.17,.7,'#c0d6a1');}
   if(o.kind==='table'){add(o.x,1.05,o.z,o.w,.2,o.d,colors.wood);for(const dx of [-1.1,1.1])add(o.x+dx,.5,o.z,.2,1,1.3,colors.ink);add(o.x-.45,1.18,o.z,.7,.07,.5,'#3289b6');add(o.x+.6,1.18,o.z,.55,.07,.65,'#e8f4fa');}
   if(o.kind==='column'){add(o.x,o.h/2,o.z,o.w,o.h,o.d,colors.white);add(o.x,.18,o.z,o.w,.36,o.d,colors.blue);}
  }
  // Open pergola beams shade an accessible garden court; only supporting columns obstruct movement.
  add(26,4.78,17,11,.3,.65,colors.blue);add(26,4.78,27,11,.3,.65,colors.blue);
  for(const x of [21,23,25,27,29,31])add(x,4.98,22,.28,.2,11,colors.white);
  add(26,.025,22,12,.05,12,'#e5eddc');
  add(-16,.026,10,6,.05,4.4,'#e6eddf');
  // Trees remain outside playable bounds: scenery never creates invisible obstacles.
  for(const x of [-44,44])for(const z of [-37,-24,-11,2,15,28,41]){add(x,2,z,.38,4,.38,'#a38664');add(x,4.7,z,3.8,3.5,3.8,'#80ad75');add(x+.3,6.1,z,2.4,1.4,2.4,'#a5c986');}
  for(const x of [-33,-20,-7,7,20,33]){add(x,2,-46,.4,4,.4,'#a38664');add(x,4.8,-46,4,4,4,'#83ad78');}
  // Thin path lanterns sit beside bench footprints, with no extra point lights.
  for(const s of campusBenches){const{x,z}=s.at;add(x+(x<0?-.4:.4),2,z+1.1,.09,4,.09,'#63899a');add(x,4.02,z+1.1,1,.1,.45,colors.white);}
  return boxes;
 },[]);
 const roles=[['guide','小零 · 校园向导','#328dd0'],['assistant','小知 · 学习助教','#6698bd'],['librarian','小阅 · 图书管理员','#bb9b67'],['helper','小暖 · 学生服务','#6aab88']] as const;
 const buildingStations=['teaching','library','lecture','student','announcement','paths','mine','exit'];
 return <group><BoxBatch boxes={furnishing}/>
  {roles.map(([id,name,shirt])=>{const s=campusStations.find(s=>s.id===id)!;return <Person key={id} name={name} position={[s.at.x,0,s.at.z]} station={id} shirt={shirt} paused={paused} onStation={onStation}/>;})}
  {[0,1,2].map(i=><Person key={i} name={['漫游学员','阅读学员','探索学员'][i]} position={[[-5,5,-5][i],0,[-12,-12,12][i]]} shirt={['#bd9879','#75a995','#88a4c8'][i]} route={i===0?[[-5,-12],[-5,-5],[-7,-9]]:i===1?[[5,-12],[5,-5],[7,-9]]:[[-5,12],[5,12],[0,9]]} paused={paused} runtime={runtime} studentPositions={studentPositions} onStudentTalk={onStudentTalk} onStation={onStation}/>)}
  <HallLabel lines={['学院通知','校园导览与学习须知','点击查看学院公告']} position={[-10.7,2.25,33.03]} width={3.1} height={2.05} onClick={()=>onStation('announcement')}/>
  <HallLabel lines={['课程与班级信息','已发布课程 · 点击浏览','班级服务 · 筹备中']} position={[-7.3,2.25,33.03]} width={3.1} height={2.05} onClick={()=>onStation('teaching')}/>
  <HallLabel lines={['课程导览']} position={[-9,1.55,-19]} width={2.6} height={.85} onClick={()=>onStation('paths')}/>
  <HallLabel lines={['学习服务']} position={[9,1.55,-19]} width={2.6} height={.85} onClick={()=>onStation('mine')}/>
  {campusStations.filter(s=>buildingStations.includes(s.id)).map(s=><mesh key={s.id} position={[s.arrival.x,.11,s.arrival.z]} rotation={[-Math.PI/2,0,0]} onClick={click(()=>onStation(s.id))}><ringGeometry args={[.58,.72,24]}/><meshBasicMaterial color="#e9bd42" transparent opacity={.72}/></mesh>)}
  {campusBenches.map(s=><mesh key={s.id} position={[s.at.x,.9,s.at.z]} onClick={click(()=>onStation(s.id))}><boxGeometry args={[1.3,1.5,2.7]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>)}
  {campusStations.filter(s=>['teaching','library','lecture','student'].includes(s.id)).map(s=><mesh key={s.id} position={[s.at.x,1.6,s.at.z]} onClick={click(()=>onStation(s.id))}><boxGeometry args={[2.8,3.2,2]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>)}
 </group>;
}
