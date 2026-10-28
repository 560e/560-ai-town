import {guard,handle,json} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {publicService} from '@/lib/server/service-titles';
import {idValue} from '@/lib/server/service-core';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{guard(request);await requireUser(request.headers);return json(await publicService(idValue((await params).id)));});}
