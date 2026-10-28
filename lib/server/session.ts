import {getAuth} from "./auth.ts";
import {database} from "./db.ts";
import {HttpError} from "./http.ts";
import {maskPhone, type Resident} from "../account.ts";
import {managementEntries} from "./management-entry.ts";
import {isOperator,accountRole} from "../roles.ts";
import {savedAppearance} from '../character.ts';

export async function currentUser(headers:Headers) {
  const session = await getAuth().api.getSession({headers});
  if (!session) return null;
  // Read the current role and account state every time; never trust stale client/session role values.
  const {rows} = await database().query('SELECT u.id,u.name,u."phoneNumber",u."phoneNumberVerified",u.role,u.banned,u."createdAt",p.avatar,p.character,EXISTS(SELECT 1 FROM account a WHERE a."userId"=u.id AND a."providerId"=\'credential\' AND a.password IS NOT NULL) AS "hasPassword" FROM "user" u LEFT JOIN town_profiles p ON p.user_id=u.id WHERE u.id=$1',[session.user.id]);
  return rows[0] && !rows[0].banned ? rows[0] : null;
}
export async function requireUser(headers:Headers, adminOnly=false) {
  const user = await currentUser(headers);
  if (!user) throw new HttpError(401,"请先登录小镇账户");
  if (adminOnly && !isOperator(user.role)) throw new HttpError(403,"此功能仅向管理员开放");
  return user;
}
export function resident(user:Record<string,unknown>):Resident {
  const entries=managementEntries(),entry=isOperator(user.role)?entries?.manage:undefined;
  const system=user.role==="super_admin"?entries?.system:undefined;
  return {id:String(user.id),name:String(user.name),phone:maskPhone(String(user.phoneNumber)),phoneVerified:user.phoneNumberVerified===true,hasPassword:user.hasPassword===true,avatar:String(user.avatar||"wave"),character:savedAppearance(user.character),role:accountRole(user.role),identity:"小镇居民",createdAt:new Date(String(user.createdAt)).toISOString(),...(entry?{managementPath:entry}:{}),...(system?{systemPath:system}:{})};
}
export async function requireSuperAdmin(headers:Headers){
  const user=await requireUser(headers);
  if(user.role!=="super_admin")throw new HttpError(403,"此功能仅向超级管理员开放");
  return user;
}
