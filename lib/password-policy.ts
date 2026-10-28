export function validatePassword(value:unknown):string {
  if(typeof value!=='string'||value.length<10||value.length>128||!/[A-Za-z]/.test(value)||!/[0-9]/.test(value))throw new Error('密码需为10–128位，至少包含字母和数字');
  return value;
}
