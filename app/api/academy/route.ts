import {guard,handle,json,HttpError} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {catalog} from '@/lib/server/academy';
export const dynamic='force-dynamic';
export async function GET(request:Request){return handle(async()=>{guard(request);await requireUser(request.headers);const view=new URL(request.url).searchParams.get('view');if(view&&view!=='catalog')throw new HttpError(410,'站内学习功能已下线，请从课程目录前往网校');return json(await catalog());});}
export async function POST(request:Request){return handle(async()=>{guard(request,true);await requireUser(request.headers);throw new HttpError(410,'站内报名和进度记录已下线，请在网校学习');});}
