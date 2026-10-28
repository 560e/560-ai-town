export type RegistrationAccess={smsRequired:boolean;inviteRequired:boolean;smsConfigured:boolean;passwordRegistrationAllowed:boolean};
// Only a real, implemented provider may change this capability. An env flag is not a provider.
export const smsConfigured=false;
export function registrationUpdate(input:unknown):{version:number;smsRequired:boolean;inviteRequired?:boolean}{
  if(!input||typeof input!=='object'||Array.isArray(input))throw Error('注册配置格式错误');
  const value=input as Record<string,unknown>;
  if(Object.keys(value).some(key=>!['version','smsRequired','inviteRequired'].includes(key))||!Number.isSafeInteger(value.version)||(value.version as number)<0||typeof value.smsRequired!=='boolean')throw Error('注册配置字段或版本无效');
  if(value.inviteRequired!==undefined&&typeof value.inviteRequired!=='boolean')throw Error('邀请码开关无效');
  if(value.smsRequired&&!smsConfigured)throw Error('真实短信服务尚未接入，暂不能开启短信验证');
  return {version:value.version as number,smsRequired:value.smsRequired,...(value.inviteRequired!==undefined?{inviteRequired:value.inviteRequired as boolean}:{})};
}
export function registrationAccess(row:unknown):RegistrationAccess{
  if(!row||typeof row!=='object'||typeof (row as {sms_required?:unknown}).sms_required!=='boolean')throw Error('注册配置尚未初始化或不可用，请联系管理员');
  const smsRequired=(row as {sms_required:boolean}).sms_required;
  return {smsRequired,inviteRequired:(row as {invite_required?:boolean}).invite_required===true,smsConfigured,passwordRegistrationAllowed:!smsRequired};
}
