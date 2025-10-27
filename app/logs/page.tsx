"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import { db } from "@/lib/firebase";
import type { LogRecord } from "@/lib/types";
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

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const logsRef = query(collection(db, "logs"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(logsRef, (snapshot) => {
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

    return () => unsubscribe();
  }, []);

  const totalEntries = useMemo(() => logs.length, [logs]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Logs</h1>
        <p className="text-sm text-slate-300">
          Detailed ledger of every siphon movement. Entries are sorted by most recent activity and displayed in the
          Europe/Istanbul timezone.
        </p>
      </div>

      <GlassCard title={`All Entries (${totalEntries})`}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th scope="col">Date</th>
                <th scope="col">Player</th>
                <th scope="col">Reason</th>
                <th scope="col" className="text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-slate-300">
                    Loading Firestore data…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-slate-300">
                    No logs recorded yet. Add your first entry from the New Entry page.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={
                      log.reason === "Withdrawal"
                        ? "bg-rose-500/5"
                        : "bg-emerald-500/5"
                    }
                  >
                    <td>{formatDateTime(log.date)}</td>
                    <td>{log.player}</td>
                    <td className={log.reason === "Withdrawal" ? "status-negative" : "status-positive"}>{log.reason}</td>
                    <td className="text-right font-semibold">
                      <span className={log.amount < 0 ? "status-negative" : "status-positive"}>
                        {`${log.amount < 0 ? "-" : "+"}${formatSiphon(Math.abs(log.amount))}`}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
