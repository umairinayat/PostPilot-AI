"use client";

import { motion } from "framer-motion";
import { TrendingUp, Users, Star } from "lucide-react";

const stats = [
  { icon: TrendingUp, value: "2M+", label: "Posts Generated" },
  { icon: Users, value: "150K+", label: "Users" },
  { icon: Star, value: "4.9/5", label: "Rating" },
];

export function SocialProof() {
  return (
    <section className="relative py-24 sm:py-32">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-electric-500/[0.03] to-transparent" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Trusted by{" "}
            <span className="bg-gradient-to-r from-electric-400 to-electric-600 bg-clip-text text-transparent">
              50,000+
            </span>{" "}
            LinkedIn creators worldwide
          </h2>
          <p className="mt-4 text-lg text-white/40 max-w-xl mx-auto">
            Join thousands of professionals who use PostPilot AI to grow their LinkedIn presence.
          </p>
        </motion.div>

        {/* Stat cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          {stats.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="relative group rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 text-center hover:border-electric-500/20 transition-all duration-300"
              >
                <div className="w-10 h-10 rounded-lg bg-electric-500/10 border border-electric-500/20 flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-5 h-5 text-electric-400" />
                </div>
                <div className="text-3xl sm:text-4xl font-bold text-white mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-white/40">{stat.label}</div>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
