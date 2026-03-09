"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PostPreviewProps = {
  content: string;
};

export function PostPreview({ content }: PostPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Preview</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
            {content || "Your edited LinkedIn preview will appear here."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
