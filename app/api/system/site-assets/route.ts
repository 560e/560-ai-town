import {guard,handle,json,HttpError} from "@/lib/server/http";
import {trustedOrigins} from "@/lib/server/config";
import {requireSuperAdmin} from "@/lib/server/session";
import {saveSiteImage} from "@/lib/server/site-assets";
export const runtime="nodejs";
export async function POST(request:Request){return handle(async()=>{
  guard(request);
  if(!trustedOrigins().includes(request.headers.get("origin")||"")||request.headers.get("sec-fetch-site")==="cross-site")throw new HttpError(403,"请从小镇页面上传图片");
  const actor=await requireSuperAdmin(request.headers);
  if(!["image/png","image/jpeg","image/webp"].includes(request.headers.get("content-type")||""))throw new HttpError(415,"只支持 PNG、JPEG 和 WebP 图片");
  const reader=request.body?.getReader();if(!reader)throw new HttpError(400,"请选择图片");
  const chunks:Uint8Array[]=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2*1024*1024){await reader.cancel();throw new HttpError(413,"图片大小不能超过2MB");}chunks.push(value);}}finally{reader.releaseLock();}
  return json(await saveSiteImage(actor.id,Buffer.concat(chunks)),201);
});}
