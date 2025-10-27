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

const reasons = ["Deposit", "Withdrawal"] as const;
const tabs = [
  { id: "single" as const, label: "Single Entry" },
  { id: "bulk" as const, label: "Bulk Import" },
];

type Reason = (typeof reasons)[number];
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
            name: data.name ?? "Unknown",
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
      validationIssues.push("Player name is required.");
    }

    const numericAmount = Number(form.amount);
    if (!Number.isFinite(numericAmount)) {
      validationIssues.push("Amount must be a valid number.");
    } else if (numericAmount <= 0) {
      validationIssues.push("Amount must be greater than zero.");
    }

    const parsedDate = parseDateInput(form.date);
    if (Number.isNaN(parsedDate.getTime())) {
      validationIssues.push("Please provide a valid date and time.");
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

      triggerToast("success", `Saved entry for ${trimmedPlayer}.`);
      setForm((prev) => ({
        ...prev,
        date: toDateInputValue(),
        amount: "",
        note: "",
      }));
    } catch (error) {
      console.error(error);
      triggerToast("error", "Unable to save entry. Please try again.");
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
      setBulkErrors(["Please paste at least one row of data."]);
      return;
    }

    const issues: string[] = [];
    const parsedRows: ParsedBulkRow[] = [];

    trimmed.forEach((line, index) => {
      const parts = line.split(",").map((part) => part.trim());
      if (parts.length < 4) {
        issues.push(`Line ${index + 1}: expected 4 values (Date, Player, Reason, Amount).`);
        return;
      }

      const [datePart, playerPart, reasonPart, amountPart] = parts;
      const normalizedPlayer = playerPart.trim();
      let hasIssue = false;

      if (!normalizedPlayer) {
        issues.push(`Line ${index + 1}: player name is required.`);
        hasIssue = true;
      }

      const normalizedReason = reasonPart.toLowerCase();
      let reason: Reason | null = null;
      if (normalizedReason === "deposit") {
        reason = "Deposit";
      } else if (normalizedReason === "withdrawal") {
        reason = "Withdrawal";
      } else {
        issues.push(`Line ${index + 1}: reason must be Deposit or Withdrawal.`);
        hasIssue = true;
      }

      const parsedDate = parseDateInput(datePart);
      if (Number.isNaN(parsedDate.getTime())) {
        issues.push(`Line ${index + 1}: date could not be parsed.`);
        hasIssue = true;
      }

      const numericAmount = Number(amountPart);
      if (!Number.isFinite(numericAmount)) {
        issues.push(`Line ${index + 1}: amount must be a valid number.`);
        hasIssue = true;
      } else if (Math.abs(numericAmount) === 0) {
        issues.push(`Line ${index + 1}: amount must be greater than zero.`);
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

      triggerToast(
        "success",
        `Imported ${parsedRows.length} entr${parsedRows.length === 1 ? "y" : "ies"} successfully.`,
      );
      setBulkInput("");
    } catch (error) {
      console.error(error);
      triggerToast("error", "Bulk import failed. Please try again.");
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
        <h1 className="text-3xl font-semibold text-white">New Entry</h1>
        <p className="text-sm text-slate-300">
          Record siphon movements individually or paste multiple rows for bulk capture. Deposits are saved as positive values and
          withdrawals are stored as negatives automatically.
        </p>
      </div>

      <GlassCard
        title={activeTab === "single" ? "Create Log" : "Bulk Import"}
        description={
          activeTab === "single"
            ? "Fill out the form to append a new deposit or withdrawal to the guild ledger."
            : "Paste CSV-style rows (Date, Player, Reason, Amount) to import multiple entries in one go."
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
                  Date &amp; Time (Europe/Istanbul)
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
                  Player
                </label>
                <input
                  id="player"
                  type="text"
                  required
                  autoComplete="name"
                  list="member-options"
                  placeholder="Player name"
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
                  Reason
                </label>
                <select
                  id="reason"
                  className="input-field"
                  value={form.reason}
                  onChange={(event) => updateField("reason", event.target.value as Reason)}
                >
                  {reasons.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label htmlFor="amount" className="input-label">
                  Amount
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
                  Enter the absolute siphon value. The sign will match the selected reason automatically.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="note" className="input-label">
                Note (optional)
              </label>
              <textarea
                id="note"
                rows={3}
                placeholder="Add extra context or a reference ID"
                value={form.note}
                onChange={(event) => updateField("note", event.target.value)}
                className="input-field"
              />
            </div>

            {errors.length > 0 && (
              <div className="rounded-2xl border border-supremacy-negative/40 bg-supremacy-negative/15 p-4 text-sm text-supremacy-negative">
                <p className="font-semibold">Please fix the following:</p>
                <ul className="list-disc pl-5">
                  {errors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="primary-button disabled:cursor-not-allowed disabled:opacity-60" disabled={submitting}>
                {submitting ? "Saving…" : "Save Entry"}
              </button>
              <span className="text-xs text-slate-400">
                Entries are stored in Firestore with offline persistence for reliable tracking.
              </span>
            </div>
          </form>
        ) : (
          <form className="space-y-6" onSubmit={handleBulkSubmit}>
            <div className="space-y-2">
              <label htmlFor="bulk-input" className="input-label">
                Paste CSV Rows
              </label>
              <textarea
                id="bulk-input"
                rows={10}
                placeholder={"2025-10-21 10:19:43, NoPromise, Deposit, 10\n2025-10-20 22:15:01, kobiadam, Withdrawal, -10"}
                value={bulkInput}
                onChange={(event) => setBulkInput(event.target.value)}
                className="input-field font-mono text-sm"
              />
              <p className="text-xs text-slate-400">
                Format each line as <strong>Date, Player, Reason, Amount</strong>. Dates are interpreted in Europe/Istanbul.
              </p>
            </div>

            {bulkErrors.length > 0 && (
              <div className="rounded-2xl border border-supremacy-negative/40 bg-supremacy-negative/15 p-4 text-sm text-supremacy-negative">
                <p className="font-semibold">Import issues detected:</p>
                <ul className="list-disc pl-5">
                  {bulkErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="primary-button disabled:cursor-not-allowed disabled:opacity-60" disabled={bulkSubmitting}>
                {bulkSubmitting ? "Importing…" : "Import Entries"}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setBulkInput("");
                  setBulkErrors([]);
                }}
              >
                Clear
              </button>
              <span className="text-xs text-slate-400">
                Members are created automatically when a new name is detected.
              </span>
            </div>
          </form>
        )}
      </GlassCard>
    </div>
  );
}
