export function normalizeInvite(value:unknown){
  if(typeof value!=='string'||value.length>64)throw Error('请输入有效邀请码');
  const code=value.trim().replaceAll('-','').toUpperCase();
  if(!/^[A-F0-9]{24}$/.test(code))throw Error('请输入有效邀请码');
  return code;
}
export function inviteCount(value:unknown){
  if(typeof value!=='number'||!Number.isInteger(value)||value<1||value>100)throw Error('每批可生成1至100个邀请码');
  return value;
}
