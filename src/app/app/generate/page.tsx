"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Bookmark,
  Check,
  Copy,
  Loader2,
  PencilLine,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { PostEditorDialog } from "@/components/posts/post-editor-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/utils";
import { OPENROUTER_MODELS, PLANS, TONES } from "@/types";
import type { Profile } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function GeneratePage() {
  const { data: session } = useSession();
  const [topic, setTopic] = useState("");
  const [tone, setTone] = useState<string>(TONES[0]);
  const [model, setModel] = useState(OPENROUTER_MODELS[0].id);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [posts, setPosts] = useState<string[]>([]);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [seedSource, setSeedSource] = useState<string | null>(null);
  const hasSeededQuery = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      try {
        const response = await fetch("/api/profile/import");

        if (!response.ok) {
          throw new Error("Failed to load profile context.");
        }

        const data = (await response.json()) as { profile?: Profile | null };

        if (!cancelled) {
          setProfile(data.profile ?? null);
        }
      } catch {
        if (!cancelled) {
          setProfile(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const allowedModels = useMemo(() => {
    if (session?.user.plan === "free") {
      return OPENROUTER_MODELS.filter(
        (availableModel) => availableModel.id === PLANS.free.models[0]
      );
    }

    return OPENROUTER_MODELS;
  }, [session?.user.plan]);

  useEffect(() => {
    if (!allowedModels.some((availableModel) => availableModel.id === model)) {
      setModel(allowedModels[0]?.id ?? OPENROUTER_MODELS[0].id);
    }
  }, [allowedModels, model]);

  useEffect(() => {
    if (hasSeededQuery.current) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    hasSeededQuery.current = true;

    const searchParams = new URLSearchParams(window.location.search);
    const seededTopic = searchParams.get("topic");
    const seededTone = searchParams.get("tone");
    const source = searchParams.get("source");

    if (seededTopic && !topic) {
      setTopic(seededTopic);
    }

    if (seededTone && TONES.includes(seededTone as (typeof TONES)[number])) {
      setTone(seededTone);
    }

    if (source) {
      setSeedSource(source);
    }
  }, [topic]);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      showToast({
        title: "Topic required",
        description: "Please describe what you want to write about.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setPosts([]);

    try {
      const response = await fetch("/api/posts/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim(),
          tone,
          model,
          profileId: profile?.id,
        }),
      });

      const data = (await response.json()) as { error?: string; posts?: string[] };

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate posts.");
      }

      setPosts(data.posts ?? []);
      showToast({
        title: "Posts generated",
        description: "Three draft variations are ready for review.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Generation failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      showToast({
        title: "Copied to clipboard",
        description: "Your draft is ready to paste into LinkedIn.",
      });
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      showToast({
        title: "Copy failed",
        description: "Could not copy the draft to your clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleSave = async (content: string, index: number) => {
    setSavingIndex(index);

    try {
      const response = await fetch("/api/posts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          topic: topic.trim(),
          tone,
          model_used: model,
          profile_id: profile?.id,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to save post.");
      }

      showToast({
        title: "Post saved",
        description: "Your draft is now available in the post library.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Save failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setSavingIndex(null);
    }
  };

  const handleVariationSave = async (content: string) => {
    if (editingIndex === null) {
      return;
    }

    setPosts((currentPosts) =>
      currentPosts.map((post, index) => (index === editingIndex ? content : post))
    );
    showToast({
      title: "Variation updated",
      description: "Your edits are saved in this draft variation.",
      variant: "success",
    });
  };

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
      className="space-y-8"
    >
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold text-foreground">Generate Post</h1>
        <p className="mt-1 text-muted-foreground">
          Turn rough ideas into polished LinkedIn drafts shaped by your profile context.
        </p>
      </motion.div>

      <motion.div variants={fadeInUp} className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Post Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="topic">What do you want to write about?</Label>
              <Textarea
                id="topic"
                placeholder="Share the lesson, story, framework, or opinion you want to turn into a LinkedIn post."
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                rows={5}
                className="min-h-[140px]"
                disabled={isGenerating}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tone</Label>
                <Select value={tone} onValueChange={setTone} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a tone" />
                  </SelectTrigger>
                  <SelectContent>
                    {TONES.map((availableTone) => (
                      <SelectItem key={availableTone} value={availableTone}>
                        {availableTone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>AI Model</Label>
                <Select value={model} onValueChange={setModel} disabled={isGenerating}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedModels.map((availableModel) => (
                      <SelectItem key={availableModel.id} value={availableModel.id}>
                        <span className="flex items-center gap-2">
                          {availableModel.name}
                          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                            {availableModel.badge}
                          </Badge>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              size="lg"
              className="w-full sm:w-auto"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate 3 Variations
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Generation Context</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingProfile ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            ) : profile ? (
              <>
                <Badge variant="success">Profile context ready</Badge>
                <div>
                  <p className="font-medium text-foreground">{profile.name}</p>
                  <p className="text-sm text-muted-foreground">{profile.headline}</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  {profile.raw_posts?.length ?? 0} recent posts and your profile summary will shape the drafts.
                </p>
              </>
            ) : (
              <>
                <Badge variant="outline">No profile imported yet</Badge>
                <p className="text-sm text-muted-foreground">
                  You can still generate posts, but importing your LinkedIn profile will improve voice matching.
                </p>
                <Button variant="outline" asChild>
                  <Link href="/app/profile">Import LinkedIn profile</Link>
                </Button>
              </>
            )}

            {seedSource && (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/75">
                Seeded from inspiration: <span className="font-medium text-foreground">{seedSource}</span>
              </div>
            )}

            {session?.user.plan === "free" && (
              <div className="rounded-lg border border-electric-500/20 bg-electric-500/5 p-4 text-sm text-white/75">
                Free plan users generate with {PLANS.free.models[0].split("/").pop()} only.
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {isGenerating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 gap-4 lg:grid-cols-3"
        >
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
                <div className="flex items-center justify-between pt-2">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                    <Skeleton className="h-8 w-8 rounded-lg" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {posts.length > 0 && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="mb-4 text-lg font-semibold text-foreground">Generated Variations</h2>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {posts.map((post, index) => (
              <motion.div
                key={`${post.slice(0, 24)}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="flex h-full flex-col">
                  <CardContent className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-center gap-2">
                      <Badge>Variation {index + 1}</Badge>
                    </div>
                    <div className="mb-4 flex-1">
                      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                        {post}
                      </p>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/[0.08] pt-3">
                      <Badge variant="outline" className="text-xs">
                        {post.length} chars
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopy(post, index)}
                          title="Copy post"
                        >
                          {copiedIndex === index ? (
                            <Check className="h-4 w-4 text-green-400" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingIndex(index)}
                          title="Edit post"
                        >
                          <PencilLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleSave(post, index)}
                          disabled={savingIndex === index}
                          title="Save post"
                        >
                          {savingIndex === index ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Bookmark className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={handleGenerate}
                          title="Regenerate"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {posts.length === 0 && !isGenerating && (
        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-electric-500/10">
                  <Sparkles className="h-6 w-6 text-electric-400" />
                </div>
                <h3 className="mb-1 font-medium text-foreground">Ready to create</h3>
                <p className="text-sm text-muted-foreground">
                  Share your idea, choose the tone, and let PostPilot generate three LinkedIn-ready drafts.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <PostEditorDialog
        open={editingIndex !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingIndex(null);
          }
        }}
        initialContent={editingIndex !== null ? posts[editingIndex] ?? "" : ""}
        title={editingIndex !== null ? `Edit Variation ${editingIndex + 1}` : "Edit Variation"}
        description="Refine the draft, add a few emojis, and let AI suggest stronger wording and hashtags."
        topic={topic}
        tone={tone}
        saveLabel="Update Variation"
        onSave={handleVariationSave}
      />
    </motion.div>
  );
}
