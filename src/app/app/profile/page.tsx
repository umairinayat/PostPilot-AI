"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Briefcase, Clock, FileText, Link as LinkIcon, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { showToast } from "@/components/ui/toaster";
import { formatDate, getErrorMessage, getInitials } from "@/lib/utils";
import type { Profile } from "@/types";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function ProfilePage() {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadCurrentProfile = async () => {
      try {
        const response = await fetch("/api/profile/import");

        if (!response.ok) {
          throw new Error("Failed to load your imported profile.");
        }

        const data = (await response.json()) as { profile?: Profile | null };

        if (!cancelled && data.profile) {
          setProfile(data.profile);
          setLinkedinUrl(data.profile.linkedin_url);
        }
      } catch {
        if (!cancelled) {
          showToast({
            title: "Profile unavailable",
            description: "You can still import a fresh LinkedIn profile below.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCurrentProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  const isValidUrl = (url: string) => url.includes("linkedin.com/in/");

  const handleImport = async () => {
    if (!linkedinUrl.trim()) {
      setError("Please enter a LinkedIn profile URL.");
      return;
    }

    if (!isValidUrl(linkedinUrl)) {
      setError("Please enter a valid LinkedIn profile URL that includes linkedin.com/in/.");
      return;
    }

    setError("");
    setIsImporting(true);

    try {
      const response = await fetch("/api/profile/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkedinUrl: linkedinUrl.trim() }),
      });

      const data = (await response.json()) as { error?: string; profile?: Profile };

      if (!response.ok || !data.profile) {
        throw new Error(data.error || "Failed to import profile.");
      }

      setProfile(data.profile);
      setLinkedinUrl(data.profile.linkedin_url);
      showToast({
        title: "Profile imported",
        description: "Your LinkedIn context is ready for post generation.",
        variant: "success",
      });
    } catch (importError) {
      showToast({
        title: "Import failed",
        description: getErrorMessage(importError, "Please try again."),
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const showSkeleton = isLoading || isImporting;

  return (
    <motion.div
      initial="initial"
      animate="animate"
      variants={{ animate: { transition: { staggerChildren: 0.1 } } }}
      className="space-y-8"
    >
      <motion.div variants={fadeInUp}>
        <h1 className="text-3xl font-bold text-foreground">LinkedIn Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Import your LinkedIn profile so PostPilot can mirror your experience, tone, and topics.
        </p>
      </motion.div>

      <motion.div variants={fadeInUp}>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Your Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="linkedin-url">LinkedIn Profile URL</Label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <LinkIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="linkedin-url"
                    placeholder="https://linkedin.com/in/your-profile"
                    value={linkedinUrl}
                    onChange={(event) => {
                      setLinkedinUrl(event.target.value);
                      setError("");
                    }}
                    className="pl-10"
                    disabled={isImporting}
                  />
                </div>
                <Button onClick={handleImport} disabled={isImporting}>
                  {isImporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : profile ? (
                    "Refresh Profile"
                  ) : (
                    "Import Profile"
                  )}
                </Button>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <p className="text-xs text-muted-foreground">
                We use your public profile data and recent activity to shape more authentic drafts.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {showSkeleton && (
        <motion.div variants={fadeInUp}>
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-72" />
                </div>
              </div>
              <Separator />
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
              <Separator />
              <div className="space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {profile && !showSkeleton && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-electric-500/20 text-xl font-bold text-electric-300">
                  {getInitials(profile.name || "LinkedIn User")}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-bold text-foreground">{profile.name}</h2>
                  <p className="text-muted-foreground">{profile.headline}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    {profile.raw_posts?.length > 0 && (
                      <Badge>
                        <FileText className="mr-1 h-3 w-3" />
                        {profile.raw_posts.length} Posts
                      </Badge>
                    )}
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      Updated {formatDate(profile.scraped_at)}
                    </Badge>
                  </div>
                </div>
              </div>

              {profile.summary && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-foreground">About</h3>
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {profile.summary}
                    </p>
                  </div>
                </>
              )}

              {profile.experience?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Experience</h3>
                    <div className="space-y-4">
                      {profile.experience.map((experience, index) => (
                        <div key={`${experience.company}-${index}`} className="flex gap-3">
                          <div className="h-fit shrink-0 rounded-lg bg-white/5 p-2">
                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {experience.title}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {experience.company}
                            </p>
                            {experience.description && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {experience.description}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {profile.skills?.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">Skills</h3>
                    <div className="flex flex-wrap gap-2">
                      {profile.skills.map((skill) => (
                        <Badge key={skill} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}
