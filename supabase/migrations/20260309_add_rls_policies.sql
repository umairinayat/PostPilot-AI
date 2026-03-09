alter table if exists public.users enable row level security;
alter table if exists public.profiles enable row level security;
alter table if exists public.posts enable row level security;
alter table if exists public.post_collaborators enable row level security;
alter table if exists public.post_versions enable row level security;
alter table if exists public.post_metric_snapshots enable row level security;
alter table if exists public.inspiration_posts enable row level security;
alter table if exists public.post_presence_sessions enable row level security;
alter table if exists public.api_rate_limit_events enable row level security;

revoke all on table public.users from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.posts from anon, authenticated;
revoke all on table public.post_collaborators from anon, authenticated;
revoke all on table public.post_versions from anon, authenticated;
revoke all on table public.post_metric_snapshots from anon, authenticated;
revoke all on table public.post_presence_sessions from anon, authenticated;
revoke all on table public.api_rate_limit_events from anon, authenticated;

grant select on table public.inspiration_posts to anon, authenticated;

drop policy if exists inspiration_posts_public_read on public.inspiration_posts;

create policy inspiration_posts_public_read
on public.inspiration_posts
for select
to anon, authenticated
using (true);
