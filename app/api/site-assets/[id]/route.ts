import {handle} from "@/lib/server/http";
import {loadSiteImage} from "@/lib/server/site-assets";
export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){return handle(async()=>{
  const bytes=await loadSiteImage((await params).id);
  return new Response(new Uint8Array(bytes),{headers:{"Content-Type":"image/webp","Cache-Control":"public, max-age=31536000, immutable","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'","Content-Disposition":"inline"}});
});}
