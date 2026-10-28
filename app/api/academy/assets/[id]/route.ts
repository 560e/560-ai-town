import {guard,handle} from '@/lib/server/http';
import {requireUser} from '@/lib/server/session';
import {serveAcademyAsset} from '@/lib/server/academy-assets';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{guard(request);const user=await requireUser(request.headers);return serveAcademyAsset(user,(await params).id,request);});}
export const HEAD=GET;
