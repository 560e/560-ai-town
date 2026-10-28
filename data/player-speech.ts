export const SPEECH_LIMIT=60;
export const SPEECH_DURATION=8000;
export interface PlayerSpeech{text:string;id:number|string;expiresAt?:number}
const segmenter=new Intl.Segmenter("zh-CN",{granularity:"grapheme"});
export function speechCharacters(text:string){return Array.from(segmenter.segment(text),part=>part.segment);}
export function limitSpeech(text:string){return speechCharacters(text).slice(0,SPEECH_LIMIT).join("");}
export function prepareSpeech(text:string){return limitSpeech(text.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim());}
