import {request} from 'node:http';

// Fetch rewrites Host in supported Node versions. Use HTTP directly for proxy probes.
export async function healthRequest(url,{headers={},timeoutMs=10000}={}) {
  const target=new URL(url);
  if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.username||target.password)throw new Error('Health checks require HTTP loopback');
  return new Promise((resolve,reject)=>{
    const req=request(target,{headers},res=>{
      const chunks=[];let size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>8*1024*1024)req.destroy(new Error('Health response too large'));else chunks.push(chunk);});
      res.on('error',reject);
      res.on('end',()=>resolve(new Response([204,304].includes(res.statusCode)?null:Buffer.concat(chunks),{status:res.statusCode})));
    });
    const timer=setTimeout(()=>req.destroy(new Error('Health request timeout')),timeoutMs);
    req.on('close',()=>clearTimeout(timer));req.on('error',reject);req.end();
  });
}
