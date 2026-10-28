import {migrateAcademyAssets} from './academy-assets-schema.ts';
import {migrateAcademy} from './academy-schema.ts';
import {migrateMultiplayer} from './multiplayer-schema.ts';
import {migrateModeration} from './moderation-schema.ts';
import {migrateRegistration} from './registration-schema.ts';
import './account-env.mjs';
import {getMigrations} from 'better-auth/db/migration';
import {getAuth} from '../lib/server/auth.ts';
import {database} from '../lib/server/db.ts';
import {defaultSiteSettings} from '../lib/site-settings.ts';
import {migrateService} from './service-schema.ts';
import {migrateCharacters} from './character-schema.ts';
const pool=database();
try {
  console.log('正在核对账户表；首次安装可能先显示 Missing tables，随后会自动建表。以本命令最终退出状态为准。');
  const migration=await getMigrations(getAuth().options);
  await migration.runMigrations();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS town_profiles (
      user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
      avatar text NOT NULL DEFAULT 'wave', last_login timestamptz
    );
    CREATE TABLE IF NOT EXISTS town_audit (
      id bigserial PRIMARY KEY, actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
      action text NOT NULL, target_id text REFERENCES "user"(id) ON DELETE SET NULL,
      details jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS town_audit_target ON town_audit(target_id,created_at DESC);
    CREATE TABLE IF NOT EXISTS town_otp (phone text PRIMARY KEY, code_hash text NOT NULL, expires_at timestamptz NOT NULL, attempts integer NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS town_limits (key text PRIMARY KEY, started_at bigint NOT NULL, last_at bigint NOT NULL, count integer NOT NULL);
    INSERT INTO town_profiles(user_id) SELECT id FROM "user" ON CONFLICT DO NOTHING;
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS town_site_settings (
      id integer PRIMARY KEY CHECK(id=1), version integer NOT NULL DEFAULT 0, settings jsonb NOT NULL,
      actor_id text REFERENCES "user"(id) ON DELETE SET NULL, updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS town_site_versions (
      version integer PRIMARY KEY, settings jsonb NOT NULL, actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
      changed_group text, restored_from integer, created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS town_site_assets (
      id uuid PRIMARY KEY, actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
      width integer NOT NULL, height integer NOT NULL, bytes integer NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
    );
  `);
  await pool.query('INSERT INTO town_site_settings(id,settings) VALUES(1,$1) ON CONFLICT DO NOTHING',[JSON.stringify(defaultSiteSettings)]);
  await pool.query('INSERT INTO town_site_versions(version,settings) SELECT version,settings FROM town_site_settings WHERE id=1 ON CONFLICT DO NOTHING');
  await migrateService();await migrateAcademyAssets();await migrateAcademy();
  await migrateCharacters();await migrateMultiplayer();await migrateModeration();await migrateRegistration();
  console.log('账户、站点配置和服务中心数据库结构已就绪。');
} finally {await pool.end();}

