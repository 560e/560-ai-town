import {guard,handle,json} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {publicService} from '@/lib/server/service-titles';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{guard(request);await requireUser(request.headers);return json(await publicService());});}
