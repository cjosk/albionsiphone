import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type StatTone = "positive" | "negative" | "neutral";

interface StatPillProps {
  label: ReactNode;
  value: ReactNode;
  tone?: StatTone;
}

const toneMap: Record<StatTone, string> = {
  positive: "bg-supremacy-positive/15 text-supremacy-positive border-supremacy-positive/50",
  negative: "bg-supremacy-negative/15 text-supremacy-negative border-supremacy-negative/50",
  neutral: "bg-white/10 text-slate-200 border-white/20",
};

export function StatPill({ label, value, tone = "neutral" }: StatPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium backdrop-blur",
        toneMap[tone],
      )}
    >
      <span className="text-xs uppercase tracking-wide text-slate-300/80">{label}</span>
      <span className="font-semibold text-base leading-none">{value}</span>
    </span>
  );
}

export default StatPill;
