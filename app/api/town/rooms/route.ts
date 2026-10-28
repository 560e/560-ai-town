import {guard,handle,json,HttpError} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {roomsList,roomMembers} from '@/lib/server/rooms';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){return handle(async()=>{guard(request);const user=await requireUser(request.headers),q=new URL(request.url).searchParams,search=q.get('q')||'',page=Number(q.get('page')||1);if(q.get('view')==='members'){const room=Number(q.get('room'));if(!Number.isInteger(room)||room<1||room>999999)throw new HttpError(400,'房间号无效');return json(await roomMembers(user.id,room,q.get('instance')||''));}if(!/^\d{0,6}$/.test(search)||!Number.isInteger(page)||page<1||page>20000)throw new HttpError(400,'房间搜索条件无效');return json(await roomsList(user.id,search?String(Number(search)):search,page));});}
