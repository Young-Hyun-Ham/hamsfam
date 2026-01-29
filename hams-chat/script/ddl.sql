-- =========================
-- Extensions / Schema
-- =========================
create extension if not exists pgcrypto;

create schema if not exists chat;

-- =========================
-- Enums
-- =========================
do $$ begin
  create type chat.room_type as enum ('dm', 'group');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type chat.message_type as enum ('text', 'system');
exception when duplicate_object then null;
end $$;

-- =========================
-- Users (app profile)
-- =========================
create table if not exists chat.users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique,
  display_name  text not null,
  avatar_url    text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_users_email on chat.users(email);

-- =========================
-- Lucia sessions
-- (Lucia adapter를 Postgres로 쓰는 경우)
-- =========================
create table if not exists chat.sessions (
  id           text primary key,            -- lucia session id (string)
  user_id      uuid not null references chat.users(id) on delete cascade,
  expires_at   timestamptz not null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_sessions_user on chat.sessions(user_id);
create index if not exists idx_sessions_expires on chat.sessions(expires_at);

-- =========================
-- Rooms
-- =========================
create table if not exists chat.rooms (
  id           uuid primary key default gen_random_uuid(),
  type         chat.room_type not null,
  title        text,                        -- group일 때 사용, dm은 null 허용
  created_by   uuid references chat.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- DM 방 중복 생성 방지용 키(선택)
  -- dm일 때만 값 채우는 방식 권장: "dm:{minUserId}:{maxUserId}"
  dm_key       text unique
);

create index if not exists idx_rooms_type on chat.rooms(type);
create index if not exists idx_rooms_updated on chat.rooms(updated_at desc);

-- =========================
-- Room Members
-- =========================
create table if not exists chat.room_members (
  room_id      uuid not null references chat.rooms(id) on delete cascade,
  user_id      uuid not null references chat.users(id) on delete cascade,
  role         text not null default 'member',  -- 'owner' | 'admin' | 'member' 등
  joined_at    timestamptz not null default now(),
  last_seen_at timestamptz,
  primary key (room_id, user_id)
);

create index if not exists idx_room_members_user on chat.room_members(user_id);

-- =========================
-- Messages
-- =========================
create table if not exists chat.messages (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references chat.rooms(id) on delete cascade,
  sender_id    uuid references chat.users(id) on delete set null, -- 시스템 메시지는 null 가능
  type         chat.message_type not null default 'text',

  content      text,                         -- text/system 메시지 본문
  metadata     jsonb not null default '{}'::jsonb, -- 확장(예: 시나리오/slot/버튼 등)

  -- 수정/삭제(soft delete)
  edited_at    timestamptz,
  deleted_at   timestamptz,

  created_at   timestamptz not null default now()
);

-- 방별 최신 메시지 조회/페이징 최적화
create index if not exists idx_messages_room_created
  on chat.messages(room_id, created_at desc);

create index if not exists idx_messages_sender
  on chat.messages(sender_id, created_at desc);

-- =========================
-- Attachments
-- =========================
create table if not exists chat.message_attachments (
  id           uuid primary key default gen_random_uuid(),
  message_id   uuid not null references chat.messages(id) on delete cascade,
  kind         text not null,                 -- 'image' | 'file' | 'video' 등
  url          text not null,                 -- 보통 supabase storage public/signed url
  file_name    text,
  mime_type    text,
  byte_size    bigint,
  created_at   timestamptz not null default now()
);

create index if not exists idx_attachments_message on chat.message_attachments(message_id);

-- =========================
-- Reactions
-- =========================
create table if not exists chat.message_reactions (
  message_id   uuid not null references chat.messages(id) on delete cascade,
  user_id      uuid not null references chat.users(id) on delete cascade,
  emoji        text not null,                 -- 👍 ❤️ 😂 등
  created_at   timestamptz not null default now(),
  primary key (message_id, user_id, emoji)
);

create index if not exists idx_reactions_message on chat.message_reactions(message_id);

-- =========================
-- Reads (유저별 마지막 읽은 메시지)
-- =========================
create table if not exists chat.message_reads (
  room_id       uuid not null references chat.rooms(id) on delete cascade,
  user_id       uuid not null references chat.users(id) on delete cascade,
  last_read_message_id uuid references chat.messages(id) on delete set null,
  last_read_at  timestamptz not null default now(),
  primary key (room_id, user_id)
);

create index if not exists idx_reads_user on chat.message_reads(user_id);

-- =========================
-- updated_at 자동 갱신(선택)
-- =========================
create or replace function chat.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_users_touch on chat.users;
create trigger trg_users_touch
before update on chat.users
for each row execute function chat.touch_updated_at();

drop trigger if exists trg_rooms_touch on chat.rooms;
create trigger trg_rooms_touch
before update on chat.rooms
for each row execute function chat.touch_updated_at();
