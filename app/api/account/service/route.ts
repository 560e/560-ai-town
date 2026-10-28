import {handle,json,guard,body} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {myService,mutateApplication,pageValue} from '@/lib/server/service-applications';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{guard(request);const actor=await requireUser(request.headers);return json(await myService(actor.id,pageValue(new URL(request.url).searchParams.get('page'))));});}
export async function POST(request:Request){return handle(async()=>{guard(request,true);const actor=await requireUser(request.headers);return json(await mutateApplication(actor.id,await body(request,65536)));});}
