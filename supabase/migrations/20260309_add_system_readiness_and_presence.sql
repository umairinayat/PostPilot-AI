create table if not exists api_rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  route_key text not null,
  created_at timestamptz not null default now()
);

create table if not exists post_presence_sessions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  session_id text not null,
  current_field text,
  cursor_position int,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(post_id, user_id, session_id)
);

create index if not exists idx_api_rate_limit_events_lookup
  on api_rate_limit_events(user_id, route_key, created_at desc);

create index if not exists idx_post_presence_sessions_lookup
  on post_presence_sessions(post_id, last_seen_at desc);
