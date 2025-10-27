"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import GlassCard from "@/components/GlassCard";
import { db } from "@/lib/firebase";
import type { MemberRecord } from "@/lib/types";
import { parseDateInput, toDateInputValue } from "@/lib/time";

const reasons = ["Deposit", "Withdrawal"] as const;

type Reason = (typeof reasons)[number];

interface FormState {
  date: string;
  player: string;
  reason: Reason;
  amount: string;
  note: string;
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
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const membersRef = collection(db, "members");
    const unsubscribe = onSnapshot(membersRef, (snapshot) => {
      const nextMembers = snapshot.docs
        .map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            name: data.name ?? "Unknown",
            initialBalance: typeof data.initialBalance === "number" ? data.initialBalance : 0,
          } satisfies MemberRecord;
        })
        .sort((a, b) => a.name.localeCompare(b.name));
      setMembers(nextMembers);
    });

    return () => unsubscribe();
  }, []);

  const playerOptions = useMemo(() => members.map((member) => member.name), [members]);

  const updateField = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors([]);
    setStatus(null);

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
      const existing = await getDocs(query(membersRef, where("name", "==", trimmedPlayer)));
      if (existing.empty) {
        await addDoc(membersRef, {
          name: trimmedPlayer,
          initialBalance: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        await Promise.all(existing.docs.map((doc) => updateDoc(doc.ref, { updatedAt: serverTimestamp() })));
      }

      setStatus({ type: "success", message: `Saved entry for ${trimmedPlayer}.` });
      setForm((prev) => ({
        ...prev,
        date: toDateInputValue(),
        amount: "",
        note: "",
      }));
    } catch (error) {
      console.error(error);
      setStatus({ type: "error", message: "Unable to save entry. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">New Entry</h1>
        <p className="text-sm text-slate-300">
          Record a new siphon movement. Deposits are stored as positive values, while withdrawals are saved as negative numbers.
        </p>
      </div>

      <GlassCard title="Create Log" description="Fill out the form to append a new deposit or withdrawal to the guild ledger.">
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
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200">
              <p className="font-semibold">Please fix the following:</p>
              <ul className="list-disc pl-5">
                {errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {status && (
            <div
              className={
                status.type === "success"
                  ? "rounded-2xl border border-emerald-400/40 bg-emerald-500/10 p-4 text-sm text-emerald-200"
                  : "rounded-2xl border border-rose-400/40 bg-rose-500/10 p-4 text-sm text-rose-200"
              }
            >
              {status.message}
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
      </GlassCard>
    </div>
  );
}
