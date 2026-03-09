import { getErrorMessage } from "@/lib/utils";
import type { GeneratePostOptions, ImprovePostResult } from "@/types";

type OpenRouterMessageContent =
  | string
  | Array<{
      type?: string;
      text?: string;
    }>;

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: OpenRouterMessageContent;
    };
  }>;
};

type OpenRouterRequest = {
  model: string;
  messages: Array<{
    role: "system" | "user";
    content: string;
  }>;
  maxTokens?: number;
  temperature?: number;
};

type ImprovePostOptions = {
  content: string;
  tone?: string;
  topic?: string;
  model?: string;
};

function extractMessageContent(content: OpenRouterMessageContent | undefined) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part.text === "string" ? part.text : ""))
      .join("\n")
      .trim();
  }

  return "";
}

function normalizeHashtag(tag: string) {
  const cleaned = tag.replace(/^#+/, "").replace(/[^a-zA-Z0-9]/g, "").trim();

  if (!cleaned) {
    return null;
  }

  return `#${cleaned}`;
}

function getFallbackHashtags(content: string) {
  const words = content.match(/[A-Za-z][A-Za-z0-9]{3,}/g) ?? [];
  const hashtags = Array.from(
    new Set(words.map((word) => normalizeHashtag(word)).filter(Boolean))
  );

  return hashtags.slice(0, 5) as string[];
}

function extractJsonObject(rawText: string) {
  const cleanedText = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();
  const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);

  return jsonMatch?.[0] ?? cleanedText;
}

async function requestOpenRouter({
  model,
  messages,
  maxTokens = 1500,
  temperature = 0.85,
}: OpenRouterRequest) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "PostPilot AI",
    },
    body: JSON.stringify({
      model,
      messages,
      max_tokens: maxTokens,
      temperature,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenRouter API error: ${error}`);
  }

  const data = (await response.json()) as OpenRouterResponse;
  const rawText = extractMessageContent(data.choices?.[0]?.message?.content);

  if (!rawText) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return rawText;
}

export async function generatePosts({
  topic,
  tone,
  profileContext,
  pastPosts,
  model = "anthropic/claude-3.5-sonnet",
}: GeneratePostOptions): Promise<string[]> {
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

  try {
    const rawText = await requestOpenRouter({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Write a LinkedIn post about: ${topic}. Generate 3 variations separated by ---`,
        },
      ],
    });

    return rawText
      .split("---")
      .map((post) => post.trim())
      .filter(Boolean);
  } catch (error) {
    throw new Error(getErrorMessage(error, "Failed to generate LinkedIn posts."));
  }
}

export async function improvePostDraft({
  content,
  tone = "Storytelling",
  topic = "",
  model = "anthropic/claude-3.5-sonnet",
}: ImprovePostOptions): Promise<ImprovePostResult> {
  const systemPrompt = `
You are a LinkedIn editor.

Improve the user's draft while preserving their voice and intent.

Rules:
- Keep first-person voice
- Keep the structure readable for LinkedIn
- Improve the hook, clarity, rhythm, and ending
- Do not add fake claims or invented metrics
- Return valid JSON only
- JSON shape: {"improved_post":"string","hashtags":["#tagOne","#tagTwo"]}
- Return 3 to 5 concise hashtags
- No markdown fences
`;

  try {
    const rawText = await requestOpenRouter({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Topic: ${topic || "Not provided"}\nTone: ${tone}\n\nDraft:\n${content}`,
        },
      ],
      maxTokens: 1000,
      temperature: 0.6,
    });

    const parsedResponse = JSON.parse(extractJsonObject(rawText)) as {
      improved_post?: string;
      hashtags?: string[];
    };
    const hashtags = (parsedResponse.hashtags ?? [])
      .map((tag) => normalizeHashtag(tag))
      .filter(Boolean)
      .slice(0, 5) as string[];

    return {
      improvedPost: parsedResponse.improved_post?.trim() || content.trim(),
      hashtags: hashtags.length > 0 ? hashtags : getFallbackHashtags(content),
    };
  } catch {
    return {
      improvedPost: content.trim(),
      hashtags: getFallbackHashtags(content),
    };
  }
}
