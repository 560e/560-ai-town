import {database} from '../lib/server/db.ts';
import type {Pool} from 'pg';
export async function migrateMultiplayer(target:Pick<Pool,'query'>=database()){await target.query(`
CREATE TABLE IF NOT EXISTS town_presence(
 user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
 session_id text NOT NULL REFERENCES session(id) ON DELETE CASCADE,
 owner uuid NOT NULL,room integer NOT NULL CHECK(room>0),online boolean NOT NULL DEFAULT true,
 pose jsonb NOT NULL,seq integer NOT NULL DEFAULT 0,
 joined_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS town_presence_room ON town_presence(room,updated_at) WHERE online;
CREATE TABLE IF NOT EXISTS town_rooms(
 number integer PRIMARY KEY CHECK(number BETWEEN 1 AND 999999),instance uuid NOT NULL UNIQUE,
 created_by text REFERENCES "user"(id) ON DELETE SET NULL,password_hash text,
 created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO town_rooms(number,instance) VALUES(1,gen_random_uuid()) ON CONFLICT DO NOTHING;
ALTER TABLE town_presence ADD COLUMN IF NOT EXISTS room_instance uuid;
ALTER TABLE town_presence ADD COLUMN IF NOT EXISTS exit_reason text;
ALTER TABLE town_presence ADD COLUMN IF NOT EXISTS speech jsonb;
UPDATE town_presence SET room=1,room_instance=(SELECT instance FROM town_rooms WHERE number=1),online=false,speech=null WHERE room_instance IS NULL;
ALTER TABLE town_presence ADD COLUMN IF NOT EXISTS last_speech_at timestamptz;
ALTER TABLE town_presence ADD COLUMN IF NOT EXISTS last_invite_at timestamptz;
CREATE TABLE IF NOT EXISTS town_private_chat(
 id uuid PRIMARY KEY,
 inviter text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 recipient text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
 inviter_owner uuid NOT NULL,recipient_owner uuid NOT NULL,
 room integer NOT NULL,status text NOT NULL CHECK(status IN ('pending','active','closed')),
 messages jsonb NOT NULL DEFAULT '[]',expires_at timestamptz NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),CHECK(inviter<>recipient)
);
ALTER TABLE town_presence ADD COLUMN IF NOT EXISTS scene text NOT NULL DEFAULT 'town';
ALTER TABLE town_presence ADD COLUMN IF NOT EXISTS scene_poses jsonb NOT NULL DEFAULT '{}';
ALTER TABLE town_private_chat ADD COLUMN IF NOT EXISTS scene text NOT NULL DEFAULT 'town';
ALTER TABLE town_private_chat ADD COLUMN IF NOT EXISTS room_instance uuid;
UPDATE town_private_chat c SET room_instance=r.instance FROM town_rooms r WHERE c.room=r.number AND c.room_instance IS NULL;
CREATE INDEX IF NOT EXISTS town_private_chat_inviter ON town_private_chat(inviter,updated_at);
CREATE INDEX IF NOT EXISTS town_private_chat_recipient ON town_private_chat(recipient,updated_at);
`);}
