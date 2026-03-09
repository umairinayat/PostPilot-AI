"use client";

import Link from "next/link";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  Product: [
    { label: "Features", href: "/#features" },
    { label: "Pricing", href: "/pricing" },
    { label: "API", href: "/pricing" },
  ],
  Company: [
    { label: "About", href: "/#features" },
    { label: "Blog", href: "/pricing" },
    { label: "Careers", href: "/auth/signup" },
  ],
  Legal: [
    { label: "Privacy", href: "/pricing" },
    { label: "Terms", href: "/pricing" },
    { label: "Contact", href: "/auth/login" },
  ],
};

export function Footer() {
  return (
    <footer className="relative border-t border-white/[0.06] bg-navy-300/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12">
          {/* Brand column */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center gap-0.5">
              <span className="text-xl font-bold text-white tracking-tight">PostPilot</span>
              <span className="text-xl font-bold text-electric-500 tracking-tight">AI</span>
            </Link>
            <p className="mt-4 text-sm text-white/40 max-w-xs leading-relaxed">
              Your AI co-pilot for LinkedIn growth. Generate authentic, engaging posts that sound like you.
            </p>

            {/* Social links placeholder */}
            <div className="mt-6 flex items-center gap-4">
              {["Twitter", "LinkedIn", "GitHub"].map((social) => (
                <Link
                  key={social}
                  href="/auth/signup"
                  className="text-xs text-white/30 hover:text-white/60 transition-colors"
                >
                  {social}
                </Link>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-sm font-semibold text-white mb-4">{category}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/40 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/30">
            &copy; 2024 PostPilot AI. All rights reserved.
          </p>
          <p className="text-sm text-white/20">
            Built for LinkedIn creators who want more.
          </p>
        </div>
      </div>
    </footer>
  );
}
