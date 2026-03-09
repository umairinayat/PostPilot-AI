alter table if exists posts
  add column if not exists linkedin_post_id text,
  add column if not exists published_at timestamptz,
  add column if not exists published_url text,
  add column if not exists latest_reactions int default 0,
  add column if not exists latest_comments int default 0,
  add column if not exists latest_impressions int,
  add column if not exists latest_engagement_rate numeric(10,4),
  add column if not exists last_metrics_synced_at timestamptz;

create table if not exists inspiration_posts (
  id uuid primary key default gen_random_uuid(),
  external_id text unique,
  author_name text not null,
  author_role text,
  niche text,
  topic text,
  tone text,
  format text,
  hook text,
  excerpt text,
  takeaways jsonb default '[]'::jsonb,
  likes int default 0,
  comments int default 0,
  estimated_reach text,
  source text default 'curated',
  source_url text,
  collected_at timestamptz default now(),
  synced_at timestamptz default now()
);

create table if not exists post_metric_snapshots (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  linkedin_post_id text,
  reactions int default 0,
  comments int default 0,
  impressions int,
  engagement_rate numeric(10,4),
  captured_at timestamptz not null default now()
);

create index if not exists idx_inspiration_posts_synced_at on inspiration_posts(synced_at desc);
create index if not exists idx_post_metric_snapshots_post_id on post_metric_snapshots(post_id, captured_at desc);
create index if not exists idx_post_metric_snapshots_user_id on post_metric_snapshots(user_id, captured_at desc);
