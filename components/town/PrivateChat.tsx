import {useEffect,useRef,useState,type MutableRefObject} from 'react';
import {lineClear} from '@/data/town-runtime';
import type {PresenceRuntime} from '@/data/scene-presence';
type LineOfSight=(a:{x:number;z:number},b:{x:number;z:number})=>boolean;
import {PRIVATE_DISTANCE,PRIVATE_LIMIT,type ChatAction,type PrivateChat as Conversation} from '@/lib/town-chat';
import {speechCharacters} from '@/data/player-speech';
export function nearbyResident(r:PresenceRuntime,lineOfSight:LineOfSight=lineClear){
 if(!r.player.walking||r.player.typing||r.player.seat||r.talkingId)return null;
 return [...(r.remoteResidents||[])].filter(p=>(!r.visibleCharacterIds||r.visibleCharacterIds.has(`user:${p.id}`))&&Math.hypot(p.pose.x-r.player.x,p.pose.z-r.player.z)<=PRIVATE_DISTANCE&&lineOfSight(r.player,p.pose)).sort((a,b)=>Math.hypot(a.pose.x-r.player.x,a.pose.z-r.player.z)-Math.hypot(b.pose.x-r.player.x,b.pose.z-r.player.z))[0]??null;
}
export default function PrivateChat({runtime,chat,act,userId,enabled,inviteRef,onNear,lineOfSight=lineClear}:{runtime:MutableRefObject<PresenceRuntime>;chat:Conversation|null;act:(action:ChatAction)=>Promise<unknown>;userId?:string;enabled:boolean;inviteRef:MutableRefObject<(()=>void)|null>;onNear:(id:string|null)=>void;lineOfSight?:LineOfSight}){
 const [near,setNear]=useState<{id:string;name:string}|null>(null),[draft,setDraft]=useState(''),[notice,setNotice]=useState(''),[busy,setBusy]=useState(false);
 const pending=useRef(false),composing=useRef(false),box=useRef<HTMLDivElement>(null),input=useRef<HTMLTextAreaElement>(null),messages=useRef<HTMLDivElement>(null),last=useRef<Conversation|null>(null),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[]);
 useEffect(()=>{const update=()=>{const p=enabled&&!chat?nearbyResident(runtime.current,lineOfSight):null;setNear(old=>old?.id===p?.id&&old?.name===p?.name?old:p?{id:p.id,name:p.name}:null);onNear(p?.id??null);};update();const timer=setInterval(update,200);return()=>clearInterval(timer);},[enabled,chat?.id,runtime,onNear,lineOfSight]);
 useEffect(()=>{if(last.current&&!chat){setNotice(last.current.status==='pending'?'邀请已结束，未继续私聊。':'私聊已结束。离开小镇或连接过期也会结束会话。');document.querySelector<HTMLElement>('[aria-label="五六零AI小镇三维场景"], [aria-label="服务中心3D互动大厅"] canvas')?.focus();}if(last.current?.id!==chat?.id)setDraft('');last.current=chat;},[chat]);
 useEffect(()=>{if(!notice)return;const timer=setTimeout(()=>setNotice(''),7000);return()=>clearTimeout(timer);},[notice]);
 useEffect(()=>{if(chat?.status==='active')input.current?.focus();else if(chat)box.current?.querySelector<HTMLButtonElement>('button')?.focus();},[chat?.id,chat?.status]);
 useEffect(()=>{messages.current?.scrollTo({top:messages.current.scrollHeight});},[chat?.messages.length,chat?.version]);
 const perform=async(action:ChatAction)=>{if(pending.current)return false;pending.current=true;setBusy(true);setNotice('');try{await act(action);return true;}catch(error){if(alive.current)setNotice(error instanceof Error?error.message:'操作未成功，请重试');return false;}finally{pending.current=false;if(alive.current)setBusy(false);}};
 const invite=()=>{const peer=nearbyResident(runtime.current,lineOfSight);if(enabled&&peer&&!chat)void perform({op:'invite',target:peer.id});};
 useEffect(()=>{inviteRef.current=invite;return()=>{inviteRef.current=null;};});
 const close=()=>{if(chat)void perform({op:'close',id:chat.id});};
 const send=async()=>{if(!chat||chat.status!=='active'||composing.current||!draft.trim())return;const id=chat.id;if(await perform({op:'send',id,text:draft,messageId:crypto.randomUUID()})){setDraft('');input.current?.focus();}};
 return <>
 {near&&!chat&&enabled&&<button className="nearby-talk private-near" disabled={busy} onClick={invite}>与 {near.name} 私聊 <kbd>E</kbd></button>}
 {!chat&&notice&&<div className="private-notice" role="status">{notice}</div>}
 {chat&&<div className="private-shade"><div className="private-chat" ref={box} role="dialog" aria-modal="true" aria-labelledby="private-chat-title" onKeyDown={e=>{
  e.stopPropagation();if(e.key==='Escape'){e.preventDefault();if(!busy)close();}
  if(e.key==='Tab'){const controls=box.current?.querySelectorAll<HTMLElement>('button:not(:disabled),textarea:not(:disabled)');if(!controls?.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 }}>
 <header><div><small>{chat.status==='pending'?'面对面 · 私聊邀请':'仅双方可见'}</small><h2 id="private-chat-title">{chat.status==='pending'?(chat.incoming?`${chat.peer.name} 想与你私聊`:`等待 ${chat.peer.name} 同意`):`与 ${chat.peer.name} 私聊`}</h2></div><button onClick={close} disabled={busy} aria-label={chat.status==='pending'?'取消私聊邀请':'结束私聊'}>×</button></header>
 {chat.status==='pending'?<div className="private-invitation"><div aria-hidden="true">☏</div><p>{chat.incoming?'同意后才会打开聊天框，消息只发给你们两人。':'对方同意后，聊天框会自动打开。'}</p><small>请保持在附近 · 邀请 60 秒后自动失效</small><div className="private-actions">{chat.incoming?<><button disabled={busy} onClick={()=>void perform({op:'respond',id:chat.id,accept:false})}>暂不聊天</button><button className="primary" disabled={busy} onClick={()=>void perform({op:'respond',id:chat.id,accept:true})}>同意私聊</button></>:<button disabled={busy} onClick={close}>取消邀请</button>}</div></div>:<>
 <div className="private-messages" ref={messages} role="log" aria-label="双方私聊消息" aria-live="polite">{!chat.messages.length&&<p className="private-empty">已经连上了，打个招呼吧。<small>本次会话显示最近 50 条消息</small></p>}{chat.messages.map(m=><div key={m.id} className={`private-message ${m.sender===userId?'mine':''}`}><small>{m.sender===userId?'我':chat.peer.name}</small><p>{m.text}</p></div>)}</div>
 <form onSubmit={e=>{e.preventDefault();void send();}}><label htmlFor="private-message-input">发送私聊消息</label><textarea id="private-message-input" ref={input} rows={2} value={draft} placeholder="只对 TA 说…" onCompositionStart={()=>{composing.current=true;}} onCompositionEnd={e=>{composing.current=false;setDraft(speechCharacters(e.currentTarget.value).slice(0,PRIVATE_LIMIT).join(''));}} onChange={e=>setDraft(composing.current?e.target.value:speechCharacters(e.target.value).slice(0,PRIVATE_LIMIT).join(''))} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing&&!composing.current&&e.keyCode!==229){e.preventDefault();void send();}}}/><div className="private-send"><small>Enter 发送 · Shift+Enter 换行<br/>{speechCharacters(draft).length}/{PRIVATE_LIMIT} · 离开小镇后结束</small><button className="primary" disabled={busy||!draft.trim()} type="submit">{busy?'发送中…':'发送'}</button></div></form>
 </>}
 {notice&&<p className="private-error" role="alert">{notice}</p>}
 </div></div>}
 </>;
}
