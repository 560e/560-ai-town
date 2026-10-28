"use client";
import {useCallback,useEffect,useRef,useState} from "react";
import {usePathname} from "next/navigation";
import {defaultMusicSettings,musicLevel,MUSIC_STORAGE_KEY,readMusicSettings} from "@/data/audio-settings";
function TownMusic({talking,inline=false}:{talking:boolean;inline?:boolean}){
 const audio=useRef<HTMLAudioElement>(null),fade=useRef<number|null>(null),activated=useRef(false),settings=useRef({...defaultMusicSettings}),duck=useRef(talking),homePath=useRef<string|null>(null),generation=useRef(0);
 const [enabled,setEnabled]=useState(false),[volume,setVolume]=useState(defaultMusicSettings.volume),[playing,setPlaying]=useState(false),[failed,setFailed]=useState(false),[started,setStarted]=useState(false);
 const pathname=usePathname();duck.current=talking;
 const cancelFade=useCallback(()=>{if(fade.current!==null)cancelAnimationFrame(fade.current);fade.current=null;},[]);
 const fadeTo=useCallback((target:number,pauseAfter=false)=>{cancelFade();const el=audio.current;if(!el)return;const initial=el.volume,begin=performance.now();const tick=(now:number)=>{const t=Math.min(1,(now-begin)/1800);el.volume=initial+(target-initial)*(t*t*(3-2*t));if(t<1)fade.current=requestAnimationFrame(tick);else{fade.current=null;if(pauseAfter)el.pause();}};fade.current=requestAnimationFrame(tick);},[cancelFade]);
 const persist=useCallback(()=>{try{localStorage.setItem(MUSIC_STORAGE_KEY,JSON.stringify({volume:settings.current.volume}));}catch{/* Playback remains available when storage is restricted. */}},[]);
 const play=useCallback(()=>{const el=audio.current;if(!el||!settings.current.enabled||document.hidden)return;activated.current=true;setStarted(true);const request=++generation.current;if(el.paused)el.volume=0;setFailed(false);
 // Only the explicit sound toggle activates playback; entering the town stays silent.
 void el.play().then(()=>{if(request!==generation.current){if(document.hidden||!settings.current.enabled||!activated.current||!audio.current)el.pause();return;}if(document.hidden||!settings.current.enabled){el.pause();return;}fadeTo(musicLevel(settings.current.volume,duck.current));}).catch(()=>{if(request===generation.current)setFailed(true);});
 },[fadeTo]);
 useEffect(()=>{const element=audio.current;settings.current=readMusicSettings(localStorageSafe());setEnabled(settings.current.enabled);setVolume(settings.current.volume);return()=>{generation.current++;cancelFade();element?.pause();};},[cancelFade]);
 useEffect(()=>{if(!homePath.current)homePath.current=pathname;else if(homePath.current!==pathname){generation.current++;activated.current=false;setStarted(false);cancelFade();audio.current?.pause();homePath.current=pathname;}},[pathname,cancelFade]);
 useEffect(()=>{if(audio.current&&!audio.current.paused&&settings.current.enabled)fadeTo(musicLevel(settings.current.volume,talking));},[talking,volume,enabled,fadeTo]);
 useEffect(()=>{const visibility=()=>{if(document.hidden){generation.current++;cancelFade();audio.current?.pause();}else if(activated.current&&settings.current.enabled)play();};const leave=()=>{generation.current++;cancelFade();audio.current?.pause();};document.addEventListener("visibilitychange",visibility);window.addEventListener("pagehide",leave);return()=>{document.removeEventListener("visibilitychange",visibility);window.removeEventListener("pagehide",leave);};},[play,cancelFade]);
 const toggle=()=>{if(!enabled||!started||failed){settings.current.enabled=true;setEnabled(true);persist();play();}else{settings.current.enabled=false;setEnabled(false);generation.current++;persist();fadeTo(0,true);}};
 const isOn=enabled&&playing&&!failed;
 return <div className="music-control" aria-label="环境声控制">
 <audio ref={audio} src="/audio/quiet-coast.ogg" loop preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>{setFailed(true);setPlaying(false);}}/>
 <button className="music-toggle" onClick={toggle} aria-label={isOn?"关闭环境声":"开启环境声"} aria-pressed={isOn}><span aria-hidden="true">{isOn?"♫":"♪"}</span><span>{failed?"点击重试":isOn?"海风轻浪":enabled&&started?"环境声已暂停":"环境声已关闭"}</span>{isOn&&<i aria-hidden="true"/>}</button>
 <details className="music-volume" open={inline||undefined}><summary aria-label="调整环境音量">音量</summary><div><label htmlFor="town-music-volume">环境音量 <output>{volume}%</output></label><input id="town-music-volume" aria-label="环境音量" type="range" min="0" max="100" value={volume} onChange={e=>{const value=Number(e.target.value);settings.current.volume=value;setVolume(value);persist();}}/><small>{talking?"对话中 · 已自动调低":"轻柔海风 · 远处浪声"}</small></div></details>
 </div>;
}
function localStorageSafe(){try{return localStorage.getItem(MUSIC_STORAGE_KEY);}catch{return null;}}
export default TownMusic;
