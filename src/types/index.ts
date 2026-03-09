export interface User {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  plan: "free" | "pro" | "agency";
  credits: number;
   stripe_customer_id?: string | null;
   linkedin_member_id?: string | null;
   linkedin_profile_name?: string | null;
   linkedin_connected_at?: string | null;
   linkedin_auto_publish_enabled?: boolean;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  linkedin_url: string;
  name: string;
  headline: string;
  summary: string;
  experience: Experience[];
  skills: string[];
  raw_posts: LinkedInPost[];
  scraped_at: string;
}

export interface Experience {
  title: string;
  company: string;
  description: string;
  starts_at: { day: number; month: number; year: number } | null;
  ends_at: { day: number; month: number; year: number } | null;
}

export interface LinkedInPost {
  text: string;
  num_likes: number;
  num_comments: number;
  time: string;
}

export interface GeneratedPost {
  id: string;
  user_id: string;
  profile_id: string | null;
  topic: string;
  tone: string;
  model_used: string;
  content: string;
  status: "draft" | "scheduled" | "published";
  scheduled_at: string | null;
  created_at: string;
  updated_at?: string | null;
  linkedin_post_id?: string | null;
  published_at?: string | null;
  published_url?: string | null;
  latest_reactions?: number | null;
  latest_comments?: number | null;
  latest_impressions?: number | null;
  latest_engagement_rate?: number | null;
  last_metrics_synced_at?: string | null;
}

export interface GeneratePostOptions {
  topic: string;
  tone: string;
  profileContext: string;
  pastPosts?: string[];
  model?: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  badge: string;
}

export interface ImprovePostResult {
  improvedPost: string;
  hashtags: string[];
}

export interface PostVersion {
  id: string;
  post_id: string;
  editor_user_id: string;
  snapshot_content: string;
  snapshot_topic: string | null;
  snapshot_tone: string | null;
  version_label: string | null;
  created_at: string;
  editor_name?: string | null;
  editor_email?: string | null;
}

export interface PostCollaborator {
  id: string;
  post_id: string;
  user_id: string;
  permission: string;
  added_at: string;
  name: string | null;
  email: string;
}

export interface PostPresenceSession {
  session_id: string;
  post_id: string;
  user_id: string;
  current_field: string | null;
  cursor_position: number | null;
  last_seen_at: string;
  name: string | null;
  email: string;
}

export interface InspirationPost {
  id: string;
  external_id?: string | null;
  author_name: string;
  author_role: string;
  niche: string;
  topic: string;
  tone: Tone;
  format: string;
  hook: string;
  excerpt: string;
  takeaways: string[];
  likes: number;
  comments: number;
  estimated_reach: string;
  source?: string | null;
  source_url?: string | null;
  collected_at?: string | null;
  synced_at?: string | null;
}

export interface AnalyticsSnapshot {
  id: string;
  post_id: string;
  user_id: string;
  linkedin_post_id: string | null;
  reactions: number;
  comments: number;
  impressions: number | null;
  engagement_rate: number | null;
  captured_at: string;
}

export interface AnalyticsSummary {
  totalPosts: number;
  totalPublishedPosts: number;
  syncedPosts: number;
  totalReactions: number;
  totalComments: number;
  totalImpressions: number;
  averageEngagementRate: number;
  topTone: string;
  topPost: {
    id: string;
    topic: string;
    reactions: number;
    comments: number;
  } | null;
  toneDistribution: Array<{ label: string; count: number }>;
  statusDistribution: Array<{ label: string; count: number }>;
  recentSnapshots: AnalyticsSnapshot[];
  suggestions: string[];
  lastImportedAt: string | null;
}

export interface ReadinessCheck {
  key: string;
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  required: boolean;
  category: "environment" | "database" | "integration" | "user";
}

export interface ReadinessReport {
  overallStatus: "ready" | "attention";
  checks: ReadinessCheck[];
  checkedAt: string;
}

export const TONES = [
  "Storytelling",
  "Educational",
  "Controversial",
  "List-based",
  "Personal",
] as const;

export type Tone = (typeof TONES)[number];

export const OPENROUTER_MODELS: OpenRouterModel[] = [
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", badge: "Best Quality" },
  { id: "openai/gpt-4o", name: "GPT-4o", badge: "Popular" },
  { id: "mistralai/mistral-large-latest", name: "Mistral Large", badge: "Fast" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B", badge: "Free Tier" },
  { id: "anthropic/claude-3-haiku", name: "Claude 3 Haiku", badge: "Fast & Cheap" },
];

export const INSPIRATION_NICHES = [
  "All",
  "Founder",
  "Marketing",
  "Product",
  "Engineering",
  "Sales",
  "Career",
] as const;

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    postsPerMonth: 5,
    profiles: 1,
    models: ["anthropic/claude-3-haiku"],
    features: ["5 posts/month", "1 LinkedIn profile", "Claude 3 Haiku model", "Basic post editor"],
  },
  pro: {
    name: "Pro",
    price: 19,
    postsPerMonth: 150,
    profiles: 3,
    models: "all",
    features: ["150 posts/month", "3 LinkedIn profiles", "All AI models", "Advanced editor", "Priority support"],
  },
  agency: {
    name: "Agency",
    price: 49,
    postsPerMonth: -1, // -1 represents unlimited; use isUnlimitedPosts() helper
    profiles: 10,
    models: "all",
    features: ["Unlimited posts", "10 LinkedIn profiles", "All AI models + API access", "Team collaboration", "Dedicated support"],
  },
} as const;

export function isUnlimitedPosts(plan: keyof typeof PLANS) {
  return PLANS[plan].postsPerMonth === -1;
}
