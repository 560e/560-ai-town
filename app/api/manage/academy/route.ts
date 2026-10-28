import {guard,handle,json,body} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {managed,manageMutation} from '@/lib/server/academy';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{guard(request);await requireUser(request.headers,true);return json(await managed());});}
export async function POST(request:Request){return handle(async()=>{guard(request,true);const user=await requireUser(request.headers,true);return json(await manageMutation(user.id,await body(request,1048576)));});}
