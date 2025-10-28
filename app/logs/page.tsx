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

    return () => unsubscribe();
  }, []);

  const totalEntries = useMemo(() => logs.length, [logs]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Kayıtlar</h1>
        <p className="text-sm text-slate-300">Tüm işlemleri en güncel tarihten başlayarak görüntüleyin.</p>
      </div>

      <GlassCard title={`Toplam Kayıt (${totalEntries})`}>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th scope="col">Tarih</th>
                <th scope="col">Oyuncu</th>
                <th scope="col">Sebep</th>
                <th scope="col" className="text-right">
                  Tutar
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-slate-300">
                    Firestore verileri yükleniyor…
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-16 text-center text-slate-300">
                    Henüz kayıt yok. Yeni Kayıt sayfasından ilk işlemi ekleyin.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr
                    key={log.id}
                    className={
                      log.reason === "Withdrawal"
                        ? "bg-supremacy-negative/10"
                        : "bg-supremacy-positive/10"
                    }
                  >
                    <td>{formatDateTime(log.date)}</td>
                    <td>{log.player}</td>
                    <td className={log.reason === "Withdrawal" ? "status-negative" : "status-positive"}>
                      {log.reason === "Withdrawal" ? "Çekim" : "Yatırım"}
                    </td>
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
