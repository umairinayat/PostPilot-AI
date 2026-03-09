"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Calendar,
  FileText,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  ShieldCheck,
  Sparkles,
  User,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ErrorBoundary } from "@/components/error-boundary";
import { cn, getInitials } from "@/lib/utils";

const navItems = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/profile", label: "My Profile", icon: User },
  { href: "/app/generate", label: "Generate Post", icon: Wand2 },
  { href: "/app/inspiration", label: "Inspiration", icon: Sparkles },
  { href: "/app/posts", label: "My Posts", icon: FileText },
  { href: "/app/schedule", label: "Schedule", icon: Calendar },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/system", label: "System", icon: ShieldCheck },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const user = {
    name: session?.user.name ?? "PostPilot User",
    email: session?.user.email ?? "",
    plan: session?.user.plan ?? "free",
    credits: session?.user.credits ?? 5,
  };

  const isActive = (href: string) => {
    if (href === "/app") {
      return pathname === "/app";
    }

    return pathname.startsWith(href);
  };

  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      <div className="p-6">
        <Link href="/app" className="flex items-center gap-1">
          <span className="text-xl font-bold tracking-tight text-white">PostPilot</span>
          <span className="text-xl font-bold tracking-tight text-electric-400">AI</span>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map((item) => {
          const active = isActive(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-electric-500/15 text-electric-300"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-5 w-5 shrink-0",
                  active ? "text-electric-300" : "text-muted-foreground"
                )}
              />
              {item.label}
              {active && (
                <motion.div
                  layoutId="active-nav"
                  className="absolute left-0 h-8 w-[3px] rounded-r-full bg-electric-400"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-4 p-4">
        {user.plan === "free" && (
          <Link href="/pricing">
            <div className="cursor-pointer rounded-lg border border-electric-500/20 bg-gradient-to-r from-electric-500/20 to-electric-600/10 p-3 transition-colors hover:border-electric-500/40">
              <div className="mb-1 flex items-center gap-2">
                <Zap className="h-4 w-4 text-electric-300" />
                <span className="text-sm font-medium text-electric-300">
                  Upgrade to Pro
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Unlock premium models and higher monthly limits.
              </p>
            </div>
          </Link>
        )}

        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Credits
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">{user.credits}</p>
        </div>

        <Separator />

        <div className="flex items-center gap-3 px-2">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="text-xs">
              {getInitials(user.name || "PostPilot User")}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full justify-start"
          onClick={() => signOut({ callbackUrl: "/auth/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="hidden border-r border-white/[0.08] bg-navy-100/50 backdrop-blur-xl lg:fixed lg:inset-y-0 lg:left-0 lg:flex lg:w-[280px] lg:flex-col">
        <SidebarContent />
      </aside>

      <div className="sticky top-0 z-40 flex items-center gap-4 border-b border-white/[0.08] bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open sidebar menu"
          onClick={() => setSidebarOpen(true)}
          className="shrink-0"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Link href="/app" className="flex items-center gap-1">
          <span className="text-lg font-bold tracking-tight text-white">PostPilot</span>
          <span className="text-lg font-bold tracking-tight text-electric-400">AI</span>
        </Link>
      </div>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-white/[0.08] bg-background lg:hidden"
            >
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close sidebar menu"
                onClick={() => setSidebarOpen(false)}
                className="absolute right-4 top-4"
              >
                <X className="h-5 w-5" />
              </Button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <main className="lg:pl-[280px]">
        <div className="mx-auto max-w-7xl p-6 md:p-8 lg:p-10">
          <ErrorBoundary>{children}</ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
