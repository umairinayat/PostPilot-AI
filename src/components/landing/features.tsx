"use client";

import { motion } from "framer-motion";
import { Sparkles, Wand2, Brain, Send } from "lucide-react";

const features = [
  {
    icon: Sparkles,
    title: "AI Profile Analysis",
    description:
      "Import your LinkedIn profile and let AI learn your unique writing voice, tone, and style from your past posts.",
  },
  {
    icon: Wand2,
    title: "Smart Post Generator",
    description:
      "Generate 3 viral post variations on any topic. Choose your tone: storytelling, educational, controversial, or personal.",
  },
  {
    icon: Brain,
    title: "Multi-Model AI",
    description:
      "Choose from top AI models: Claude, GPT-4o, Mistral, and more. Each brings a unique flavor to your content.",
  },
  {
    icon: Send,
    title: "One-Click Publishing",
    description:
      "Copy, edit, and save your posts. Schedule them for optimal engagement times.",
  },
];

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function Features() {
  return (
    <section id="features" className="relative py-24 sm:py-32">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-electric-500 text-sm font-semibold uppercase tracking-wider">
            Features
          </span>
          <h2 className="font-heading mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-electric-400 to-electric-600 bg-clip-text text-transparent">
              Dominate LinkedIn
            </span>
          </h2>
          <p className="mt-4 text-lg text-white/40 max-w-2xl mx-auto">
            Powerful AI tools designed specifically for LinkedIn creators who want to grow their audience and influence.
          </p>
        </motion.div>

        {/* Feature cards grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                variants={cardVariants}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-sm p-8 hover:border-electric-500/30 hover:bg-white/[0.04] transition-all duration-300"
              >
                {/* Hover glow */}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-electric-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                <div className="relative z-10">
                  {/* Icon */}
                  <div className="w-12 h-12 rounded-xl bg-electric-500/10 border border-electric-500/20 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-electric-400" />
                  </div>

                  {/* Title */}
                  <h3 className="font-heading text-xl font-semibold text-white mb-3">
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p className="text-white/40 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
