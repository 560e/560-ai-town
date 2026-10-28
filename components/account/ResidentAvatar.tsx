import {avatars} from "@/lib/account";
export default function ResidentAvatar({id="wave"}:{id?:string}){const avatar=avatars.find(item=>item.id===id)||avatars[0];return <span className="resident-avatar" style={{background:avatar.color}} aria-label={`${avatar.name}头像`}>{avatar.symbol}</span>;}
