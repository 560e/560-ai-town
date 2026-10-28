import {body,guard,handle,json,HttpError} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {uploadAcademyAsset} from '@/lib/server/academy-assets';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{guard(request);await requireUser(request.headers,true);throw new HttpError(410,'素材库已下线，请在外链课程编辑中上传封面');});}
export async function POST(request:Request){return handle(async()=>{guard(request,true);const user=await requireUser(request.headers,true),input=await body(request,6*1024*1024);if(input.op==='review')throw new HttpError(410,'素材审核已下线');return json(await uploadAcademyAsset(user.id,input));});}
