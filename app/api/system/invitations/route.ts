import {guard,handle,json,body,HttpError} from '@/lib/server/http';
import {requireSuperAdmin} from '@/lib/server/session';
import {listInvitations,generateInvitations,revokeInvitation} from '@/lib/server/invitations';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{
  guard(request);await requireSuperAdmin(request.headers);
  const page=Number(new URL(request.url).searchParams.get('page')||1);
  if(!Number.isSafeInteger(page)||page<1||page>100000)throw new HttpError(400,'页码无效');
  return json(await listInvitations(page));
});}
export async function POST(request:Request){return handle(async()=>{
  guard(request,true);const actor=await requireSuperAdmin(request.headers),data=await body(request);
  if(Object.keys(data).some(k=>k!=='count'))throw new HttpError(400,'字段无效');
  return json(await generateInvitations(actor.id,data.count));
});}
export async function DELETE(request:Request){return handle(async()=>{
  guard(request,true);const actor=await requireSuperAdmin(request.headers),data=await body(request);
  if(Object.keys(data).some(k=>k!=='id'))throw new HttpError(400,'字段无效');
  return json(await revokeInvitation(actor.id,data.id));
});}
