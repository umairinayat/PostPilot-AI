"use client";

import { Loader2, UserPlus, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { PostCollaborator, PostPresenceSession } from "@/types";

type CollaboratorOwner = {
  user_id: string;
  name: string | null;
  email: string;
};

type CollaboratorsPanelProps = {
  owner: CollaboratorOwner | null;
  collaborators: PostCollaborator[];
  presenceSessions: PostPresenceSession[];
  canManageCollaborators: boolean;
  realtimeConnected: boolean;
  activeField: string | null;
  cursorPosition: number | null;
  collaboratorEmail: string;
  isInvitingCollaborator: boolean;
  removingCollaboratorId: string | null;
  onCollaboratorEmailChange: (email: string) => void;
  onAddCollaborator: () => void;
  onRemoveCollaborator: (userId: string) => void;
};

export function CollaboratorsPanel({
  owner,
  collaborators,
  presenceSessions,
  canManageCollaborators,
  realtimeConnected,
  activeField,
  cursorPosition,
  collaboratorEmail,
  isInvitingCollaborator,
  removingCollaboratorId,
  onCollaboratorEmailChange,
  onAddCollaborator,
  onRemoveCollaborator,
}: CollaboratorsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Collaborators</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-foreground">Live presence</p>
              <p className="text-xs text-muted-foreground">
                Current field: {activeField ?? "idle"}
                {cursorPosition !== null ? ` · Cursor ${cursorPosition}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={realtimeConnected ? "success" : "outline"}>
                {realtimeConnected ? "Realtime connected" : "Realtime reconnecting"}
              </Badge>
              <Badge variant="outline">{presenceSessions.length} active</Badge>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {presenceSessions.length > 0 ? (
              presenceSessions.map((session) => (
                <div
                  key={`${session.session_id}-${session.user_id}`}
                  className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2"
                >
                  <p className="text-sm font-medium text-foreground">
                    {session.name || session.email}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.current_field ? `Editing ${session.current_field}` : "Viewing"}
                    {typeof session.cursor_position === "number"
                      ? ` · Cursor ${session.cursor_position}`
                      : ""}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground">
                No active editing sessions detected right now.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <Users className="h-4 w-4 text-electric-300" />
            Owner
          </div>
          <p className="mt-2 font-medium text-foreground">
            {owner?.name || owner?.email || "Unknown"}
          </p>
          {owner?.email && (
            <p className="text-xs text-muted-foreground">{owner.email}</p>
          )}
        </div>

        {collaborators.length > 0 ? (
          <div className="space-y-2">
            {collaborators.map((collaborator) => (
              <div
                key={collaborator.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-foreground">
                    {collaborator.name || collaborator.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{collaborator.email}</p>
                </div>
                {canManageCollaborators ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove collaborator ${collaborator.name || collaborator.email}`}
                    onClick={() => onRemoveCollaborator(collaborator.user_id)}
                    disabled={removingCollaboratorId === collaborator.user_id}
                  >
                    {removingCollaboratorId === collaborator.user_id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                ) : (
                  <Badge variant="outline">Editor</Badge>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No collaborators yet. Invite another PostPilot user by email.
          </p>
        )}

        {canManageCollaborators && (
          <div className="space-y-2">
            <Label htmlFor="collaborator-email">Invite collaborator</Label>
            <div className="flex gap-2">
              <Input
                id="collaborator-email"
                value={collaboratorEmail}
                onChange={(event) => onCollaboratorEmailChange(event.target.value)}
                placeholder="teammate@example.com"
              />
              <Button onClick={onAddCollaborator} disabled={isInvitingCollaborator}>
                {isInvitingCollaborator ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Invite
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
