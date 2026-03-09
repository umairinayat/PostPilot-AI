"use client";

import { useEffect, useState } from "react";
import { Loader2, Sparkles, SmilePlus, Tags } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { showToast } from "@/components/ui/toaster";
import { getErrorMessage } from "@/lib/utils";
import type { ImprovePostResult } from "@/types";

const QUICK_EMOJIS = ["🔥", "💡", "🚀", "🎯", "👏", "📈", "🤝", "✅"];

type PostEditorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialContent: string;
  title?: string;
  description?: string;
  topic?: string;
  tone?: string;
  saveLabel?: string;
  onSave: (content: string) => Promise<void> | void;
};

export function PostEditorDialog({
  open,
  onOpenChange,
  initialContent,
  title = "Edit Post",
  description = "Refine your draft, add hashtags, and polish the final version.",
  topic,
  tone,
  saveLabel = "Save Changes",
  onSave,
}: PostEditorDialogProps) {
  const [content, setContent] = useState(initialContent);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [isImproving, setIsImproving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setContent(initialContent);
      setHashtags([]);
    }
  }, [initialContent, open]);

  const appendToContent = (snippet: string) => {
    setContent((currentContent) => {
      if (!currentContent.trim()) {
        return snippet;
      }

      if (snippet.startsWith("#")) {
        const normalizedContent = currentContent.trimEnd();
        const spacer = normalizedContent.includes("\n\n") ? "\n" : "\n\n";
        return `${normalizedContent}${spacer}${snippet}`;
      }

      const separator = /[\s\n]$/.test(currentContent) ? "" : " ";
      return `${currentContent}${separator}${snippet}`;
    });
  };

  const handleImprove = async () => {
    if (!content.trim()) {
      showToast({
        title: "Draft required",
        description: "Add some draft text before using AI improvement.",
        variant: "destructive",
      });
      return;
    }

    setIsImproving(true);

    try {
      const response = await fetch("/api/posts/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          topic,
          tone,
        }),
      });

      const data = (await response.json()) as Partial<ImprovePostResult> & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to improve draft.");
      }

      if (data.improvedPost) {
        setContent(data.improvedPost);
      }

      setHashtags(data.hashtags ?? []);
      showToast({
        title: "Draft improved",
        description: "AI refined your post and suggested hashtags.",
        variant: "success",
      });
    } catch (error) {
      showToast({
        title: "Improvement failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsImproving(false);
    }
  };

  const handleSave = async () => {
    if (!content.trim()) {
      showToast({
        title: "Draft required",
        description: "Your post cannot be empty.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      await onSave(content.trim());
      onOpenChange(false);
    } catch (error) {
      showToast({
        title: "Save failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">Draft</p>
              <Badge variant="outline" className="text-xs">
                {content.length} characters
              </Badge>
            </div>
            <Textarea
              value={content}
              onChange={(event) => setContent(event.target.value)}
              rows={12}
              className="min-h-[260px]"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <SmilePlus className="h-4 w-4 text-electric-300" />
                Quick emoji insert
              </div>
              <div className="flex flex-wrap gap-2">
                {QUICK_EMOJIS.map((emoji) => (
                  <Button
                    key={emoji}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendToContent(emoji)}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Tags className="h-4 w-4 text-electric-300" />
                Suggested hashtags
              </div>
              {hashtags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((hashtag) => (
                    <button
                      key={hashtag}
                      type="button"
                      onClick={() => appendToContent(hashtag)}
                      className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-foreground transition-colors hover:border-electric-500/30 hover:bg-electric-500/10"
                    >
                      {hashtag}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Run AI improvement to generate tailored hashtag ideas.
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleImprove}
            disabled={isImproving || isSaving}
          >
            {isImproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Improving...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Improve with AI
              </>
            )}
          </Button>
          <Button type="button" onClick={handleSave} disabled={isSaving || isImproving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              saveLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
