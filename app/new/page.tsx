"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Timestamp,
  addDoc,
  collection,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import { db } from "@/lib/firebase";
import type { MemberRecord } from "@/lib/types";
import { parseDateInput, toDateInputValue } from "@/lib/time";
import { cn } from "@/lib/utils";

const reasonOptions = [
  { value: "Deposit", label: "Yatırım" },
  { value: "Withdrawal", label: "Çekim" },
] as const;

const tabs = [
  { id: "single" as const, label: "Tekli Kayıt" },
  { id: "bulk" as const, label: "Toplu İçe Aktarım" },
];

type Reason = (typeof reasonOptions)[number]["value"];
type TabId = (typeof tabs)[number]["id"];

interface FormState {
  date: string;
  player: string;
  reason: Reason;
  amount: string;
  note: string;
}

interface ParsedBulkRow {
  date: Date;
  player: string;
  reason: Reason;
  amount: number;
}

const TURKISH_REASON_MAP: Record<string, Reason> = {
  yatirim: "Deposit",
  cekim: "Withdrawal",
};

export default function NewEntryPage() {
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [form, setForm] = useState<FormState>({
    date: toDateInputValue(),
    player: "",
    reason: "Deposit",
    amount: "",
    note: "",
  });
  const [activeTab, setActiveTab] = useState<TabId>("single");
  const [errors, setErrors] = useState<string[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkInput, setBulkInput] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const membersRef = collection(db, "members");
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const nextMembers = snapshot.docs
        .map((document) => {
          const data = document.data();
          return {
            id: document.id,
            name: data.name ?? "Bilinmiyor",
            initialBalance: typeof data.initialBalance === "number" ? data.initialBalance : 0,
          } satisfies MemberRecord;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      setMembers(nextMembers);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const playerOptions = useMemo(() => members.map((member) => member.name), [members]);

  const memberMap = useMemo(() => {
    const map = new Map<string, MemberRecord>();
    members.forEach((member) => {
      map.set(member.name.trim().toLowerCase(), member);
    });
    return map;
  }, [members]);

  const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const changeTab = useCallback((id: TabId) => {
    setActiveTab(id);
    setErrors([]);
    setBulkErrors([]);
  }, []);

  const triggerToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors([]);

    const validationIssues: string[] = [];
    const trimmedPlayer = form.player.trim();
    if (!trimmedPlayer) {
      validationIssues.push("Oyuncu adı zorunludur.");
    }

    const numericAmount = Number(form.amount);
    if (!Number.isFinite(numericAmount)) {
      validationIssues.push("Tutar geçerli bir sayı olmalıdır.");
    } else if (numericAmount <= 0) {
      validationIssues.push("Tutar sıfırdan büyük olmalıdır.");
    }

    const parsedDate = parseDateInput(form.date);
    if (Number.isNaN(parsedDate.getTime())) {
      validationIssues.push("Lütfen geçerli bir tarih ve saat belirtin.");
    }

    if (validationIssues.length > 0) {
      setErrors(validationIssues);
      return;
    }

    const signedAmount = form.reason === "Deposit" ? Math.abs(numericAmount) : -Math.abs(numericAmount);
    const memberKey = trimmedPlayer.toLowerCase();
    const existingMember = memberMap.get(memberKey);

    setSubmitting(true);
    try {
      const logsRef = collection(db, "logs");
      await addDoc(logsRef, {
        player: trimmedPlayer,
        reason: form.reason,
        amount: signedAmount,
        date: Timestamp.fromDate(parsedDate),
        note: form.note.trim() ? form.note.trim() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const membersRef = collection(db, "members");
      if (!existingMember) {
        await addDoc(membersRef, {
          name: trimmedPlayer,
          initialBalance: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(doc(db, "members", existingMember.id), {
          updatedAt: serverTimestamp(),
        });
      }

      triggerToast("success", `${trimmedPlayer} için kayıt oluşturuldu.`);
      setForm((prev) => ({
        ...prev,
        date: toDateInputValue(),
        amount: "",
        note: "",
      }));
    } catch (error) {
      console.error(error);
      triggerToast("error", "Kayıt kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBulkErrors([]);

    const trimmed = bulkInput
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (trimmed.length === 0) {
      setBulkErrors(["Lütfen en az bir satır veri yapıştırın."]);
      return;
    }

    const issues: string[] = [];
    const parsedRows: ParsedBulkRow[] = [];

    trimmed.forEach((line, index) => {
      const parts = line.split(",").map((part) => part.trim());
      if (parts.length < 4) {
        issues.push(`Satır ${index + 1}: 4 değer (Tarih, Oyuncu, Sebep, Tutar) bekleniyordu.`);
        return;
      }

      const [datePart, playerPart, reasonPart, amountPart] = parts;
      const normalizedPlayer = playerPart.trim();
      let hasIssue = false;

      if (!normalizedPlayer) {
        issues.push(`Satır ${index + 1}: oyuncu adı zorunludur.`);
        hasIssue = true;
      }

      const cleanedReason = reasonPart
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      let reason: Reason | null = null;
      if (cleanedReason in TURKISH_REASON_MAP) {
        reason = TURKISH_REASON_MAP[cleanedReason];
      } else if (cleanedReason === "deposit") {
        reason = "Deposit";
      } else if (cleanedReason === "withdrawal") {
        reason = "Withdrawal";
      }

      if (!reason) {
        issues.push(`Satır ${index + 1}: sebep alanı Yatırım veya Çekim olmalıdır.`);
        hasIssue = true;
      }

      const parsedDate = parseDateInput(datePart);
      if (Number.isNaN(parsedDate.getTime())) {
        issues.push(`Satır ${index + 1}: tarih okunamadı.`);
        hasIssue = true;
      }

      const numericAmount = Number(amountPart);
      if (!Number.isFinite(numericAmount)) {
        issues.push(`Satır ${index + 1}: tutar geçerli bir sayı olmalıdır.`);
        hasIssue = true;
      } else if (Math.abs(numericAmount) === 0) {
        issues.push(`Satır ${index + 1}: tutar sıfırdan büyük olmalıdır.`);
        hasIssue = true;
      }

      if (!hasIssue && reason) {
        const signedAmount = reason === "Deposit" ? Math.abs(numericAmount) : -Math.abs(numericAmount);
        parsedRows.push({
          date: parsedDate,
          player: normalizedPlayer,
          reason,
          amount: signedAmount,
        });
      }
    });

    if (issues.length > 0) {
      setBulkErrors(issues);
      return;
    }

    setBulkSubmitting(true);
    try {
      const logsRef = collection(db, "logs");
      await Promise.all(
        parsedRows.map((row) =>
          addDoc(logsRef, {
            player: row.player,
            reason: row.reason,
            amount: row.amount,
            date: Timestamp.fromDate(row.date),
            note: null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        ),
      );

      const membersRef = collection(db, "members");
      const newNames = new Set<string>();
      const memberIdsToUpdate = new Set<string>();

      parsedRows.forEach((row) => {
        const key = row.player.trim().toLowerCase();
        const existing = memberMap.get(key);
        if (existing) {
          memberIdsToUpdate.add(existing.id);
        } else {
          newNames.add(row.player.trim());
        }
      });

      await Promise.all(
        Array.from(newNames).map((name) =>
          addDoc(membersRef, {
            name,
            initialBalance: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }),
        ),
      );

      await Promise.all(
        Array.from(memberIdsToUpdate).map((memberId) =>
          updateDoc(doc(db, "members", memberId), {
            updatedAt: serverTimestamp(),
          }),
        ),
      );

      triggerToast("success", `${parsedRows.length} kayıt başarıyla içe aktarıldı.`);
      setBulkInput("");
    } catch (error) {
      console.error(error);
      triggerToast("error", "Toplu içe aktarma başarısız oldu. Lütfen tekrar deneyin.");
    } finally {
      setBulkSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={cn(
            "fixed right-8 top-24 z-50 flex items-center gap-3 rounded-2xl border px-5 py-3 text-sm font-medium shadow-lg backdrop-blur",
            toast.type === "success"
              ? "border-supremacy-positive/50 bg-supremacy-positive/15 text-supremacy-positive"
              : "border-supremacy-negative/50 bg-supremacy-negative/15 text-supremacy-negative",
          )}
        >
          <span>{toast.message}</span>
        </div>
      )}

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Yeni Kayıt</h1>
        <p className="text-sm text-slate-300">
          Tek tek SIPHONE hareketleri girin veya birden fazla satırı yapıştırarak toplu içe aktarım yapın. Yatırımlar pozitif,
          çekimler ise negatif olarak saklanır.
        </p>
      </div>

      <GlassCard
        title={activeTab === "single" ? "Kayıt Oluştur" : "Toplu İçe Aktarım"}
        description={
          activeTab === "single"
            ? "Lonca defterine yeni bir SIPHONE hareketi eklemek için formu doldurun."
            : "Her satırı Tarih, Oyuncu, Sebep, Tutar sırasıyla girerek birden fazla kaydı aynı anda ekleyin."
        }
        action={
          <div className="flex items-center gap-2 rounded-full border border-supremacy-border/60 bg-white/[0.04] p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => changeTab(tab.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  activeTab === tab.id
                    ? "bg-supremacy-primary text-black shadow-[0_10px_24px_rgba(255,193,7,0.25)]"
                    : "text-slate-300 hover:text-white",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        }
      >
        {activeTab === "single" ? (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="date" className="input-label">
                  Tarih ve Saat (Europe/Istanbul)
                </label>
                <input
                  id="date"
                  type="datetime-local"
                  required
                  value={form.date}
                  onChange={(event) => updateField("date", event.target.value)}
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="player" className="input-label">
                  Oyuncu
                </label>
                <input
                  id="player"
                  type="text"
                  required
                  autoComplete="name"
                  list="member-options"
                  placeholder="Oyuncu adı"
                  value={form.player}
                  onChange={(event) => updateField("player", event.target.value)}
                  className="input-field"
                />
                <datalist id="member-options">
                  {playerOptions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <label htmlFor="reason" className="input-label">
                  Sebep
                </label>
                <select
                  id="reason"
                  className="input-field"
                  value={form.reason}
                  onChange={(event) => updateField("reason", event.target.value as Reason)}
                >
                  {reasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="amount" className="input-label">
                  Tutar
                </label>
                <input
                  id="amount"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={form.amount}
                  onChange={(event) => updateField("amount", event.target.value)}
                  className="input-field"
                  required
                />
                <p className="text-xs text-slate-400">
                  Tutarı pozitif girin; seçilen sebebe göre işaret otomatik uygulanır.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="input-label">
                Not (isteğe bağlı)
              </label>
              <textarea
                id="note"
                rows={3}
                placeholder="Ek bilgi veya referans ekleyin"
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                className="input-field"
              />
            </div>

            {errors.length > 0 && (
              <div className="rounded-2xl border border-supremacy-negative/40 bg-supremacy-negative/15 p-4 text-sm text-supremacy-negative">
                <p className="font-semibold">Lütfen aşağıdaki hataları düzeltin:</p>
                <ul className="list-disc pl-5">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="primary-button disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
                {submitting ? "Kaydediliyor…" : "Kayıt Kaydet"}
              </button>
              <span className="text-xs text-slate-400">Kayıtlar Firestore'da çevrimdışı destekle saklanır.</span>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleBulkSubmit}>
            <div className="space-y-2">
              <label htmlFor="bulk-input" className="input-label">
                CSV Satırlarını Yapıştır
              </label>
              <textarea
                id="bulk-input"
                rows={10}
                placeholder={"2025-10-21 10:19:43, NoPromise, Yatırım, 10\n2025-10-20 22:15:01, kobiadam, Çekim, -10"}
                value={bulkInput}
                onChange={(event) => setBulkInput(event.target.value)}
                className="input-field font-mono text-sm"
              />
              <p className="text-xs text-slate-400">
                Her satırı <strong>Tarih, Oyuncu, Sebep, Tutar</strong> formatında girin. Sebep alanında "Yatırım"/"Çekim" veya
                "Deposit"/"Withdrawal" kullanılabilir. Tarihler Europe/Istanbul saat diliminde yorumlanır.
              </p>
            </div>

            {bulkErrors.length > 0 && (
              <div className="rounded-2xl border border-supremacy-negative/40 bg-supremacy-negative/15 p-4 text-sm text-supremacy-negative">
                <p className="font-semibold">İçe aktarma sırasında sorunlar oluştu:</p>
                <ul className="list-disc pl-5">
                  {bulkErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="primary-button disabled:cursor-not-allowed disabled:opacity-60" disabled={bulkSubmitting}>
                {bulkSubmitting ? "İçe aktarılıyor…" : "Kayıtları İçe Aktar"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setBulkInput("");
                  setBulkErrors([]);
                }}
              >
                Temizle
              </button>
              <span className="text-xs text-slate-400">Yeni isimler için üyeler otomatik oluşturulur.</span>
            </div>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
