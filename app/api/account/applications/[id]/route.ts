import {handle,json,guard} from '@/lib/server/http';
import {applicationDetail} from '@/lib/server/service-applications';
import {serviceActor,idValue} from '@/lib/server/service-core';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{guard(request);return json(await applicationDetail(await serviceActor(request.headers),idValue((await params).id)));});}
