"use client";
import CharacterEditor from "./CharacterEditor";
import PasswordEditor from './PasswordEditor';
import {defaultAppearance,type CharacterAppearance} from "@/lib/character";
import {useEffect,useState} from "react";
import {useAccount,accountRequest} from "./AccountProvider";
import ResidentAvatar from "./ResidentAvatar";
import {avatars} from "@/lib/account";
import {isOperator,roleLabels} from "@/lib/roles";
export default function AccountProfile(){
  const account=useAccount(),[name,setName]=useState(""),[avatar,setAvatar]=useState("wave"),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[saveError,setSaveError]=useState(false);
  const [character,setCharacter]=useState<CharacterAppearance>({...defaultAppearance});
  useEffect(()=>{if(account.user){setName(account.user.name);setAvatar(account.user.avatar);setCharacter(account.user.character??defaultAppearance);}},[account.user?.name,account.user?.avatar,account.user?.character?.hairStyle,account.user?.character?.hairColor,account.user?.character?.shirtColor]);
  const save=async()=>{setBusy(true);setNotice("");setSaveError(false);try{await accountRequest("/api/account",{name,avatar,character},"PATCH");await account.refresh();setNotice("居民资料已保存");}catch(error){setSaveError(true);setNotice((error as Error).message);}finally{setBusy(false);}};
  const logout=async()=>{setBusy(true);setSaveError(false);try{await accountRequest("/api/auth/sign-out",{});await account.refresh();setNotice("");}catch(error){setSaveError(true);setNotice((error as Error).message);}finally{setBusy(false);}};
  if(!account.user)return null;
  return <div className="wb-profile-layout"><section className="account-panel"><div className="resident-summary"><ResidentAvatar id={avatar}/><div><h2>{account.user!.name}</h2><span className="resident-badge">小镇居民</span>{isOperator(account.user!.role)&&<span className="resident-badge admin-badge">{roleLabels[account.user!.role]}</span>}</div></div><form onSubmit={event=>{event.preventDefault();void save();}}><label htmlFor="resident-name">昵称</label><input id="resident-name" value={name} onChange={event=>setName(event.target.value)} minLength={2} maxLength={40} required disabled={busy} aria-describedby="nickname-help"/><p id="nickname-help" className="account-help">昵称为2–20个字符，不可与其他账号重复（不区分英文大小写和全角字符）。</p><CharacterEditor value={character} onChange={setCharacter} disabled={busy}/><fieldset className="avatar-options" disabled={busy}><legend>选择头像</legend>{avatars.map(item=><button type="button" key={item.id} className={avatar===item.id?"selected":""} aria-pressed={avatar===item.id} aria-label={`${item.name}头像`} onClick={()=>setAvatar(item.id)}><ResidentAvatar id={item.id}/><small>{item.name}</small></button>)}</fieldset><div className="wb-profile-actions"><p role={saveError?"alert":"status"} className={saveError?"account-error":"account-notice"}>{notice}</p><button className="account-primary" disabled={busy}>{busy?"正在保存…":"保存资料"}</button></div></form></section><section className="wb-card wb-account-info"><h2>账户信息</h2><dl><dt>注册手机号</dt><dd>{account.user.phone}</dd><dt>手机号验证</dt><dd>{account.user.phoneVerified?"已验证":"未通过短信验证"}</dd><dt>加入日期</dt><dd>{new Date(account.user.createdAt).toLocaleDateString('zh-CN')}</dd><dt>默认身份</dt><dd>小镇居民</dd></dl><p>班级和企业成员资格在对应业务模块管理；公开佩戴称号可在“我的身份”调整。</p><button className="account-secondary" disabled={busy} onClick={()=>void logout()}>退出登录</button><PasswordEditor/></section></div>;
}
