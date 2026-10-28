import {AsyncLocalStorage} from "node:async_hooks";
import {createHmac, timingSafeEqual} from "node:crypto";
import {transaction} from "./db.ts";
import {HttpError} from "./http.ts";
import {isLocalTestResident,localTestResidentCode} from './local-test-resident.ts';
import type {PoolClient} from 'pg';

async function checkTestResident(client:PoolClient,phone:string){
  const user=(await client.query('SELECT role,banned FROM "user" WHERE "phoneNumber"=$1',[phone])).rows[0];
  if(!user||(user.role||'user')!=='user'||user.banned)throw new HttpError(403,'固定测试验证码仅限指定的普通测试居民');
}

const shared = globalThis as typeof globalThis & {townOtpDelivery?: AsyncLocalStorage<{code?:string}>};
export const delivery = shared.townOtpDelivery ??= new AsyncLocalStorage<{code?: string}>();
export const OTP_SECONDS = 300;
const hash = (phone: string, code: string) => createHmac("sha256", process.env.BETTER_AUTH_SECRET!).update(`${phone}:${code}`).digest("hex");

export async function throttle(phone: string, operation: "send" | "verify") {
  // Transactional phone-based limits work across server processes and restarts.
  return transaction(async client => {
    const key = `${operation}:${phone}`;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);
    const {rows} = await client.query("SELECT * FROM town_limits WHERE key=$1 FOR UPDATE",[key]);
    const now = Date.now(), row = rows[0], windowMs = operation === "send" ? 3600000 : 600000;
    const fresh = !row || now - Number(row.started_at) >= windowMs;
    const count = fresh ? 0 : row.count;
    if (operation === "send" && row && now - Number(row.last_at) < 60000) throw new HttpError(429,"请等待 60 秒后再获取验证码");
    if (count >= (operation === "send" ? 10 : 20)) throw new HttpError(429,operation === "send" ? "验证码请求过于频繁，请一小时后重试" : "验证尝试过多，请十分钟后重试");
    await client.query('INSERT INTO town_limits(key,started_at,last_at,count) VALUES($1,$2,$3,1) ON CONFLICT(key) DO UPDATE SET started_at=$2,last_at=$3,count=$4',[key,fresh?now:row.started_at,now,count+1]);
  });
}

export async function storeOtp(phone:string, code:string) {
  const testResident=isLocalTestResident(phone);
  if(testResident)code=localTestResidentCode;
  await transaction(async client => {
    if(testResident)await checkTestResident(client,phone);
    await client.query('DELETE FROM verification WHERE identifier=$1',[phone]);
    await client.query('INSERT INTO town_otp(phone,code_hash,expires_at,attempts) VALUES($1,$2,$3,0) ON CONFLICT(phone) DO UPDATE SET code_hash=$2,expires_at=$3,attempts=0',[phone,hash(phone,code),new Date(Date.now()+OTP_SECONDS*1000)]);
  });
  const context = delivery.getStore();
  if (context) context.code = code;
}

export async function consumeOtp(phone: string, code: string) {
  return transaction(async client => {
    if(isLocalTestResident(phone))await checkTestResident(client,phone);
    const {rows} = await client.query("SELECT * FROM town_otp WHERE phone=$1 FOR UPDATE",[phone]);
    const row = rows[0];
    if (!row) return false;
    if (new Date(row.expires_at).getTime() <= Date.now() || row.attempts >= 5) {await client.query("DELETE FROM town_otp WHERE phone=$1",[phone]);return false;}
    const equal = timingSafeEqual(Buffer.from(row.code_hash,"hex"),Buffer.from(hash(phone,code),"hex"));
    if (equal) await client.query("DELETE FROM town_otp WHERE phone=$1",[phone]);
    else await client.query("UPDATE town_otp SET attempts=attempts+1 WHERE phone=$1",[phone]);
    return equal;
  });
}
