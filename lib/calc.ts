import type { LogRecord, MemberRecord } from "./types";

export interface MemberSummary {
  name: string;
  initialBalance: number;
  totalDeposits: number;
  totalWithdrawals: number;
  net: number;
  lastActivity?: Date;
}

export interface LedgerTotals {
  totalDeposits: number;
  totalWithdrawals: number;
  guildNet: number;
}

function ensureMemberEntry(map: Map<string, MemberSummary>, name: string) {
  const key = name.trim().toLowerCase();
  if (!map.has(key)) {
    map.set(key, {
      name,
      initialBalance: 0,
      totalDeposits: 0,
      totalWithdrawals: 0,
      net: 0,
    });
  }
  return map.get(key)!;
}

export function buildMemberSummaries(members: MemberRecord[], logs: LogRecord[]): MemberSummary[] {
  const memberMap = new Map<string, MemberSummary>();

  members.forEach((member) => {
    const entry = ensureMemberEntry(memberMap, member.name);
    entry.initialBalance = member.initialBalance ?? 0;
    entry.net = entry.initialBalance;
  });

  logs.forEach((log) => {
    const entry = ensureMemberEntry(memberMap, log.player);
    if (log.reason === "Deposit") {
      entry.totalDeposits += log.amount;
    } else {
      entry.totalWithdrawals += Math.abs(log.amount);
    }
    entry.net += log.amount;
    if (!entry.lastActivity || entry.lastActivity < log.date) {
      entry.lastActivity = log.date;
    }
  });

  return Array.from(memberMap.values()).sort((a, b) => b.net - a.net || a.name.localeCompare(b.name));
}

export function computeLedgerTotals(
  summaries: MemberSummary[],
  initialGuildBalance = 0,
): LedgerTotals {
  const totalDeposits = summaries.reduce((acc, member) => acc + member.totalDeposits, 0);
  const totalWithdrawals = summaries.reduce((acc, member) => acc + member.totalWithdrawals, 0);
  const guildNet = initialGuildBalance + totalDeposits - totalWithdrawals;

  return {
    totalDeposits,
    totalWithdrawals,
    guildNet,
  };
}
