export function authConfig() {
  const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3000";
  const local = process.env.TOWN_LOCAL_AUTH === "1" && process.env.NODE_ENV !== "production";
  let publicPassword=false;
  try {const url=new URL(baseURL);publicPassword=url.protocol==='https:'&&!url.username&&!url.password&&url.pathname==='/'&&!url.search&&!url.hash;}catch{}
  const password=process.env.TOWN_PASSWORD_AUTH==='1'&&(publicPassword||(process.env.NODE_ENV!=='production'&&isLoopback(baseURL)));
  return {baseURL, local:local&&!publicPassword, password, publicPassword:password&&publicPassword, enabled: (local&&!publicPassword||password) && !!process.env.DATABASE_URL && !!process.env.BETTER_AUTH_SECRET};
}

export function isLoopback(value: string) {
  try {return ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname);} catch {return false;}
}

export function trustedOrigins() {
  const {baseURL, local} = authConfig();
  const origin = new URL(baseURL).origin;
  if (!local) return [origin];
  const port = new URL(baseURL).port;
  return [...new Set([origin, `http://localhost:${port || "80"}`, `http://127.0.0.1:${port || "80"}`])];
}
