export const ROOM_LIMIT=50,MAX_ROOM_NUMBER=999999;
export type RoomInfo={number:number;count:number;locked:boolean;mine:boolean;instance:string};
export type RoomAction={action:'enter'|'create'|'password'|'close'|'kick';room:number;password?:string;instance?:string;target?:string};
export type RoomMember={id:string;name:string;host:boolean};
export function roomNumber(value:unknown){if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>MAX_ROOM_NUMBER)throw new Error('房间号须为 1～999999 的整数');return value;}
export function roomPassword(value:unknown){if(value===undefined)return '';if(typeof value!=='string'||value.length>64||/[\u0000-\u001f\u007f]/.test(value))throw new Error('密码最多 64 个字符，不能包含控制字符');return value;}
