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

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Dashboard</h1>
        <p className="text-sm text-slate-300">
          Track Albion siphon deposits and withdrawals in real time. Data is sourced directly from Firestore and rendered in the
          Europe/Istanbul timezone.
        </p>
      </div>

      <GlassCard
        title="Guild Overview"
        description="A quick snapshot of deposits, withdrawals, and your overall guild standing."
      >
        <div className="flex flex-wrap items-center gap-3">
          <StatPill label="Total Deposits" value={`${formatSiphon(totals.totalDeposits)} Siphon`} tone="positive" />
          <StatPill label="Total Withdrawals" value={`${formatSiphon(totals.totalWithdrawals)} Siphon`} tone="negative" />
          <StatPill
            label="Guild Net"
            value={`${formatSiphon(totals.guildNet)} Siphon`}
            tone={totals.guildNet > 0 ? "positive" : totals.guildNet < 0 ? "negative" : "neutral"}
          />
        </div>
      </GlassCard>

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {loading && summaries.length === 0 ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="glass-panel animate-pulse space-y-4">
              <div className="h-6 w-32 rounded-full bg-white/10" />
              <div className="h-4 w-24 rounded-full bg-white/10" />
              <div className="flex flex-wrap gap-3">
                <div className="h-8 w-32 rounded-full bg-white/10" />
                <div className="h-8 w-32 rounded-full bg-white/10" />
                <div className="h-8 w-32 rounded-full bg-white/10" />
              </div>
            </div>
          ))
        ) : summaries.length === 0 ? (
          <GlassCard
            title="No member activity yet"
            description="Add your first log entry to populate the dashboard."
          >
            <p className="text-sm text-slate-300">
              Use the New Entry screen to capture deposits or withdrawals and watch the real-time totals appear here.
            </p>
          </GlassCard>
        ) : (
          summaries.map((member) => (
            <GlassCard
              key={member.name}
              title={
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-white">{member.name}</span>
                  <span
                    className={
                      member.net > 0
                        ? "status-positive"
                        : member.net < 0
                          ? "status-negative"
                          : "status-neutral"
                    }
                  >
                    {member.net > 0 ? "▲" : member.net < 0 ? "▼" : "•"}
                  </span>
                </div>
              }
              description={member.lastActivity ? `Last activity: ${formatDateTime(member.lastActivity)}` : "Awaiting first entry"}
            >
              <div className="flex flex-col gap-3">
                <StatPill
                  label="Deposits"
                  value={`${formatSiphon(member.totalDeposits)} Siphon`}
                  tone={member.totalDeposits > 0 ? "positive" : "neutral"}
                />
                <StatPill
                  label="Withdrawals"
                  value={`${formatSiphon(member.totalWithdrawals)} Siphon`}
                  tone={member.totalWithdrawals > 0 ? "negative" : "neutral"}
                />
                <StatPill
                  label="Net"
                  value={`${formatSiphon(member.net)} Siphon`}
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
