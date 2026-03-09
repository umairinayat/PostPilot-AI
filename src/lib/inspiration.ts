import { getServiceSupabase } from "@/lib/supabase";
import { getErrorMessage } from "@/lib/utils";
import type { InspirationPost } from "@/types";

type ExternalInspirationFeedResponse =
  | InspirationPost[]
  | {
      posts?: InspirationPost[];
      data?: InspirationPost[];
    };

export const curatedInspirationPosts: InspirationPost[] = [
  {
    id: "founder-pricing-01",
    external_id: "founder-pricing-01",
    author_name: "Maya Chen",
    author_role: "B2B SaaS Founder",
    niche: "Founder",
    topic: "Raising prices after finding product-market fit",
    tone: "Storytelling",
    format: "Founder lesson",
    hook: "We doubled our price and lost zero customers.",
    excerpt:
      "For months I treated pricing like a fear problem. The real issue was positioning. Once we stopped selling software and started selling faster decision-making, the price became the proof.",
    takeaways: [
      "Lead with the business outcome, not the feature list.",
      "Pricing anxiety usually points to unclear value communication.",
      "Show the cost of inaction before presenting the price.",
    ],
    likes: 1842,
    comments: 126,
    estimated_reach: "High",
    source: "curated",
  },
  {
    id: "marketing-campaign-02",
    external_id: "marketing-campaign-02",
    author_name: "Elena Ruiz",
    author_role: "Demand Gen Lead",
    niche: "Marketing",
    topic: "Why one campaign beat twelve disconnected experiments",
    tone: "Educational",
    format: "Framework",
    hook: "Our best quarter came from doing less marketing, not more.",
    excerpt:
      "We stopped running scattered channel tests and built one clear narrative across landing page, email, paid social, and sales follow-up. Consistency outperformed novelty.",
    takeaways: [
      "One core message can outperform many tactical experiments.",
      "Channel alignment compounds conversion lift.",
      "Repeatability beats constant reinvention.",
    ],
    likes: 1398,
    comments: 88,
    estimated_reach: "High",
    source: "curated",
  },
  {
    id: "product-roadmap-03",
    external_id: "product-roadmap-03",
    author_name: "Jordan Patel",
    author_role: "Product Director",
    niche: "Product",
    topic: "What changed when we replaced roadmap debates with customer evidence",
    tone: "Educational",
    format: "Operator insight",
    hook: "The loudest opinion in the room used to decide our roadmap.",
    excerpt:
      "Now every major roadmap discussion starts with three clips from customer calls, one usage pattern, and one risk. Meetings became shorter and decisions became calmer.",
    takeaways: [
      "Bring direct customer evidence into roadmap conversations.",
      "Shared evidence reduces unproductive debate.",
      "Decision systems matter as much as product intuition.",
    ],
    likes: 1120,
    comments: 64,
    estimated_reach: "Medium",
    source: "curated",
  },
  {
    id: "engineering-mentorship-04",
    external_id: "engineering-mentorship-04",
    author_name: "Priya Nair",
    author_role: "Staff Engineer",
    niche: "Engineering",
    topic: "The leadership shift from solving code problems to clearing team bottlenecks",
    tone: "Personal",
    format: "Career reflection",
    hook: "My promotion happened when I wrote less code.",
    excerpt:
      "I thought leadership meant having the best technical answer. In practice, it meant removing ambiguity, making trade-offs visible, and giving other engineers room to move faster.",
    takeaways: [
      "Technical leadership often looks like leverage, not raw output.",
      "Clarity is one of the highest-impact engineering skills.",
      "Promotions follow business impact more than heroics.",
    ],
    likes: 1655,
    comments: 142,
    estimated_reach: "High",
    source: "curated",
  },
  {
    id: "sales-discovery-05",
    external_id: "sales-discovery-05",
    author_name: "Andre Lewis",
    author_role: "Enterprise AE",
    niche: "Sales",
    topic: "The discovery question that changed my close rate",
    tone: "Controversial",
    format: "Sales lesson",
    hook: "Most discovery calls fail before the buyer speaks.",
    excerpt:
      "Reps ask for pain points too early. I now ask what internal pressure forced this project to become urgent. That one question tells me more than ten surface-level prompts.",
    takeaways: [
      "Urgency beats curiosity in sales discovery.",
      "Internal pressure reveals real buying dynamics.",
      "Better questions create better pipeline quality.",
    ],
    likes: 978,
    comments: 57,
    estimated_reach: "Medium",
    source: "curated",
  },
  {
    id: "career-transition-06",
    external_id: "career-transition-06",
    author_name: "Nina Brooks",
    author_role: "Career Coach",
    niche: "Career",
    topic: "What I learned from helping senior operators tell a stronger career story",
    tone: "List-based",
    format: "Advice post",
    hook: "Great experience gets ignored when the story is weak.",
    excerpt:
      "The strongest profiles don't list every task. They make one thing obvious: the kind of problems this person solves under pressure. Specificity creates momentum.",
    takeaways: [
      "A career story should center on repeatable strengths.",
      "Specific examples are stronger than broad claims.",
      "Profiles should signal trajectory, not just history.",
    ],
    likes: 1246,
    comments: 101,
    estimated_reach: "High",
    source: "curated",
  },
];

