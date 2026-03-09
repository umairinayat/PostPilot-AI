# Live Verification Checklist

Use this after deploying or after applying Supabase migrations.

## 1. Apply migrations

Run against the target Supabase project:

```bash
npx supabase db push
```

Confirm these migration files are present and applied:

- `supabase/migrations/20260309_add_integrations_and_collaboration.sql`
- `supabase/migrations/20260309_add_inspiration_and_analytics.sql`
- `supabase/migrations/20260309_add_system_readiness_and_presence.sql`
- `supabase/migrations/20260309_add_rls_policies.sql`

## 2. Validate readiness page

- Sign in as a real user.
- Open `/app/system`.
- Confirm required env checks are green.
- Confirm database tables are reachable.

## 3. Validate RLS in Supabase

In Supabase SQL editor, verify sensitive tables are RLS-enabled and `inspiration_posts` remains readable:

```sql
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'users',
    'profiles',
    'posts',
    'post_collaborators',
    'post_versions',
    'post_metric_snapshots',
    'inspiration_posts',
    'post_presence_sessions',
    'api_rate_limit_events'
  )
order by tablename;
```

## 4. Validate realtime collaboration

Use two different accounts in two browsers.

- Account A opens `/app/posts/[id]/edit`
- Account B is added as collaborator, then opens the same editor
- Confirm both see `Realtime connected`
- Confirm live presence updates when focus moves between `topic`, `tone`, and `content`
- Save from account A and confirm account B sees the remote update warning
- Reload latest on account B and confirm content/version history updates

## 5. Validate LinkedIn flow

- Connect LinkedIn in `/app/settings`
- Publish one post from `/app/schedule`
- Confirm `linkedin_post_id`, `published_url`, and `published_at` populate in `posts`
- Open `/app/analytics` and import metrics

## 6. Validate Stripe flow

- Start checkout from `/pricing`
- Complete checkout in test mode
- Open billing portal from `/app/settings`
- Confirm `stripe_customer_id` is stored on the `users` row

## 7. Validate inspiration sync

- Trigger sync from `/app/inspiration`
- Confirm `inspiration_posts` rows exist and `synced_at` updates
- If using an external feed, confirm `source = 'external'`
