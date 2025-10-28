"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import bcrypt from "bcryptjs";
import GlassCard from "@/components/GlassCard";
import { clearLogsCollection, fetchAllLogs, listenToGuildSettings, updateGuildSiphonTotal } from "@/lib/firebase";
import { formatIstanbulTime } from "@/lib/time";
import { formatSiphon } from "@/lib/utils";

const expectedHash = process.env.NEXT_PUBLIC_ADMIN_PASSWORD_HASH ?? "";

type ToastState = { type: "success" | "error"; message: string } | null;

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [guildTotal, setGuildTotal] = useState(0);
  const [guildInput, setGuildInput] = useState("0");
  const [toast, setToast] = useState<ToastState>(null);
  const [busyAction, setBusyAction] = useState<"update" | "reset" | "backup" | null>(null);

  const exampleHash = useMemo(() => bcrypt.hashSync("supremacyadmin", 10), []);

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
        setAuthError("Yönetici parolası ayarlanmamış.");
        return;
      }

      try {
        const isMatch = await bcrypt.compare(password, expectedHash);
        if (isMatch) {
          setAuthenticated(true);
          setPassword("");
        } else {
          setAuthError("Parola hatalı. Lütfen tekrar deneyin.");
        }
      } catch (error) {
        console.error(error);
        setAuthError("Parola doğrulanamadı.");
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
        showToast("error", "Lütfen geçerli bir sayı girin.");
        return;
      }
      setBusyAction("update");
      try {
        await updateGuildSiphonTotal(parsed);
        showToast("success", "Lonca Siphon bakiyesi güncellendi.");
      } catch (error) {
        console.error(error);
        showToast("error", "Güncelleme başarısız oldu.");
      } finally {
        setBusyAction(null);
      }
    },
    [guildInput, showToast],
  );

  const handleResetLogs = useCallback(async () => {
    const confirmed = window.confirm("Tüm kayıtları silmek istediğinize emin misiniz? Bu işlem geri alınamaz.");
    if (!confirmed) {
      return;
    }
    setBusyAction("reset");
    try {
      await clearLogsCollection();
      showToast("success", "Tüm kayıtlar temizlendi.");
    } catch (error) {
      console.error(error);
      showToast("error", "Kayıtlar silinemedi.");
    } finally {
      setBusyAction(null);
    }
  }, [showToast]);

  const handleBackupLogs = useCallback(async () => {
    setBusyAction("backup");
    try {
      const logs = await fetchAllLogs();
      const header = ["Tarih", "Oyuncu", "Sebep", "Tutar", "Not"].join(",");
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
      anchor.download = `supremacy-siphon-yedek-${Date.now()}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast("success", `${logs.length} kayıt CSV olarak indirildi.`);
    } catch (error) {
      console.error(error);
      showToast("error", "Dışa aktarma başarısız oldu.");
    } finally {
      setBusyAction(null);
    }
  }, [showToast]);

  if (!authenticated) {
    return (
      <div className="mx-auto mt-24 max-w-md rounded-xl border border-supremacy-border bg-supremacy-surface/95 p-8 shadow-glass">
        <h1 className="text-xl font-semibold text-white">Yönetim Girişi</h1>
        <p className="mt-2 text-sm text-slate-400">
          Yetkili kontroller için yönetici parolasını girin.
        </p>
        <p className="mt-3 rounded-lg border border-supremacy-border/60 bg-black/30 p-3 text-xs text-slate-300">
          <strong>Çevre Değişkeni:</strong> <code className="font-mono">NEXT_PUBLIC_ADMIN_PASSWORD_HASH</code> değerini
          <br />.env dosyanızda veya Vercel ortam değişkenlerinde tanımlayın.
          <br />Örnek bcrypt hash ("supremacyadmin" parolası için):
          <br />
          <code className="break-all font-mono">{exampleHash}</code>
        </p>
        {!passwordSet && (
          <p className="mt-3 rounded-lg border border-supremacy-negative/40 bg-supremacy-negative/10 p-3 text-sm text-supremacy-negative">
            Şu anda herhangi bir yönetici parolası yapılandırılmamış.
          </p>
        )}
        <form onSubmit={handleAuthenticate} className="mt-6 space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="input-label">
              Parola
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field border-supremacy-border bg-[#1f1f1f]"
              placeholder="Yönetici parolasını girin"
            />
          </div>
          {authError && <p className="text-sm text-supremacy-negative">{authError}</p>}
          <button
            type="submit"
            className="primary-button w-full bg-supremacy-primary text-black hover:bg-supremacy-primary-hover"
          >
            Giriş Yap
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
        <h1 className="text-3xl font-semibold text-white">Yönetim Paneli</h1>
        <p className="text-sm text-slate-300">Lonca Siphon sayacını ve kayıt bakımını buradan yönetin.</p>
      </div>

      <GlassCard
        title="Güncel Lonca Siphon"
        description="Gösterge panelindeki ana Siphon göstergesini güncelleyin."
        className="rounded-xl border border-supremacy-border bg-supremacy-surface/95"
      >
        <form onSubmit={handleUpdateTotal} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="guild-total" className="input-label">
              Lonca bakiyesi
            </label>
            <input
              id="guild-total"
              type="number"
              step="0.01"
              value={guildInput}
              onChange={(event) => setGuildInput(event.target.value)}
              className="input-field border-supremacy-border bg-[#1f1f1f]"
            />
            <p className="text-xs text-slate-400">Kayıtlı değer: {formatSiphon(guildTotal)}</p>
          </div>
          <button
            type="submit"
            className="primary-button bg-supremacy-primary text-black hover:bg-supremacy-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            disabled={busyAction === "update"}
          >
            {busyAction === "update" ? "Kaydediliyor…" : "Bakiyeyi Kaydet"}
          </button>
        </form>
      </GlassCard>

      <GlassCard
        title="Bakım Araçları"
        description="Kayıtları yedekleyin veya sıfırlayın."
        className="rounded-xl border border-supremacy-border bg-supremacy-surface/95"
      >
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleBackupLogs}
            className="secondary-button border-supremacy-border text-slate-100 hover:border-supremacy-primary"
            disabled={busyAction === "backup"}
          >
            {busyAction === "backup" ? "Dışa aktarılıyor…" : "Kayıtları Yedekle"}
          </button>
          <button
            type="button"
            onClick={handleResetLogs}
            className="secondary-button border-supremacy-negative/60 text-supremacy-negative hover:border-supremacy-negative hover:text-white"
            disabled={busyAction === "reset"}
          >
            {busyAction === "reset" ? "Temizleniyor…" : "Kayıtları Sıfırla"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}
