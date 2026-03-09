"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";
import type { PostVersion } from "@/types";

type VersionHistoryProps = {
  versions: PostVersion[];
  restoringVersionId: string | null;
  onRestoreVersion: (versionId: string) => void;
};

export function VersionHistory({
  versions,
  restoringVersionId,
  onRestoreVersion,
}: VersionHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Version History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {versions.length > 0 ? (
          versions.map((version) => (
            <div
              key={version.id}
              className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{version.version_label || "save"}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(version.created_at)}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {version.editor_name || version.editor_email || "Unknown editor"}
              </p>
              <p className="mt-3 line-clamp-3 whitespace-pre-line text-sm text-foreground/85">
                {version.snapshot_content}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => onRestoreVersion(version.id)}
                disabled={restoringVersionId === version.id}
              >
                {restoringVersionId === version.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Restoring...
                  </>
                ) : (
                  <>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Restore version
                  </>
                )}
              </Button>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.08] p-4 text-sm text-muted-foreground">
            Version history will appear after the first manual save.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
