export type LogReason = "Deposit" | "Withdrawal";

export interface MemberRecord {
  id: string;
  name: string;
  initialBalance?: number | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface LogRecord {
  id: string;
  player: string;
  reason: LogReason;
  amount: number;
  date: Date;
  note?: string | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}
