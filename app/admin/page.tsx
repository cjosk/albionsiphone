"use client";

import { useCallback, useEffect, useState } from "react";
import GlassCard from "@/components/GlassCard";
import { clearLogsCollection, fetchAllLogs, listenToGuildSettings, updateGuildSiphonTotal } from "@/lib/firebase";
import { formatIstanbulTime } from "@/lib/time";
import { formatSiphon } from "@/lib/utils";

const expectedHash = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH ?? "";

type ToastState = { type: "success" | "error"; message: string } | null;

async function hashText(value: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(value);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [guildTotal, setGuildTotal] = useState(0);
  const [guildInput, setGuildInput] = useState("0");
  const [toast, setToast] = useState<ToastState>(null);
  const [busyAction, setBusyAction] = useState<"update" | "reset" | "backup" | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (!authenticated) {
      return;
    }
    const unsubscribe = listenToGuildSettings((settings) => {
      setGuildTotal(settings.siphonTotal);
      setGuildInput(settings.siphonTotal.toString());
    });
    return () => unsubscribe();
  }, [authenticated]);

  const passwordSet = expectedHash.length > 0;

  const handleAuthenticate = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      setAuthError(null);

      if (!passwordSet) {
        setAuthError("Admin hash is not configured.");
        return;
      }

      const digest = await hashText(password);
      if (digest === expectedHash) {
        setAuthenticated(true);
        setPassword("");
      } else {
        setAuthError("Incorrect password. Please try again.");
      }
    },
    [password, passwordSet],
  );

  const showToast = useCallback((type: "success" | "error", message: string) => {
    setToast({ type, message });
  }, []);

  const handleUpdateTotal = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const parsed = Number(guildInput);
      if (!Number.isFinite(parsed)) {
        showToast("error", "Please enter a valid number.");
        return;
      }
      setBusyAction("update");
      try {
        await updateGuildSiphonTotal(parsed);
        showToast("success", "Guild siphon balance updated.");
      } catch (error) {
        console.error(error);
        showToast("error", "Failed to update guild balance.");
      } finally {
        setBusyAction(null);
      }
    },
    [guildInput, showToast],
  );

  const handleResetLogs = useCallback(async () => {
    const confirmed = window.confirm("Are you sure you want to clear all logs? This cannot be undone.");
    if (!confirmed) {
      return;
    }
    setBusyAction("reset");
    try {
      await clearLogsCollection();
      showToast("success", "All logs have been cleared.");
    } catch (error) {
      console.error(error);
      showToast("error", "Failed to reset logs.");
    } finally {
      setBusyAction(null);
    }
  }, [showToast]);

  const handleBackupLogs = useCallback(async () => {
    setBusyAction("backup");
    try {
      const logs = await fetchAllLogs();
      const header = ["Date", "Player", "Reason", "Amount", "Note"].join(",");
      const rows = logs
        .map((log) => {
          const columns = [
            formatIstanbulTime(log.date),
            `"${log.player.replace(/"/g, '""')}"`,
            log.reason,
            log.amount.toString(),
            log.note ? `"${log.note.replace(/"/g, '""')}"` : "",
          ];
          return columns.join(",");
        })
        .join("\n");
      const csvContent = `${header}\n${rows}`;
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `supremacy-siphon-backup-${Date.now()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast("success", `Exported ${logs.length} logs to CSV.`);
    } catch (error) {
      console.error(error);
      showToast("error", "Failed to export logs.");
    } finally {
      setBusyAction(null);
    }
  }, [showToast]);

  if (!authenticated) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-xl border border-supremacy-border bg-supremacy-surface/95 p-8 shadow-glass">
        <h1 className="text-xl font-semibold text-white">Admin Access</h1>
        <p className="mt-2 text-sm text-slate-400">Enter the Supremacy admin password to manage guild data.</p>
        {!passwordSet && (
          <p className="mt-3 rounded-lg border border-supremacy-negative/40 bg-supremacy-negative/10 p-3 text-sm text-supremacy-negative">
            No admin hash configured. Set <code className="font-mono text-xs">NEXT_PUBLIC_ADMIN_PASSWORD_HASH</code> in your environment.
          </p>
        )}
        <form onSubmit={handleAuthenticate} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="input-label">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field border-supremacy-border bg-[#1f1f1f]"
              placeholder="Enter admin password"
            />
          </div>
          {authError && <p className="text-sm text-supremacy-negative">{authError}</p>}
          <button
            type="submit"
            className="primary-button w-full bg-supremacy-primary text-black hover:bg-supremacy-primary-hover"
          >
            Authenticate
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {toast && (
        <div
          className={`fixed right-8 top-24 z-50 rounded-2xl border px-5 py-3 text-sm font-medium shadow-lg backdrop-blur ${
            toast.type === "success"
              ? "border-supremacy-positive/50 bg-supremacy-positive/20 text-supremacy-positive"
              : "border-supremacy-negative/50 bg-supremacy-negative/20 text-supremacy-negative"
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white">Supremacy Admin Panel</h1>
        <p className="text-sm text-slate-300">Control the guild siphon counter and maintain ledger integrity.</p>
      </div>

      <GlassCard
        title="Current Guild Siphon"
        description="Update the main siphon counter shown on the dashboard."
        className="rounded-xl border border-supremacy-border bg-supremacy-surface/95"
      >
        <form onSubmit={handleUpdateTotal} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="guild-total" className="input-label">
              Guild Siphon Balance
            </label>
            <input
              id="guild-total"
              type="number"
              step="0.01"
              value={guildInput}
              onChange={(event) => setGuildInput(event.target.value)}
              className="input-field border-supremacy-border bg-[#1f1f1f]"
            />
            <p className="text-xs text-slate-400">Current saved value: {formatSiphon(guildTotal)}</p>
          </div>
          <button
            type="submit"
            className="primary-button bg-supremacy-primary text-black hover:bg-supremacy-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busyAction === "update"}
          >
            {busyAction === "update" ? "Saving…" : "Save Balance"}
          </button>
        </form>
      </GlassCard>

      <GlassCard
        title="Maintenance"
        description="Backup or reset guild ledger data."
        className="rounded-xl border border-supremacy-border bg-supremacy-surface/95"
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBackupLogs}
            className="secondary-button border-supremacy-border text-slate-100 hover:border-supremacy-primary"
            disabled={busyAction === "backup"}
          >
            {busyAction === "backup" ? "Exporting…" : "Backup Logs"}
          </button>
          <button
            type="button"
            onClick={handleResetLogs}
            className="secondary-button border-supremacy-negative/60 text-supremacy-negative hover:border-supremacy-negative hover:text-white"
            disabled={busyAction === "reset"}
          >
            {busyAction === "reset" ? "Clearing…" : "Reset Logs"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
