import {database} from "@/lib/server/db";
import {guard,handle,json} from "@/lib/server/http";
import {requireSuperAdmin} from "@/lib/server/session";
import {authConfig} from "@/lib/server/config";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:Request){return handle(async()=>{
  guard(request);await requireSuperAdmin(request.headers);
  const {rows}=await database().query(`SELECT count(*)::int AS users,count(*) FILTER(WHERE role='admin')::int AS staff,count(*) FILTER(WHERE role='super_admin')::int AS "superAdmins" FROM "user"`);
  return json({counts:rows[0],settings:{environment:authConfig().local?"本地开发":"生产环境",database:"PostgreSQL · 连接正常",authentication:authConfig().password?"手机号＋密码":"手机号＋本地测试验证码",sms:"未接入真实短信",mfa:"尚未接入",entry:"独立随机路径",rolePolicy:"居民 / 运营管理员 / 超级管理员",sessions:"角色变更撤销目标账户全部会话"},updatedAt:new Date().toISOString()});
});}
