import {handle,json,guard,body} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {myIdentityPreferences,publicIdentityBadges,saveIdentityPreferences} from '@/lib/server/identity-display';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{guard(request);const user=await requireUser(request.headers);return json(new URL(request.url).searchParams.get('view')==='badges'?{badges:(await publicIdentityBadges([user.id])).get(user.id)||[]}:await myIdentityPreferences(user.id));});}
export async function PATCH(request:Request){return handle(async()=>{guard(request,true);const user=await requireUser(request.headers);return json(await saveIdentityPreferences(user.id,await body(request,4096)));});}
