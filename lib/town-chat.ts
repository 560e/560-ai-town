import {speechCharacters} from '../data/player-speech.ts';
export const PRIVATE_DISTANCE=4.5,PRIVATE_LIMIT=300,INVITE_DURATION=60000;
export type ChatMessage={id:string;sender:string;text:string;at:number};
export type PrivateChat={id:string;status:'pending'|'active';incoming:boolean;peer:{id:string;name:string};messages:ChatMessage[];expiresAt:number;version:string};
export type ChatAction={op:'speak';text:string;messageId:string}|{op:'invite';target:string}|{op:'respond';id:string;accept:boolean}|{op:'send';id:string;text:string;messageId:string}|{op:'close';id:string};
export function chatText(value:unknown,limit:number,multiline=false){
 if(typeof value!=='string'||value.length>6000)throw new Error('请输入有效的消息');
 const text=multiline?value.replace(/\r\n?/g,'\n').replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g,' ').replace(/[^\S\n]+/g,' ').trim():value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim();
 if(!text)throw new Error('消息不能为空');
 if(speechCharacters(text).length>limit)throw new Error(`消息最多 ${limit} 个字`);
 return text;
}
