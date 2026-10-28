export const accountRoles = ["user","admin","super_admin"] as const;
export type AccountRole = typeof accountRoles[number];
export const roleLabels:Record<AccountRole,string>={user:"小镇居民",admin:"运营管理员",super_admin:"超级管理员"};
export function isOperator(role:unknown){return role==="admin"||role==="super_admin";}
export function accountRole(role:unknown):AccountRole{return accountRoles.includes(role as AccountRole)?role as AccountRole:"user";}
