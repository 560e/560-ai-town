import {betterAuth} from "better-auth";
import {admin, phoneNumber} from "better-auth/plugins";
import {adminAc,userAc} from "better-auth/plugins/admin/access";
import {APIError} from "better-auth/api";
import {createHash, randomUUID} from "node:crypto";
import {database, transaction, audit} from "./db.ts";
import {authConfig, trustedOrigins} from "./config.ts";
import {storeOtp, consumeOtp} from "./otp.ts";
import {passwordLogin} from './password-context.ts';

function createAuth() {
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) throw new Error("请配置随机的 BETTER_AUTH_SECRET");
  return betterAuth({
    baseURL:authConfig().baseURL, secret:process.env.BETTER_AUTH_SECRET, database:database(),
    trustedOrigins:trustedOrigins(),
    emailAndPassword:{enabled:authConfig().password,disableSignUp:true,minPasswordLength:10,maxPasswordLength:128},
    session:{expiresIn:60*60*24*7, updateAge:60*60*24, cookieCache:{enabled:false}},
    advanced:{database:{generateId:()=>randomUUID()},useSecureCookies:authConfig().publicPassword},
    rateLimit:{enabled:true, window:60, max:60, storage:"database",customRules:{"/phone-number/verify":{window:60,max:30}}},
    plugins:[admin({defaultRole:"user",adminRoles:["super_admin"],roles:{user:userAc,admin:userAc,super_admin:adminAc}, bannedUserMessage:"账户已停用，请联系小镇管理员"}),phoneNumber({
      otpLength:6, expiresIn:300, allowedAttempts:5,
      phoneNumberValidator:phone=>/^\+861[3-9]\d{9}$/.test(phone),
      sendOTP:async({phoneNumber:phone,code})=>{
        if (!authConfig().local) throw new Error("短信服务尚未配置");
        await storeOtp(phone,code);
      },
      verifyOTP:async({phoneNumber:phone,code})=>consumeOtp(phone,code),
      signUpOnVerification:{
        getTempEmail:phone=>`${createHash("sha256").update(phone).digest("hex")}@phone.560.invalid`,
        getTempName:()=>`小镇居民${randomUUID().replaceAll('-','').slice(0,12)}`,
      },
    })],
    databaseHooks:{
      user:{create:{after:async user=>{await transaction(async client=>{
        await client.query('INSERT INTO town_profiles(user_id) VALUES($1) ON CONFLICT DO NOTHING',[user.id]);
        await audit(client,user.id,"register",user.id);
      });}}},
      session:{create:{after:async session=>{const allowed=await transaction(async client=>{
        const {rows}=await client.query('SELECT banned FROM "user" WHERE id=$1 FOR UPDATE',[session.userId]);
        const login=passwordLogin.getStore();
        const credential=login?(await client.query('SELECT password FROM account WHERE "userId"=$1 AND "providerId"=\'credential\'',[session.userId])).rows[0]:null;
        if(!rows[0]||rows[0].banned||(login&&(login.userId!==session.userId||login.hash!==credential?.password))){await client.query('DELETE FROM "session" WHERE id=$1',[session.id]);return false;}
        await client.query('INSERT INTO town_profiles(user_id,last_login) VALUES($1,now()) ON CONFLICT(user_id) DO UPDATE SET last_login=now()',[session.userId]);
        await audit(client,session.userId,"login",session.userId);
        return true;
      });if(!allowed)throw new APIError("FORBIDDEN",{message:"账户已停用，请联系小镇管理员"});}}},
    },
  });
}
let instance:ReturnType<typeof createAuth>|undefined;
export function getAuth(){return instance ??= createAuth();}
