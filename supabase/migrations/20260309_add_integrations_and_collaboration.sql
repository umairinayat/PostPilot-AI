alter table if exists users
  add column if not exists stripe_customer_id text,
  add column if not exists linkedin_member_id text,
  add column if not exists linkedin_profile_name text,
  add column if not exists linkedin_access_token text,
  add column if not exists linkedin_refresh_token text,
  add column if not exists linkedin_token_expires_at timestamptz,
  add column if not exists linkedin_connected_at timestamptz,
  add column if not exists linkedin_auto_publish_enabled boolean default true;

alter table if exists posts
  add column if not exists updated_at timestamptz default now();

create table if not exists post_collaborators (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  permission text not null default 'edit',
  added_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create table if not exists post_versions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  editor_user_id uuid not null references users(id) on delete cascade,
  snapshot_content text not null,
  snapshot_topic text,
  snapshot_tone text,
  version_label text default 'manual_save',
  created_at timestamptz not null default now()
);

create index if not exists idx_users_stripe_customer_id on users(stripe_customer_id);
create index if not exists idx_users_linkedin_member_id on users(linkedin_member_id);
create index if not exists idx_post_collaborators_user_id on post_collaborators(user_id);
create index if not exists idx_post_versions_post_id on post_versions(post_id, created_at desc);
