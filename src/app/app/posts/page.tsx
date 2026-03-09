"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileText,
  Copy,
  Pencil,
  Trash2,
  Check,
  Loader2,
  Wand2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { showToast } from "@/components/ui/toaster";
import { formatDate, truncate } from "@/lib/utils";
import { TONES } from "@/types";
import type { GeneratedPost } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function PostsPage() {
  const [posts, setPosts] = useState<GeneratedPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterTone, setFilterTone] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<string>("newest");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Delete dialog state
  const [deletingPost, setDeletingPost] = useState<GeneratedPost | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPosts = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/posts/list");
      if (!response.ok) throw new Error("Failed to fetch posts.");
      const data = await response.json();
      setPosts(data.posts || []);
    } catch {
      showToast({
        title: "Error",
        description: "Failed to load posts.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast({
        title: "Copied to clipboard!",
        description: "Post text has been copied.",
      });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showToast({
        title: "Copy failed",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deletingPost) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/posts/save`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingPost.id }),
      });
      if (!response.ok) throw new Error("Failed to delete post.");
      setPosts((prev) => prev.filter((p) => p.id !== deletingPost.id));
      setDeletingPost(null);
      showToast({
        title: "Post deleted",
        description: "The post has been removed.",
      });
    } catch {
      showToast({
        title: "Delete failed",
        description: "Could not delete the post.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter and sort
  const filteredPosts = posts
    .filter((post) => {
      if (filterTone === "all") return true;
      return post.tone === filterTone;
    })
    .sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
      className="space-y-8"
    >
      {/* Page Header */}
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold text-foreground">My Posts</h1>
        <p className="text-muted-foreground mt-1">
          All your saved and generated posts
        </p>
      </motion.div>

      {/* Filter Bar */}
      <motion.div variants={fadeInUp}>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="w-full sm:w-48">
            <Select value={filterTone} onValueChange={setFilterTone}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tones</SelectItem>
                {TONES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-48">
            <Select value={sortOrder} onValueChange={setSortOrder}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* Loading Skeletons */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
                <Skeleton className="h-4 w-24" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Posts Grid */}
      {!isLoading && filteredPosts.length > 0 && (
        <motion.div
          variants={fadeInUp}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full flex flex-col hover:border-white/20 transition-colors">
                <CardContent className="p-5 flex-1 flex flex-col">
                  {/* Badges */}
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Badge
                      variant={post.status === "scheduled" ? "success" : "outline"}
                      className="text-xs"
                    >
                      {post.status}
                    </Badge>
                    {post.tone && (
                      <Badge variant="default" className="text-xs">
                        {post.tone}
                      </Badge>
                    )}
                    {post.model_used && (
                      <Badge variant="outline" className="text-xs">
                        {post.model_used.split("/").pop()}
                      </Badge>
                    )}
                  </div>

                  {/* Content Preview */}
                  <p className="text-sm text-foreground/80 flex-1 mb-3 leading-relaxed">
                    {truncate(post.content, 150)}
                  </p>

                  {/* Date */}
                  <p className="text-xs text-muted-foreground mb-3">
                    {formatDate(post.created_at)}
                  </p>

                  {/* Actions */}
                  <div className="flex items-center gap-1 pt-3 border-t border-white/[0.08]">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleCopy(post.content, post.id)}
                      title="Copy post"
                    >
                      {copiedId === post.id ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                      <Link href={`/app/posts/${post.id}/edit`} title="Open full editor">
                        <Pencil className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => setDeletingPost(post)}
                      title="Delete post"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && filteredPosts.length === 0 && (
        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <div className="mx-auto w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-1">
                  {posts.length === 0
                    ? "No posts yet"
                    : "No posts match your filters"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {posts.length === 0
                    ? "Head to the generator to create your first post!"
                    : "Try adjusting your filter to see more posts."}
                </p>
                {posts.length === 0 && (
                  <Link href="/app/generate">
                    <Button>
                      <Wand2 className="h-4 w-4 mr-2" />
                      Generate Your First Post
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deletingPost}
        onOpenChange={(open) => {
          if (!open) setDeletingPost(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Post</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          {deletingPost && (
            <div className="p-3 rounded-lg bg-white/5 text-sm text-muted-foreground">
              {truncate(deletingPost.content, 100)}
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
