import {body,guard,handle,json} from '@/lib/server/http';
import {chatRequest} from '@/lib/server/town-chat';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function POST(request:Request){return handle(async()=>{
 guard(request,true);return json(await chatRequest(request.headers,await body(request,8192)));
});}
