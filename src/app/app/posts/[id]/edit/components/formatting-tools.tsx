"use client";

import { Loader2, SmilePlus, Sparkles, Tags } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const QUICK_EMOJIS = ["🔥", "💡", "🚀", "🎯", "👏", "📈", "✅", "🤝"];

type FormattingToolsProps = {
  metrics: { characters: number; words: number; paragraphs: number };
  hashtags: string[];
  isImproving: boolean;
  onInsertEmoji: (emoji: string) => void;
  onImprove: () => void;
  onInsertHashtag: (tag: string) => void;
};

export function FormattingTools({
  metrics,
  hashtags,
  isImproving,
  onInsertEmoji,
  onImprove,
  onInsertHashtag,
}: FormattingToolsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Formatting Tools</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
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
                aria-label={`Insert emoji ${emoji}`}
                onClick={() => onInsertEmoji(emoji)}
              >
                {emoji}
              </Button>
            ))}
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={onImprove}
          disabled={isImproving}
        >
          {isImproving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Improving with AI...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Improve draft and suggest hashtags
            </>
          )}
        </Button>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Draft metrics
          </p>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{metrics.characters}</p>
              <p className="text-xs text-muted-foreground">Characters</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{metrics.words}</p>
              <p className="text-xs text-muted-foreground">Words</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">{metrics.paragraphs}</p>
              <p className="text-xs text-muted-foreground">Paragraphs</p>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Tags className="h-4 w-4 text-electric-300" />
            Hashtag suggestions
          </div>
          {hashtags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  aria-label={`Insert hashtag ${tag}`}
                  onClick={() => onInsertHashtag(tag)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-xs text-foreground transition-colors hover:border-electric-500/30 hover:bg-electric-500/10"
                >
                  {tag}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Run AI improvement to generate hashtag ideas based on the current draft.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
