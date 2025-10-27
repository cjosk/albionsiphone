import { getApp, getApps, initializeApp } from "firebase/app";
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  initializeFirestore,
  onSnapshot,
  persistentLocalCache,
  persistentMultipleTabManager,
  serverTimestamp,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import type { LogRecord } from "./types";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

if (Object.values(firebaseConfig).some((value) => !value)) {
  console.warn("Firebase configuration is incomplete. Please review your environment variables.");
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

let firestoreInstance: Firestore | null = null;

export function getDb() {
  if (firestoreInstance) {
    return firestoreInstance;
  }

  if (typeof window !== "undefined") {
    try {
      firestoreInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager(),
        }),
      });
    } catch (error) {
      firestoreInstance = getFirestore(app);
    }
  } else {
    firestoreInstance = getFirestore(app);
  }

  return firestoreInstance;
}

export const db = getDb();
export { app };

const SETTINGS_COLLECTION = "settings";
const SETTINGS_DOC_ID = "guild";

export interface GuildSettings {
  siphonTotal: number;
}

const DEFAULT_SETTINGS: GuildSettings = {
  siphonTotal: 0,
};

function getGuildSettingsDoc() {
  return doc(db, SETTINGS_COLLECTION, SETTINGS_DOC_ID);
}

export function listenToGuildSettings(callback: (settings: GuildSettings) => void) {
  return onSnapshot(getGuildSettingsDoc(), (snapshot) => {
    const data = snapshot.data();
    callback({
      siphonTotal: typeof data?.siphonTotal === "number" ? data.siphonTotal : DEFAULT_SETTINGS.siphonTotal,
    });
  });
}

export async function getGuildSettings(): Promise<GuildSettings> {
  const snapshot = await getDoc(getGuildSettingsDoc());
  const data = snapshot.data();
  return {
    siphonTotal: typeof data?.siphonTotal === "number" ? data.siphonTotal : DEFAULT_SETTINGS.siphonTotal,
  };
}

export async function updateGuildSiphonTotal(amount: number) {
  await setDoc(
    getGuildSettingsDoc(),
    {
      siphonTotal: amount,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function clearLogsCollection() {
  const snapshot = await getDocs(collection(db, "logs"));
  if (snapshot.empty) {
    return;
  }

  const batch = writeBatch(db);
  snapshot.docs.forEach((docSnapshot) => {
    batch.delete(docSnapshot.ref);
  });
  await batch.commit();
}

export async function fetchAllLogs(): Promise<LogRecord[]> {
  const snapshot = await getDocs(collection(db, "logs"));
  return snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    const rawDate = data.date;
    const date = rawDate?.toDate ? rawDate.toDate() : new Date(rawDate ?? 0);
    return {
      id: docSnapshot.id,
      player: data.player ?? "Unknown",
      reason: data.reason === "Withdrawal" ? "Withdrawal" : "Deposit",
      amount: typeof data.amount === "number" ? data.amount : Number(data.amount ?? 0),
      date,
      note: data.note ?? null,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : null,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : null,
    } satisfies LogRecord;
  });
}
