import {authConfig} from "@/lib/server/config";
import {body, guard, handle, HttpError, json} from "@/lib/server/http";
import {currentUser, requireUser, resident} from "@/lib/server/session";
import {transaction, audit} from "@/lib/server/db";
import {profileInput} from "@/lib/account";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handle(async()=>{
  if (!authConfig().enabled) return json({user:null,local:false,password:false,enabled:false});
  guard(request);
  const user=await currentUser(request.headers);
  return json({user:user?resident(user):null,local:authConfig().local,password:authConfig().password,enabled:true});
});}
export async function PATCH(request:Request){return handle(async()=>{
  guard(request,true);const user=await requireUser(request.headers);const data=await body(request);
  let profile;try{profile=profileInput(data);}catch(error){throw new HttpError(400,(error as Error).message);}
  try{await transaction(async client=>{
    const {rows}=await client.query('SELECT banned FROM "user" WHERE id=$1 FOR UPDATE',[user.id]);
    if (!rows[0]||rows[0].banned) throw new HttpError(401,"账户已停用");
    await client.query('UPDATE "user" SET name=$1,"updatedAt"=now() WHERE id=$2',[profile.name,user.id]);
    await client.query('INSERT INTO town_profiles(user_id,avatar) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET avatar=$2',[user.id,profile.avatar]);
    if(profile.character)await client.query('UPDATE town_profiles SET character=$1 WHERE user_id=$2',[JSON.stringify(profile.character),user.id]);
    await audit(client,user.id,"profile.update",user.id,{fields:["name","avatar",...(profile.character?["character"]:[])]});
  });}catch(error){if((error as {code?:string;constraint?:string}).code==='23505'&&(error as {constraint?:string}).constraint==='town_user_nickname_unique')throw new HttpError(409,'这个昵称已被使用，请换一个');throw error;}
  return json({user:resident({...user,...profile})});
});}
