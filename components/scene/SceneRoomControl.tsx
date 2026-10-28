"use client";
import {useState} from 'react';
import {useSceneConnection} from '@/components/town/TownPresenceProvider';
import RoomPicker from '@/components/town/RoomPicker';

/** Non-spatial district pages retain membership without inventing a 3D avatar scene. */
export default function SceneRoomControl(){
 const {online}=useSceneConnection(),[open,setOpen]=useState(false);
 return <><button className="scene-room-button" onClick={()=>setOpen(true)} aria-label="切换房间">{online.state.status==='online'?`房间 ${online.state.room} · ${online.state.count}/50 人`:'房间连接中'}<span>⌄</span></button>
 {online.state.status==='other'&&<button onClick={online.retry}>在此页面继续</button>}
 {online.notice&&<span role="status">{online.notice}</span>}
 {open&&<RoomPicker current={online.state.room} onAction={online.roomAct} onClose={()=>setOpen(false)}/>}</>;
}
