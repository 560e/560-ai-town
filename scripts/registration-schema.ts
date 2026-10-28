import {database} from '../lib/server/db.ts';
export async function migrateRegistration(){
  await database().query(`CREATE TABLE IF NOT EXISTS town_registration_settings (
    id integer PRIMARY KEY CHECK(id=1), version integer NOT NULL DEFAULT 0,
    sms_required boolean NOT NULL DEFAULT false,
    actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
  ); INSERT INTO town_registration_settings(id) VALUES(1) ON CONFLICT DO NOTHING;`);
  await database().query(`ALTER TABLE town_registration_settings ADD COLUMN IF NOT EXISTS invite_required boolean NOT NULL DEFAULT false;
    CREATE TABLE IF NOT EXISTS town_registration_invites (
      id uuid PRIMARY KEY, code_hash text NOT NULL UNIQUE, display_hint text NOT NULL,
      created_by text REFERENCES "user"(id) ON DELETE SET NULL, created_at timestamptz NOT NULL DEFAULT now(),
      used_by text REFERENCES "user"(id) ON DELETE SET NULL, used_at timestamptz,
      revoked_at timestamptz
    );
    CREATE INDEX IF NOT EXISTS town_invites_created ON town_registration_invites(created_at DESC,id);
  `);
}
