import {appearanceInput,normalizeNickname,type CharacterAppearance} from './character.ts';
export const avatars = [
  {id: "wave", symbol: "≈", name: "海浪", color: "#0b88bf"},
  {id: "leaf", symbol: "芽", name: "新芽", color: "#279977"},
  {id: "sun", symbol: "☀", name: "暖阳", color: "#cb8730"},
  {id: "star", symbol: "✦", name: "星光", color: "#7b6fc4"},
  {id: "sail", symbol: "帆", name: "远帆", color: "#318cab"},
  {id: "coral", symbol: "珊", name: "珊瑚", color: "#d17969"},
] as const;
export type Resident = {id:string; name:string; phone:string; phoneVerified?:boolean; hasPassword?:boolean; avatar:string; character:CharacterAppearance; role:import("./roles.ts").AccountRole; identity:string; createdAt:string; managementPath?:string; systemPath?:string};
export function normalizePhone(value: unknown) {
  if (typeof value !== "string") throw new Error("请输入正确的中国大陆手机号");
  const phone = value.trim().replace(/[\s-]/g, "").replace(/^\+86/, "");
  if (!/^1[3-9]\d{9}$/.test(phone)) throw new Error("请输入正确的中国大陆手机号");
  return `+86${phone}`;
}
export function maskPhone(phone: string) {return phone.replace(/^(\+86)?(\d{3})\d{4}(\d{4})$/, "$2****$3");}
export function nicknameInput(value: unknown) {
  const name = normalizeNickname(value);
  if ([...name].length < 2 || [...name].length > 20 || /[\p{Cc}\p{Cf}<>]/u.test(name)) throw new Error("昵称需为 2–20 个字符，不能包含控制字符或尖括号");
  return name;
}
export function profileInput(value: Record<string, unknown>) {
  if (Object.keys(value).some(key => !["name", "avatar", "character"].includes(key))) throw new Error("只能修改昵称、头像和角色形象");
  const name = nicknameInput(value.name);
  if (!avatars.some(avatar => avatar.id === value.avatar)) throw new Error("请选择有效头像");
  return {name, avatar: value.avatar as string,...(value.character!==undefined?{character:appearanceInput(value.character)}:{})};
}
