"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import PlayerCard from "@/components/PlayerCard";
import StatPill from "@/components/StatPill";
import { buildMemberSummaries } from "@/lib/calc";
import { db, listenToGuildSettings } from "@/lib/firebase";
import type { LogRecord, MemberRecord } from "@/lib/types";
import { formatSiphon } from "@/lib/utils";

const NET_FILTERS = [
  { value: "all", label: "All Balances" },
  { value: "positive", label: "Positive Net Only" },
  { value: "negative", label: "Negative Net Only" },
] as const;

const SYPHON_ICON_URL = "https://render.albiononline.com/v1/item/Siphoned%20Energy.png";

type NetFilter = (typeof NET_FILTERS)[number]["value"];

type GuildSettingsState = {
  siphonTotal: number;
};

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

export default function DashboardPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [netFilter, setNetFilter] = useState<NetFilter>("all");
  const [guildSettings, setGuildSettings] = useState<GuildSettingsState>({ siphonTotal: 0 });

  useEffect(() => {
    const unsubscribeSettings = listenToGuildSettings((settings) => setGuildSettings(settings));

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
      unsubscribeSettings();
    };
  }, []);

  const summaries = useMemo(() => buildMemberSummaries(members, logs), [members, logs]);

  const logsByPlayer = useMemo(() => {
    const map = new Map<string, LogRecord[]>();
    logs.forEach((log) => {
      const key = log.player.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(log);
    });
    return map;
  }, [logs]);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredSummaries = useMemo(() => {
    return summaries.filter((member) => {
      const matchesSearch = normalizedSearch ? member.name.toLowerCase().includes(normalizedSearch) : true;
      const matchesFilter =
        netFilter === "all" || (netFilter === "positive" && member.net > 0) || (netFilter === "negative" && member.net < 0);
      return matchesSearch && matchesFilter;
    });
  }, [summaries, normalizedSearch, netFilter]);

  const shouldShowSkeleton = loading && summaries.length === 0;

  const totalDeposits = summaries.reduce((total, summary) => total + summary.totalDeposits, 0);
  const totalWithdrawals = summaries.reduce((total, summary) => total + summary.totalWithdrawals, 0);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Supremacy Dashboard</h1>
        <p className="text-sm text-slate-300">
          Track Team Supremacy's siphon deposits and withdrawals in real time. Data is sourced directly from Firestore and rendered in the
          Europe/Istanbul timezone.
        </p>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-supremacy-border bg-supremacy-surface/90 p-4 shadow-glass sm:flex-row sm:items-center sm:justify-between">
        <input
          type="search"
          placeholder="Search players"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="input-field max-w-lg border-supremacy-border bg-[#1f1f1f] text-sm text-slate-100 placeholder:text-supremacy-muted"
        />
        <select
          value={netFilter}
          onChange={(event) => setNetFilter(event.target.value as NetFilter)}
          className="input-field max-w-xs border-supremacy-border bg-[#1f1f1f] text-sm text-slate-100"
        >
          {NET_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl border border-supremacy-border bg-gradient-to-br from-[#1f1b0f] via-[#2a1f00] to-[#0f0900] p-6 shadow-lg">
          <div className="absolute inset-0 bg-[url('https://i.hizliresim.com/mred25t.png')] bg-contain bg-right opacity-10" aria-hidden />
          <div className="relative space-y-3">
            <div className="flex items-center gap-3">
              <img src={SYPHON_ICON_URL} alt="Siphoned Energy" className="h-10 w-10" />
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-supremacy-muted">Guild Balance</p>
                <h2 className="text-2xl font-bold text-supremacy-primary">Supremacy Siphon Track</h2>
              </div>
            </div>
            <p className="text-4xl font-black text-supremacy-primary">
              {formatSiphon(guildSettings.siphonTotal)}
            </p>
            <p className="text-xs text-slate-400">Updated live from Firestore settings</p>
          </div>
        </div>

        <GlassCard
          title="Total Deposits"
          className="rounded-xl border border-supremacy-border bg-supremacy-surface/90 px-4 py-5"
        >
          <StatPill
            label={
              <span className="flex items-center gap-2">
                <img src={SYPHON_ICON_URL} alt="Siphoned Energy" className="h-4 w-4" /> Deposits
              </span>
            }
            value={`${formatSiphon(totalDeposits)} Siphon`}
            tone="positive"
          />
        </GlassCard>
        <GlassCard
          title="Total Withdrawals"
          className="rounded-xl border border-supremacy-border bg-supremacy-surface/90 px-4 py-5"
        >
          <StatPill
            label={
              <span className="flex items-center gap-2">
                <img src={SYPHON_ICON_URL} alt="Siphoned Energy" className="h-4 w-4" /> Withdrawals
              </span>
            }
            value={`${formatSiphon(totalWithdrawals)} Siphon`}
            tone="negative"
          />
        </GlassCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shouldShowSkeleton ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-[220px] rounded-xl border border-supremacy-border bg-supremacy-surface/80 p-4 shadow-glass"
            >
              <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 flex flex-col gap-2">
                <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="h-8 w-full animate-pulse rounded-lg bg-white/10" />
                <div className="h-8 w-full animate-pulse rounded-lg bg-white/10" />
                <div className="h-8 w-full animate-pulse rounded-lg bg-white/10" />
              </div>
            </div>
          ))
        ) : filteredSummaries.length === 0 ? (
          <GlassCard
            title="No matching members"
            description="Adjust your search or import new siphon activity from the New Entry screen."
            className="rounded-xl border border-supremacy-border bg-supremacy-surface/80 px-5 py-4 sm:px-6"
          >
            <p className="text-sm text-slate-300">
              We couldn't find any members that match the current filters. Try clearing the search box or switch the net balance filter.
            </p>
          </GlassCard>
        ) : (
          filteredSummaries.map((member) => {
            const memberLogs = logsByPlayer.get(member.name.trim().toLowerCase()) ?? [];
            return <PlayerCard key={member.name} summary={member} logs={memberLogs} />;
          })
        )}
      </div>
    </div>
  );
}
