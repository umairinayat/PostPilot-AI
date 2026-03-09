import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-lg bg-white/[0.08]", className)}
      {...props}
    />
  );
}

export { Skeleton };
