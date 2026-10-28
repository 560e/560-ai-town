import {body,guard,handle,json} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {managedWords,mutateWords} from '@/lib/server/moderation';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){return handle(async()=>{guard(request);await requireUser(request.headers,true);return json(await managedWords(new URL(request.url).searchParams));});}
export async function POST(request:Request){return handle(async()=>{guard(request,true);const actor=await requireUser(request.headers,true);return json(await mutateWords(actor.id,await body(request,300000)));});}
