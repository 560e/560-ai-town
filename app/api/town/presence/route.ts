import {body,guard,handle,json} from '@/lib/server/http';
import {presenceRequest} from '@/lib/server/multiplayer';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:Request){return handle(async()=>{
  guard(request,true);return json(await presenceRequest(request.headers,await body(request,2048)));
});}
