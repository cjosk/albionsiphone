"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import StatPill from "@/components/StatPill";
import { buildMemberSummaries, computeLedgerTotals } from "@/lib/calc";
import { db } from "@/lib/firebase";
import type { LogRecord, MemberRecord } from "@/lib/types";
import { formatDateTime } from "@/lib/time";
import { formatSiphon } from "@/lib/utils";

const SYPHON_ICON_URL = "https://render.albiononline.com/v1/item/Siphoned%20Energy.png";
const NET_FILTERS = [
  { value: "all", label: "All Balances" },
  { value: "positive", label: "Positive Net Only" },
  { value: "negative", label: "Negative Net Only" },
] as const;

type NetFilter = (typeof NET_FILTERS)[number]["value"];

function toDate(value: unknown): Date {
  if (!value) {
    return new Date(0);
  }
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  return new Date(value as string);
}

function SiphonLabel({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-2 normal-case">
      <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-[0.65rem] font-semibold text-slate-200">
        <img src={SYPHON_ICON_URL} alt="Siphoned Energy icon" className="h-4 w-4" />
        <span>Siphon</span>
      </span>
      <span>{text}</span>
    </span>
  );
}

export default function DashboardPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [netFilter, setNetFilter] = useState<NetFilter>("all");

  useEffect(() => {
    const membersRef = collection(db, "members");
    const unsubscribeMembers = onSnapshot(membersRef, (snapshot) => {
      const nextMembers = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name ?? "Unknown",
          initialBalance: typeof data.initialBalance === "number" ? data.initialBalance : 0,
          createdAt: data.createdAt ? toDate(data.createdAt) : null,
          updatedAt: data.updatedAt ? toDate(data.updatedAt) : null,
        } satisfies MemberRecord;
      });
      setMembers(nextMembers);
    });

    const logsRef = query(collection(db, "logs"), orderBy("date", "desc"));
    const unsubscribeLogs = onSnapshot(logsRef, (snapshot) => {
      const nextLogs = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          player: data.player ?? "Unknown",
          reason: data.reason === "Withdrawal" ? "Withdrawal" : "Deposit",
          amount: typeof data.amount === "number" ? data.amount : Number(data.amount ?? 0),
          date: toDate(data.date),
          note: data.note ?? null,
          createdAt: data.createdAt ? toDate(data.createdAt) : null,
          updatedAt: data.updatedAt ? toDate(data.updatedAt) : null,
        } satisfies LogRecord;
      });
      setLogs(nextLogs);
      setLoading(false);
    });

    return () => {
      unsubscribeMembers();
      unsubscribeLogs();
    };
  }, []);

  const summaries = useMemo(() => buildMemberSummaries(members, logs), [members, logs]);
  const totals = useMemo(() => computeLedgerTotals(summaries), [summaries]);
  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredSummaries = useMemo(() => {
    return summaries.filter((member) => {
      const matchesSearch = normalizedSearch
        ? member.name.toLowerCase().includes(normalizedSearch)
        : true;
      const matchesFilter =
        netFilter === "all" || (netFilter === "positive" && member.net > 0) || (netFilter === "negative" && member.net < 0);
      return matchesSearch && matchesFilter;
    });
  }, [summaries, normalizedSearch, netFilter]);

  const shouldShowSkeleton = loading && summaries.length === 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Supremacy Dashboard</h1>
        <p className="text-sm text-slate-300">
          Track Team Supremacy's siphon deposits and withdrawals in real time. Data is sourced directly from Firestore and rendered
          in the Europe/Istanbul timezone.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-[#2a2a2a] bg-[#161616] p-4 shadow-glass sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search players"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="input-field max-w-lg border-[#2a2a2a] bg-[#1c1c1c] text-sm text-slate-100 placeholder:text-slate-500"
        />
        <select
          value={netFilter}
          onChange={(event) => setNetFilter(event.target.value as NetFilter)}
          className="input-field max-w-xs border-[#2a2a2a] bg-[#1c1c1c] text-sm text-slate-100"
        >
          {NET_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <GlassCard
        title="Guild Overview"
        description="Snapshot of total deposits, withdrawals, and the Supremacy net siphon balance."
        className="rounded-xl border border-[#2a2a2a] bg-[#161616] px-5 py-4 sm:px-6 sm:py-5"
      >
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <StatPill label={<SiphonLabel text="Total Deposits" />} value={`${formatSiphon(totals.totalDeposits)}`} tone="positive" />
          <StatPill
            label={<SiphonLabel text="Total Withdrawals" />}
            value={`${formatSiphon(totals.totalWithdrawals)}`}
            tone="negative"
          />
          <StatPill
            label={<SiphonLabel text="Guild Net" />}
            value={`${formatSiphon(totals.guildNet)}`}
            tone={totals.guildNet > 0 ? "positive" : totals.guildNet < 0 ? "negative" : "neutral"}
          />
        </div>
      </GlassCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shouldShowSkeleton ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="rounded-xl border border-[#2a2a2a] bg-[#161616] px-5 py-4 shadow-glass backdrop-blur-2xl"
            >
              <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 flex flex-col gap-2">
                <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="h-8 w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-8 w-full animate-pulse rounded-full bg-white/10" />
                <div className="h-8 w-full animate-pulse rounded-full bg-white/10" />
              </div>
            </div>
          ))
        ) : filteredSummaries.length === 0 ? (
          <GlassCard
            title="No matching members"
            description="Adjust your search or import new siphon activity from the New Entry screen."
            className="rounded-xl border border-[#2a2a2a] bg-[#161616] px-5 py-4 sm:px-6"
          >
            <p className="text-sm text-slate-300">
              We couldn't find any members that match the current filters. Try clearing the search box or switch the net balance
              filter.
            </p>
          </GlassCard>
        ) : (
          filteredSummaries.map((member) => (
            <GlassCard
              key={member.name}
              className="rounded-xl border border-[#2a2a2a] bg-[#161616] px-5 py-4 sm:px-6 sm:py-5"
              title={
                <div className="flex items-center justify-between">
                  <span className="text-base font-semibold text-white">{member.name}</span>
                  <span
                    className={
                      member.net > 0
                        ? "text-supremacy-positive"
                        : member.net < 0
                        ? "text-supremacy-negative"
                        : "text-slate-400"
                    }
                  >
                    {member.net > 0 ? "▲" : member.net < 0 ? "▼" : "•"}
                  </span>
                </div>
              }
              description={member.lastActivity ? `Last activity: ${formatDateTime(member.lastActivity)}` : "Awaiting first entry"}
            >
              <div className="flex flex-col gap-2">
                <StatPill
                  label={<SiphonLabel text="Deposits" />}
                  value={`${formatSiphon(member.totalDeposits)}`}
                  tone={member.totalDeposits > 0 ? "positive" : "neutral"}
                />
                <StatPill
                  label={<SiphonLabel text="Withdrawals" />}
                  value={`${formatSiphon(member.totalWithdrawals)}`}
                  tone={member.totalWithdrawals > 0 ? "negative" : "neutral"}
                />
                <StatPill
                  label={<SiphonLabel text="Net" />}
                  value={`${formatSiphon(member.net)}`}
                  tone={member.net > 0 ? "positive" : member.net < 0 ? "negative" : "neutral"}
                />
              </div>
            </GlassCard>
          ))
        )}
      </div>
    </div>
  );
}
