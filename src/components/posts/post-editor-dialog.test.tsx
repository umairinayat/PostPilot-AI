import React from "react";
import type { ReactNode } from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PostEditorDialog } from "./post-editor-dialog";

const { showToastMock } = vi.hoisted(() => ({
  showToastMock: vi.fn(),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogDescription: ({ children }: { children: ReactNode }) => <p>{children}</p>,
  DialogFooter: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/toaster", () => ({
  showToast: showToastMock,
}));

describe("PostEditorDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("improves, augments, and saves the draft", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();

    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        improvedPost: "Improved draft",
        hashtags: ["#ai", "#linkedin"],
      }),
    } as Response);

    render(
      <PostEditorDialog
        open
        onOpenChange={onOpenChange}
        initialContent="Initial draft"
        topic="Thought leadership"
        tone="Educational"
        onSave={onSave}
      />
    );

    const textbox = screen.getByRole("textbox");
    await user.click(screen.getByRole("button", { name: "🔥" }));
    expect(textbox).toHaveValue("Initial draft 🔥");

    await user.click(screen.getByRole("button", { name: /Improve with AI/i }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        "/api/posts/improve",
        expect.objectContaining({ method: "POST" })
      );
    });

    expect(await screen.findByRole("button", { name: "#ai" })).toBeInTheDocument();
    expect(textbox).toHaveValue("Improved draft");

    await user.click(screen.getByRole("button", { name: "#ai" }));
    await user.click(screen.getByRole("button", { name: /Save Changes/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("Improved draft\n\n#ai");
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
