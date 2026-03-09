"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      await signIn("google", { callbackUrl: "/app" });
    } catch (error) {
      console.error("Sign up error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-2 group">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-electric-400 to-electric-600 flex items-center justify-center shadow-lg shadow-electric-500/25">
          <svg
            className="h-5 w-5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
            />
          </svg>
        </div>
        <span className="text-xl font-bold text-foreground">
          PostPilot <span className="text-electric-400">AI</span>
        </span>
      </Link>

      {/* Card */}
      <Card className="w-full">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold">Get Started Free</CardTitle>
          <CardDescription>
            Create your PostPilot AI account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Google Sign Up */}
          <Button
            variant="outline"
            size="lg"
            className="w-full relative"
            onClick={handleGoogleSignUp}
            disabled={isLoading}
          >
            <svg
              className="mr-2 h-5 w-5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            {isLoading ? "Signing up..." : "Sign up with Google"}
          </Button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">
                or continue with
              </span>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Create Account Button */}
          <div className="relative group">
            <Button
              variant="default"
              size="lg"
              className="w-full"
              disabled
            >
              Create Account
            </Button>
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-navy-50 text-xs text-muted-foreground rounded-lg border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              Coming soon
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-electric-400 hover:text-electric-300 font-medium transition-colors"
            >
              Sign in
            </Link>
          </p>

          {/* No credit card badge */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg
              className="h-3.5 w-3.5 text-emerald-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            No credit card required
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
