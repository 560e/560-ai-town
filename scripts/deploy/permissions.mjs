// Only schema privilege failures are repairable; connection/version failures stay fatal.
export const permissionExitCode=42;
export function canReuseRole(role,approved) {
  return approved===true&&role.rolcanlogin===true&&!['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls'].some(key=>role[key]!==false);
}

export async function ensureDatabasePermissions({check,repair}) {
  try {await check();return;} catch(error) {if(error.exitCode!==permissionExitCode)throw error;}
  await repair();
  await check();
}

export async function grantSchemaAccess(c,createClient) {
  const url=new URL(c.databaseUrl),applicationUser=decodeURIComponent(url.username);
  if(!c.adminUser||!c.adminPassword)throw new Error('数据库管理员账号和密码不能为空。');
  // Preserve host, port, database and TLS options. Never guess a local socket/cluster.
  url.username=encodeURIComponent(c.adminUser);url.password=encodeURIComponent(c.adminPassword);
  const client=createClient({connectionString:url.toString(),connectionTimeoutMillis:8000});
  try {
    await client.connect();
    const result=await client.query("SELECT format('GRANT USAGE, CREATE ON SCHEMA public TO %I', $1::text) AS statement",[applicationUser]);
    await client.query(result.rows[0].statement);
  } finally {await client.end();}
}
