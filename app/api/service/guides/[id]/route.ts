import {guard,handle,json} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {idValue,readGuide} from '@/lib/server/service-core';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{guard(request);await requireUser(request.headers);return json(await readGuide(idValue((await params).id),request.headers));});}
