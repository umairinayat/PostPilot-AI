"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "How does PostPilot AI work?",
    answer:
      "Simply paste your LinkedIn profile URL, and our AI analyzes your writing style, tone, and topics. Then enter any topic or idea, choose your preferred tone and AI model, and get 3 viral post variations instantly.",
  },
  {
    question: "Is my LinkedIn data safe?",
    answer:
      "Absolutely. We only access publicly available profile information. Your data is encrypted and never shared with third parties. You can delete your data at any time.",
  },
  {
    question: "How is this different from ChatGPT?",
    answer:
      "PostPilot AI is specifically designed for LinkedIn. It learns YOUR writing style from your past posts and generates content that sounds authentically like you, not generic AI content.",
  },
  {
    question: "Which AI models can I use?",
    answer:
      "Free users get Claude 3 Haiku. Pro and Agency users can choose from Claude 3.5 Sonnet, GPT-4o, Mistral Large, Llama 3.1, and more.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes! No contracts, no commitments. Cancel your subscription anytime and keep access until the end of your billing period.",
  },
  {
    question: "Do you offer a free plan?",
    answer:
      "Yes! Our free plan includes 5 posts per month with 1 LinkedIn profile. No credit card required to get started.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative py-24 sm:py-32">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-electric-500/[0.02] to-transparent" />

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="text-electric-500 text-sm font-semibold uppercase tracking-wider">
            FAQ
          </span>
          <h2 className="font-heading mt-3 text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-lg text-white/40 max-w-xl mx-auto">
            Everything you need to know about PostPilot AI.
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left text-base text-white hover:text-electric-400">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-base leading-relaxed">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
