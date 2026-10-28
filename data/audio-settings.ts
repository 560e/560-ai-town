export const MUSIC_STORAGE_KEY="560-town-music-v1";
export const defaultMusicSettings={enabled:false,volume:12};
export function readMusicSettings(raw:string|null){try{const saved=JSON.parse(raw??"null");return {enabled:false,volume:typeof saved?.volume==="number"&&Number.isFinite(saved.volume)?Math.round(Math.min(100,Math.max(0,saved.volume))):defaultMusicSettings.volume};}catch{return {...defaultMusicSettings};}}
export function musicLevel(volume:number,talking:boolean){return Math.max(0,Math.min(100,volume))/100*(talking?.26:1);}