function normalizeTakeaways(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string");
  }

  return [];
}

export function normalizeInspirationPost(
  post: Partial<InspirationPost>,
  index: number,
  source: string,
  sourceUrl?: string | null
): InspirationPost {
  const externalId = post.external_id ?? post.id ?? `inspiration-${source}-${index + 1}`;

  return {
    id: post.id ?? externalId,
    external_id: externalId,
    author_name: post.author_name ?? "Unknown author",
    author_role: post.author_role ?? "",
    niche: post.niche ?? "General",
    topic: post.topic ?? "Untitled topic",
    tone: post.tone ?? "Educational",
    format: post.format ?? "Insight",
    hook: post.hook ?? post.topic ?? "Untitled hook",
    excerpt: post.excerpt ?? "",
    takeaways: normalizeTakeaways(post.takeaways),
    likes: Number(post.likes ?? 0),
    comments: Number(post.comments ?? 0),
    estimated_reach: post.estimated_reach ?? "Unknown",
    source,
    source_url: post.source_url ?? sourceUrl ?? null,
    collected_at: post.collected_at ?? new Date().toISOString(),
    synced_at: post.synced_at ?? new Date().toISOString(),
  };
}

function mapPostToDbRecord(post: InspirationPost) {
  return {
    external_id: post.external_id ?? post.id,
    author_name: post.author_name,
    author_role: post.author_role,
    niche: post.niche,
    topic: post.topic,
    tone: post.tone,
    format: post.format,
    hook: post.hook,
    excerpt: post.excerpt,
    takeaways: post.takeaways,
    likes: post.likes,
    comments: post.comments,
    estimated_reach: post.estimated_reach,
    source: post.source ?? "curated",
    source_url: post.source_url ?? null,
    collected_at: post.collected_at ?? new Date().toISOString(),
    synced_at: post.synced_at ?? new Date().toISOString(),
  };
}

export async function fetchExternalInspirationFeed() {
  const sourceUrl = process.env.INSPIRATION_FEED_URL;

  if (!sourceUrl) {
    return null;
  }

  const headers: HeadersInit = {};

  if (process.env.INSPIRATION_FEED_API_KEY) {
    headers[process.env.INSPIRATION_FEED_API_HEADER || "Authorization"] =
      process.env.INSPIRATION_FEED_API_HEADER === "Authorization"
        ? `Bearer ${process.env.INSPIRATION_FEED_API_KEY}`
        : process.env.INSPIRATION_FEED_API_KEY;
  }

  const response = await fetch(sourceUrl, { headers, next: { revalidate: 900 } });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Inspiration feed sync failed: ${error}`);
  }

  const payload = (await response.json()) as ExternalInspirationFeedResponse;
  const items = Array.isArray(payload)
    ? payload
    : payload.posts ?? payload.data ?? [];

  return items.map((item, index) =>
    normalizeInspirationPost(item, index, "external", sourceUrl)
  );
}

export async function upsertInspirationFeed(posts: InspirationPost[]) {
  const supabase = getServiceSupabase();
  const records = posts.map(mapPostToDbRecord);
  const { error } = await supabase
    .from("inspiration_posts")
    .upsert(records, { onConflict: "external_id" });

  if (error) {
    throw new Error(error.message);
  }
}

export async function ensureInspirationFeedSeeded() {
  const supabase = getServiceSupabase();
  const { count, error } = await supabase
    .from("inspiration_posts")
    .select("id", { count: "exact", head: true });

  if (error) {
    throw new Error(error.message);
  }

  if ((count ?? 0) === 0) {
    const now = new Date().toISOString();
    await upsertInspirationFeed(
      curatedInspirationPosts.map((post) => ({
        ...post,
        collected_at: now,
        synced_at: now,
      }))
    );
  }
}

export async function syncInspirationFeed() {
  try {
    const externalPosts = await fetchExternalInspirationFeed();

    if (externalPosts && externalPosts.length > 0) {
      await upsertInspirationFeed(externalPosts);
      return { source: "external", count: externalPosts.length };
    }
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to sync inspiration feed"));
  }

  const now = new Date().toISOString();
  const fallbackPosts = curatedInspirationPosts.map((post) => ({
    ...post,
    collected_at: now,
    synced_at: now,
    source: "curated",
  }));
  await upsertInspirationFeed(fallbackPosts);

  return { source: "curated", count: fallbackPosts.length };
}
