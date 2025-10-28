"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import PlayerCard from "@/components/PlayerCard";
import StatPill from "@/components/StatPill";
import { buildMemberSummaries } from "@/lib/calc";
import { db, listenToGuildSettings } from "@/lib/firebase";
import type { LogRecord, MemberRecord } from "@/lib/types";
import { formatSiphon } from "@/lib/utils";

const NET_FILTERS = [
  { value: "all", label: "Tüm Bakiyeler" },
  { value: "positive", label: "Pozitif Bakiye" },
  { value: "negative", label: "Negatif Bakiye" },
] as const;

const SYPHON_ICON_URL = "https://render.albiononline.com/v1/item/Siphoned%20Energy.png";
const BATCH_SIZE = 9;

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
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const unsubscribeSettings = listenToGuildSettings((settings) => setGuildSettings(settings));

    const membersRef = collection(db, "members");
    const unsubscribeMembers = onSnapshot(membersRef, (snapshot) => {
      const nextMembers = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name ?? "Bilinmiyor",
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
          player: data.player ?? "Bilinmiyor",
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

  useEffect(() => {
    const initialVisible = filteredSummaries.length > 0 ? Math.min(BATCH_SIZE, filteredSummaries.length) : 0;
    setVisibleCount(initialVisible);
  }, [normalizedSearch, netFilter, filteredSummaries.length]);

  useEffect(() => {
    setVisibleCount((prev) => {
      if (filteredSummaries.length === 0) {
        return 0;
      }
      return Math.min(prev, filteredSummaries.length);
    });
  }, [filteredSummaries.length]);

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => {
      const next = prev + BATCH_SIZE;
      return Math.min(next, filteredSummaries.length);
    });
  }, [filteredSummaries.length]);

  useEffect(() => {
    if (!sentinelRef.current) {
      return;
    }
    if (visibleCount >= filteredSummaries.length) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    const current = sentinelRef.current;
    observer.observe(current);
    return () => {
      observer.unobserve(current);
      observer.disconnect();
    };
  }, [loadMore, visibleCount, filteredSummaries.length]);

  const visibleSummaries = filteredSummaries.slice(0, visibleCount);
  const shouldShowSkeleton = loading && summaries.length === 0;

  const totalDeposits = summaries.reduce((total, summary) => total + summary.totalDeposits, 0);
  const totalWithdrawals = summaries.reduce((total, summary) => total + summary.totalWithdrawals, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-xl border border-supremacy-border bg-supremacy-surface/90 p-3 shadow-glass sm:flex-row sm:items-center sm:justify-between sm:p-4 md:gap-4 md:p-5">
        <input
          type="search"
          placeholder="Oyuncu ara"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="input-field w-full max-w-lg border-supremacy-border bg-[#1f1f1f] text-sm text-slate-100 placeholder:text-slate-400"
        />
        <select
          value={netFilter}
          onChange={(event) => setNetFilter(event.target.value as NetFilter)}
          className="input-field w-full max-w-xs border-supremacy-border bg-[#1f1f1f] text-sm text-slate-100 sm:w-auto"
        >
          {NET_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 xl:gap-6">
        <div className="relative mx-auto flex w-full max-w-[520px] items-center overflow-hidden rounded-xl border border-supremacy-border bg-gradient-to-br from-[#ffce32] via-[#ffc107] to-[#8c5b00] p-3 shadow-lg sm:p-4 md:p-5">
          <div className="flex items-center gap-4">
            <img
              src={SYPHON_ICON_URL}
              alt="SIPHONE enerjisi simgesi"
              className="h-12 w-12 min-w-[3rem] drop-shadow-lg sm:h-14 sm:w-14 md:h-16 md:w-16"
            />
            <div className="flex flex-col">
              <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.45em] text-black/70">SIPHONE</span>
              <span className="text-4xl font-black text-black md:text-5xl">{formatSiphon(guildSettings.siphonTotal)}</span>
            </div>
          </div>
        </div>

        <GlassCard
          title={
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <img src={SYPHON_ICON_URL} alt="SIPHONE simgesi" className="h-4 w-4" />
              Toplam Yatırım
            </span>
          }
          className="rounded-xl border border-supremacy-border bg-supremacy-surface/90 px-3 py-3 sm:px-4 sm:py-4"
        >
          <StatPill
            label="Enerji"
            value={formatSiphon(totalDeposits)}
            tone="positive"
          />
        </GlassCard>

        <GlassCard
          title={
            <span className="flex items-center gap-2 text-sm font-semibold text-white">
              <img src={SYPHON_ICON_URL} alt="SIPHONE simgesi" className="h-4 w-4" />
              Toplam Çekim
            </span>
          }
          className="rounded-xl border border-supremacy-border bg-supremacy-surface/90 px-3 py-3 sm:px-4 sm:py-4"
        >
          <StatPill
            label="Enerji"
            value={formatSiphon(totalWithdrawals)}
            tone="negative"
          />
        </GlassCard>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {shouldShowSkeleton ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`skeleton-${index}`}
              className="h-[170px] rounded-xl border border-supremacy-border bg-supremacy-surface/80 p-3 shadow-glass sm:p-4"
            >
              <div className="h-5 w-32 animate-pulse rounded-full bg-white/10" />
              <div className="mt-3 flex flex-col gap-2">
                <div className="h-4 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="h-7 w-full animate-pulse rounded-lg bg-white/10" />
                <div className="h-7 w-full animate-pulse rounded-lg bg-white/10" />
                <div className="h-7 w-full animate-pulse rounded-lg bg-white/10" />
              </div>
            </div>
          ))
        ) : visibleSummaries.length === 0 ? (
          <GlassCard
            title="Sonuç bulunamadı"
            description="Aramayı temizleyin veya Yeni Kayıt sayfasından yeni işlemler ekleyin."
            className="rounded-xl border border-supremacy-border bg-supremacy-surface/80 px-5 py-4 sm:px-6"
          >
            <p className="text-sm text-slate-300">Filtreler mevcut oyuncuları gizliyor olabilir.</p>
          </GlassCard>
        ) : (
          <>
            {visibleSummaries.map((member) => {
              const memberLogs = logsByPlayer.get(member.name.trim().toLowerCase()) ?? [];
              return <PlayerCard key={member.name} summary={member} logs={memberLogs} />;
            })}
            {visibleCount < filteredSummaries.length && (
              <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
            )}
          </>
        )}
      </div>
    </div>
  );
}
