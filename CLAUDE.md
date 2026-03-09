# PostPilot AI — CLAUDE.md

## Project Overview
**PostPilot AI** is a LinkedIn AI post generator SaaS web app.
Users enter their LinkedIn profile URL → the app scrapes/downloads their profile data → uses OpenRouter AI models to generate viral, on-brand LinkedIn posts in their authentic voice.

---

## Tech Stack
- **Frontend:** Next.js 14 (App Router) + TailwindCSS + shadcn/ui
- **Backend:** Next.js API Routes (serverless)
- **AI:** OpenRouter API (multi-model: Claude, GPT-4o, Mistral, Llama3, etc.)
- **LinkedIn Scraping:** Proxycurl API (or RapidAPI LinkedIn scraper)
- **Auth:** NextAuth.js (Google + Email magic link)
- **Database:** Supabase (PostgreSQL) — users, posts, profiles, schedules
- **Payments:** Stripe (subscription tiers)
- **Deployment:** Vercel

---

## App Name & Branding
- **Name:** PostPilot AI
- **Tagline:** "Your AI co-pilot for LinkedIn growth."
- **Colors:** Deep navy `#0A0F1E` + Electric blue `#2563EB` + Soft white `#F8FAFC`
- **Font:** Inter (UI) + Cal Sans (headings)

---

## Core Features to Build

### 1. LinkedIn Profile Importer
- Input field: user pastes their LinkedIn profile URL
- Backend calls Proxycurl API to fetch:
  - Name, headline, summary, experience, skills
  - Last 50–100 posts (if available)
- Stores profile data in Supabase under `profiles` table
- Shows a profile card preview after import

### 2. AI Post Generator
- User inputs: topic / keywords / idea (1–3 sentences)
- Optional: choose tone (Storytelling, Educational, Controversial, List, Personal)
- Optional: choose AI model from OpenRouter (Claude 3.5 Sonnet, GPT-4o, Mistral Large, etc.)
- System prompt injects the user's LinkedIn profile + past posts as style context
- Generates 3 post variations
- Each post shows: character count, estimated reach badge, copy button, edit button

### 3. Post Editor
- Rich text editor (no markdown — plain text with line breaks like LinkedIn)
- Emoji picker
- Hashtag suggester (AI-generated based on post content)
- "Regenerate" and "Improve this post" buttons

### 4. Post Scheduler (optional v2)
- Calendar UI
- Connect LinkedIn via OAuth (LinkedIn API)
- Schedule posts to auto-publish

### 5. Inspiration Feed
- Live feed of viral LinkedIn posts (fetched via scraping or third-party API)
- Filter by niche/topic
- "Write a post like this" one-click button

### 6. Analytics Dashboard (v2)
- Import post performance stats via LinkedIn API
- Show impressions, likes, comments per post
- Highlight top-performing posts

---

## Database Schema (Supabase)

```sql
-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  avatar_url text,
  plan text default 'free', -- free | pro | agency
  credits int default 5,
  created_at timestamptz default now()
);

-- LinkedIn Profiles
create table profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  linkedin_url text,
  name text,
  headline text,
  summary text,
  experience jsonb,
  skills jsonb,
  raw_posts jsonb, -- last 100 posts scraped
  scraped_at timestamptz default now()
);

-- Generated Posts
create table posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  profile_id uuid references profiles(id),
  topic text,
  tone text,
  model_used text,
  content text,
  status text default 'draft', -- draft | scheduled | published
  scheduled_at timestamptz,
  created_at timestamptz default now()
);
```

---

## OpenRouter Integration

```typescript
// lib/openrouter.ts
export async function generatePost({
  topic,
  tone,
  profileContext,
  pastPosts,
  model = "anthropic/claude-3.5-sonnet",
}: GeneratePostOptions) {
  const systemPrompt = `
You are a LinkedIn ghostwriter. Your job is to write viral LinkedIn posts.

User Profile:
${profileContext}

Their writing style (based on past posts):
${pastPosts?.slice(0, 5).join("\n---\n") ?? "No past posts available."}

Instructions:
- Write in first person
- Match their tone and vocabulary
- Use short paragraphs (1-2 lines max)
- Include a hook in the first line
- End with a call-to-action or thought-provoking question
- No hashtags unless requested
- Tone: ${tone}
`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL,
      "X-Title": "PostPilot AI",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Write a LinkedIn post about: ${topic}. Generate 3 variations separated by ---` },
      ],
      max_tokens: 1500,
      temperature: 0.85,
    }),
  });

  const data = await response.json();
  const rawText = data.choices[0].message.content;
  return rawText.split("---").map((p: string) => p.trim()).filter(Boolean);
}
```

---

## API Routes to Build

| Route | Method | Description |
|-------|--------|-------------|
| `/api/profile/import` | POST | Takes LinkedIn URL, calls Proxycurl, saves to Supabase |
| `/api/posts/generate` | POST | Takes topic+tone+profileId, calls OpenRouter, returns 3 posts |
| `/api/posts/save` | POST | Saves a generated post to DB |
| `/api/posts/list` | GET | Returns all saved posts for user |
| `/api/models/list` | GET | Returns available OpenRouter models |
| `/api/stripe/checkout` | POST | Creates Stripe checkout session |
| `/api/stripe/webhook` | POST | Handles Stripe events (subscription updates) |

---

## Pages / Routes

```
/                        → Landing page
/app                     → Dashboard (requires auth)
/app/profile             → Import LinkedIn profile
/app/generate            → Post generator
/app/posts               → Saved posts library
/app/inspiration         → Viral posts feed
/app/schedule            → Post scheduler (v2)
/app/settings            → Account + billing
/pricing                 → Pricing page
/auth/login              → Login page
/auth/signup             → Signup page
```

---

## Environment Variables

```env
# OpenRouter
OPENROUTER_API_KEY=your_key_here

# Proxycurl (LinkedIn scraper)
PROXYCURL_API_KEY=your_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# NextAuth
NEXTAUTH_SECRET=your_secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=your_google_id
GOOGLE_CLIENT_SECRET=your_google_secret

# Stripe
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_pub_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Pricing Tiers

| Plan | Price | Posts/mo | Profiles | Models |
|------|-------|----------|----------|--------|
| Free | $0 | 5 | 1 | Claude 3 Haiku only |
| Pro | $19/mo | 150 | 3 | All models |
| Agency | $49/mo | Unlimited | 10 | All models + API access |

---

## UI Component Priorities
1. Landing page with hero, features, social proof, FAQ, pricing
2. Auth pages (login/signup — clean, minimal)
3. Dashboard sidebar layout
4. Profile importer card with loading state
5. Post generator form + 3-card output layout
6. Post card with copy/edit/save/regenerate actions
7. Pricing page with toggle (monthly/annual)

---

## Code Quality Rules
- Use TypeScript everywhere
- All API calls must handle errors gracefully with toast notifications
- Loading states on all async operations (use `useTransition` or `isLoading` state)
- Mobile responsive by default (Tailwind mobile-first)
- Keep API keys server-side only — never expose in client components
- Rate limit `/api/posts/generate` with Upstash Redis (optional but recommended)

---

## Build Order (Recommended)
1. Project setup (Next.js + Tailwind + shadcn + Supabase)
2. Auth (NextAuth)
3. Landing page
4. Profile importer (Proxycurl integration)
5. Post generator (OpenRouter integration)
6. Post library (save/view/edit posts)
7. Stripe billing
8. Inspiration feed
9. Scheduler (v2)
