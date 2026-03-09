"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

const rotatingWords = ["Your Voice", "Your Style", "Your Brand"];

export function Hero() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % rotatingWords.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-electric-500/20 blur-[128px] animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-electric-700/15 blur-[100px] animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full bg-electric-500/10 blur-[80px] animate-pulse [animation-delay:2s]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-electric-500/30 bg-electric-500/10 text-electric-400 text-sm font-medium mb-8"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-electric-500" />
            </span>
            Your AI co-pilot for LinkedIn growth
          </motion.div>

          {/* Heading */}
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white leading-[1.1]">
            <span className="block">Create Viral LinkedIn Posts</span>
            <span className="block mt-2">
              With AI That Knows{" "}
            </span>
            <span className="block mt-2 relative h-[1.2em]">
              <AnimatePresence mode="wait">
                <motion.span
                  key={rotatingWords[wordIndex]}
                  initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -20, filter: "blur(8px)" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="absolute inset-x-0 bg-gradient-to-r from-electric-400 via-electric-500 to-electric-300 bg-clip-text text-transparent"
                >
                  {rotatingWords[wordIndex]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          {/* Subheading */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 text-lg sm:text-xl text-white/50 max-w-2xl mx-auto leading-relaxed"
          >
            PostPilot AI analyzes your LinkedIn profile and writing style to generate
            authentic, engaging posts that grow your audience.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="xl" asChild>
              <Link href="/auth/signup" className="group">
                Start Generating Posts — Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="xl" asChild>
              <Link href="#features">
                <Play className="mr-2 w-4 h-4" />
                See How It Works
              </Link>
            </Button>
          </motion.div>

          {/* Stats row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-12"
          >
            {[
              { value: "2.3x", label: "More Impressions" },
              { value: "10x", label: "Faster Writing" },
              { value: "50k+", label: "Posts Generated" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</span>
                <span className="text-sm text-white/40">{stat.label}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-navy-300 to-transparent" />
    </section>
  );
}
