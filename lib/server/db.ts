import {Pool, type PoolClient} from "pg";
const shared = globalThis as typeof globalThis & {townDatabase?: Pool};
export function database() {
  if (!process.env.DATABASE_URL) throw new Error("请先运行 npm run local:setup 初始化本地账户数据库");
  return shared.townDatabase ??= new Pool({connectionString:process.env.DATABASE_URL, max:8, connectionTimeoutMillis:4000});
}
export async function transaction<T>(work: (client: PoolClient) => Promise<T>) {
  const client = await database().connect();
  try {await client.query("BEGIN"); const result = await work(client); await client.query("COMMIT"); return result;}
  catch (error) {await client.query("ROLLBACK"); throw error;}
  finally {client.release();}
}
export async function audit(client: PoolClient, actorId: string | null, action: string, targetId: string | null, details: Record<string, unknown> = {}) {
  await client.query('INSERT INTO town_audit (actor_id,action,target_id,details) VALUES ($1,$2,$3,$4)', [actorId, action, targetId, JSON.stringify(details)]);
}
