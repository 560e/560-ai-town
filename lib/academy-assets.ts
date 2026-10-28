const MiB=1024*1024;
export const academyAssetLimits:Record<string,number>={'image/png':4*MiB,'image/jpeg':4*MiB,'image/webp':4*MiB};
export function assetUploadInput(input:Record<string,unknown>){
 const {name,mime,data}=input;
 if(typeof name!=='string'||!name.trim()||name.length>160||/[\\/\x00-\x1f]/.test(name))throw Error('文件名无效');
 if(typeof mime!=='string'||!Object.hasOwn(academyAssetLimits,mime))throw Error('封面只支持PNG/JPEG/WebP图片');
 if(typeof data!=='string'||!data.length||data.length>Math.ceil(academyAssetLimits[mime]/3)*4||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data))throw Error('文件过大或编码无效');
 const bytes=Buffer.from(data,'base64');if(!bytes.length||bytes.length>academyAssetLimits[mime])throw Error('文件大小超出限制');
 return {name:name.trim(),mime,bytes};
}
export function byteRange(header:string|null,size:number):{start:number;end:number}|null{
 if(!header)return null;const match=/^bytes=(\d*)-(\d*)$/.exec(header);
 if(!match||(!match[1]&&!match[2]))throw Error('range');
 let start:number,end:number;
 if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)throw Error('range');start=Math.max(0,size-suffix);end=size-1;}
 else{start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),size-1):size-1;}
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)throw Error('range');
 return {start,end};
}
