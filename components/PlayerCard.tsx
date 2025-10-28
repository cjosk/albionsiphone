"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { formatDateTime } from "@/lib/time";
import { formatSiphon } from "@/lib/utils";
import type { MemberSummary } from "@/lib/calc";
import type { LogRecord } from "@/lib/types";

const SYPHON_ICON_URL = "https://render.albiononline.com/v1/item/Siphoned%20Energy.png";

interface PlayerCardProps {
  summary: MemberSummary;
  logs: LogRecord[];
}

const collapseVariants = {
  hidden: { height: 0, opacity: 0 },
  visible: { height: "auto", opacity: 1 },
};

function StatRow({ label, value, tone }: { label: string; value: string; tone: "positive" | "negative" | "neutral" }) {
  const toneClass =
    tone === "positive"
      ? "text-supremacy-positive"
      : tone === "negative"
        ? "text-supremacy-negative"
        : "text-slate-300";

  return (
    <div className="flex items-center justify-between text-xs font-medium">
      <span className="flex items-center gap-2 text-slate-300">
        <img src={SYPHON_ICON_URL} alt="SIPHONE enerjisi simgesi" className="h-4 w-4" />
        {label}
      </span>
      <span className={toneClass}>{value}</span>
    </div>
  );
}

export function PlayerCard({ summary, logs }: PlayerCardProps) {
  const [expanded, setExpanded] = useState(false);
  const topFiveLogs = logs.slice(0, 5);

  return (
    <div className="flex h-full flex-col rounded-xl border border-supremacy-border bg-supremacy-surface/90 p-3 shadow-glass transition-transform duration-150 hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-white">{summary.name}</h3>
          <p className="text-[11px] text-slate-400">
            Son işlem: {summary.lastActivity ? formatDateTime(summary.lastActivity) : "Kayıt yok"}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="rounded-full border border-supremacy-border px-3 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-supremacy-primary hover:text-white"
        >
          {expanded ? "Kapat" : "Profili Gör"}
        </button>
      </div>

      <div className="mt-3 space-y-2">
        <StatRow
          label="Yatırılan Enerji"
          value={`${formatSiphon(summary.totalDeposits)}`}
          tone={summary.totalDeposits > 0 ? "positive" : "neutral"}
        />
        <StatRow
          label="Çekilen Enerji"
          value={`${formatSiphon(summary.totalWithdrawals)}`}
          tone={summary.totalWithdrawals > 0 ? "negative" : "neutral"}
        />
        <StatRow
          label="Net Enerji"
          value={`${formatSiphon(summary.net)}`}
          tone={summary.net > 0 ? "positive" : summary.net < 0 ? "negative" : "neutral"}
        />
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Son 5 İşlem</p>
        <ul className="space-y-1">
          {topFiveLogs.length === 0 ? (
            <li className="text-[11px] text-slate-500">Henüz kayıt yok.</li>
          ) : (
            topFiveLogs.map((log) => (
              <li
                key={log.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-supremacy-border/40 bg-black/20 px-3 py-2 text-[11px]"
              >
                <span className="text-slate-300">{formatDateTime(log.date)}</span>
                <span className="text-slate-400">{log.reason === "Withdrawal" ? "Çekim" : "Yatırım"}</span>
                <span className={log.reason === "Withdrawal" ? "text-supremacy-negative" : "text-supremacy-positive"}>
                  {log.reason === "Withdrawal" ? "-" : "+"}
                  {formatSiphon(Math.abs(log.amount))}
                </span>
              </li>
            ))
          )}
        </ul>
      </div>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            className="mt-4 overflow-hidden rounded-xl border border-supremacy-border/60 bg-black/30"
            initial="hidden"
            animate="visible"
            exit="hidden"
            variants={collapseVariants}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="space-y-4 p-4">
              <div className="space-y-1">
                <h4 className="text-sm font-semibold text-white">Detaylı Kayıtlar</h4>
                <p className="text-xs text-slate-400">{summary.name} için tüm işlemler kronolojik olarak listelenir.</p>
              </div>
              <ul className="space-y-2 text-xs">
                {logs.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-supremacy-border/60 bg-black/10 px-3 py-4 text-center text-slate-500">
                    Henüz kayıt yok.
                  </li>
                ) : (
                  logs.map((log) => (
                    <li
                      key={`expanded-${log.id}`}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-supremacy-border/40 bg-black/20 px-3 py-2"
                    >
                      <span className="text-slate-200">{formatDateTime(log.date)}</span>
                      <span className="text-slate-400">{log.reason === "Withdrawal" ? "Çekim" : "Yatırım"}</span>
                      <span className={log.amount < 0 ? "text-supremacy-negative" : "text-supremacy-positive"}>
                        {log.amount < 0 ? "-" : "+"}
                        {formatSiphon(Math.abs(log.amount))}
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default PlayerCard;
