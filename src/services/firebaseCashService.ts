// [2026-11-17] [12:52] - FIX: Supported comma-separated multi-person input in addTravelerSafe with per-name duplicate check.
// [2026-11-17] [12:44] - FEAT: Added defaultWeights to CashRoomMeta, createCashRoom, and updateRemoteRoomMeta.
// [2026-11-17] [10:25] - FEAT: Added tripDates, addTravelerSafe (online+duplicate check), and local user identity helpers.
// [2026-11-16] [19:25] - FEAT: Added listAvailableCashRooms and local known-rooms registry for room selection UI.
// [2026-11-16] [19:16] - FEAT: Added room status ('open'|'closed'), setCashRoomStatus, deleteCashRoom, and onRoomDeleted support.
// [2026-11-16] [17:35] - FEAT: Added hostUid to CashRoomMeta on room creation so only the host can update/delete expenses.
// [2026-11-16] [17:00] - FEAT: Created Firebase Firestore service for live shared Reisekasse (cashRooms).
// src/services/firebaseCashService.ts

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDoc,
  getDocFromServer,
  getDocs,
  query,
  where,
  onSnapshot,
  writeBatch,
  type Firestore,
  type Unsubscribe
} from 'firebase/firestore';
import type { Expense, CurrencyConfig } from '../core/types/shared';

export interface CashRoomMeta {
  tripName: string;
  tripDates?: string;
  travelerNames: string;
  currencyConfig?: CurrencyConfig;
  defaultWeights?: Record<string, number>;
  writeToken: string;
  hostUid: string;
  status?: 'open' | 'closed';
  updatedAt: number;
}

export interface CashRoomListItem {
  roomId: string;
  writeToken: string;
  tripName: string;
  tripDates?: string;
  status: 'open' | 'closed';
  updatedAt: number;
  isHost: boolean;
}

const KNOWN_ROOMS_STORAGE_KEY = 'papatours_known_cash_rooms';
const CASH_IDENTITY_PREFIX = 'papatours_cash_identity_';

export const getStoredCashIdentity = (roomId?: string): string => {
  try {
    return localStorage.getItem(`${CASH_IDENTITY_PREFIX}${roomId || 'local'}`) || '';
  } catch {
    return '';
  }
};

export const setStoredCashIdentity = (roomId: string | undefined, name: string): void => {
  try {
    const key = `${CASH_IDENTITY_PREFIX}${roomId || 'local'}`;
    if (name) {
      localStorage.setItem(key, name);
    } else {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore storage errors
  }
};

export const rememberCashRoom = (entry: { roomId: string; writeToken: string; tripName?: string }) => {
  try {
    const raw = localStorage.getItem(KNOWN_ROOMS_STORAGE_KEY);
    const list: { roomId: string; writeToken: string; tripName?: string }[] = raw ? JSON.parse(raw) : [];
    const filtered = list.filter((r) => r.roomId !== entry.roomId);
    filtered.unshift(entry);
    localStorage.setItem(KNOWN_ROOMS_STORAGE_KEY, JSON.stringify(filtered.slice(0, 20)));
  } catch {
    // ignore storage errors
  }
};

export const forgetCashRoom = (roomId: string) => {
  try {
    const raw = localStorage.getItem(KNOWN_ROOMS_STORAGE_KEY);
    if (!raw) return;
    const list: { roomId: string }[] = JSON.parse(raw);
    localStorage.setItem(KNOWN_ROOMS_STORAGE_KEY, JSON.stringify(list.filter((r) => r.roomId !== roomId)));
  } catch {
    // ignore storage errors
  }
};

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string | undefined,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined
};

export const isFirebaseConfigured = (): boolean => {
  return Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);
};

let appInstance: FirebaseApp | null = null;
let dbInstance: Firestore | null = null;

const getFirebaseClients = () => {
  if (!isFirebaseConfigured()) {
    throw new Error('Firebase ist nicht konfiguriert (.env.local fehlt).');
  }

  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  }

  if (!dbInstance) {
    try {
      dbInstance = initializeFirestore(appInstance, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
    } catch {
      dbInstance = getFirestore(appInstance);
    }
  }

  const auth = getAuth(appInstance);
  return { app: appInstance, db: dbInstance, auth };
};

export const ensureAnonymousAuth = async (): Promise<void> => {
  const { auth } = getFirebaseClients();
  if (auth.currentUser) return;
  await signInAnonymously(auth);
};

const stripUndefined = <T extends Record<string, any>>(obj: T): T => {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      clean[key] = val;
    }
  }
  return clean as T;
};

export const createCashRoom = async (params: {
  tripName: string;
  tripDates?: string;
  travelerNames: string;
  currencyConfig?: CurrencyConfig;
  defaultWeights?: Record<string, number>;
  initialExpenses: Record<string, Expense>;
}): Promise<{ roomId: string; writeToken: string }> => {
  await ensureAnonymousAuth();
  const { db, auth } = getFirebaseClients();

  const roomId = crypto.randomUUID();
  const writeToken = `${crypto.randomUUID().replace(/-/g, '')}`;

  const roomRef = doc(db, 'cashRooms', roomId);
  const metaPayload: CashRoomMeta = stripUndefined({
    tripName: params.tripName || 'Reisekasse',
    tripDates: params.tripDates,
    travelerNames: params.travelerNames || '',
    currencyConfig: params.currencyConfig,
    defaultWeights: params.defaultWeights,
    writeToken,
    hostUid: auth.currentUser?.uid || '',
    status: 'open',
    updatedAt: Date.now()
  });

  await setDoc(roomRef, metaPayload);
  rememberCashRoom({ roomId, writeToken, tripName: metaPayload.tripName });

  const expenses = Object.values(params.initialExpenses || {});
  if (expenses.length > 0) {
    const batch = writeBatch(db);
    for (const exp of expenses) {
      const expRef = doc(db, 'cashRooms', roomId, 'expenses', exp.id);
      batch.set(expRef, stripUndefined(exp));
    }
    await batch.commit();
  }

  return { roomId, writeToken };
};

export const subscribeCashRoom = (
  roomId: string,
  callbacks: {
    onMeta: (meta: CashRoomMeta) => void;
    onExpenses: (expenses: Record<string, Expense>) => void;
    onRoomDeleted?: () => void;
    onError: (err: Error) => void;
  }
): Unsubscribe => {
  let unsubRoom: Unsubscribe | null = null;
  let unsubExpenses: Unsubscribe | null = null;
  let cancelled = false;

  ensureAnonymousAuth()
    .then(() => {
      if (cancelled) return;
      const { db } = getFirebaseClients();

      unsubRoom = onSnapshot(
        doc(db, 'cashRooms', roomId),
        (snap) => {
          if (snap.exists()) {
            callbacks.onMeta(snap.data() as CashRoomMeta);
          } else {
            callbacks.onRoomDeleted?.();
          }
        },
        (err) => callbacks.onError(err)
      );

      unsubExpenses = onSnapshot(
        collection(db, 'cashRooms', roomId, 'expenses'),
        (snap) => {
          const map: Record<string, Expense> = {};
          snap.forEach((d) => {
            map[d.id] = d.data() as Expense;
          });
          callbacks.onExpenses(map);
        },
        (err) => callbacks.onError(err)
      );
    })
    .catch((err) => {
      if (!cancelled) callbacks.onError(err);
    });

  return () => {
    cancelled = true;
    unsubRoom?.();
    unsubExpenses?.();
  };
};

export const upsertRemoteExpense = async (roomId: string, expense: Expense): Promise<void> => {
  await ensureAnonymousAuth();
  const { db } = getFirebaseClients();
  const ref = doc(db, 'cashRooms', roomId, 'expenses', expense.id);
  await setDoc(ref, stripUndefined(expense));
};

export const deleteRemoteExpense = async (roomId: string, expenseId: string): Promise<void> => {
  await ensureAnonymousAuth();
  const { db } = getFirebaseClients();
  const ref = doc(db, 'cashRooms', roomId, 'expenses', expenseId);
  await deleteDoc(ref);
};

export const updateRemoteRoomMeta = async (
  roomId: string,
  writeToken: string,
  partial: Partial<Pick<CashRoomMeta, 'tripName' | 'tripDates' | 'travelerNames' | 'currencyConfig' | 'defaultWeights' | 'status'>>
): Promise<void> => {
  await ensureAnonymousAuth();
  const { db } = getFirebaseClients();
  const ref = doc(db, 'cashRooms', roomId);
  await updateDoc(
    ref,
    stripUndefined({
      ...partial,
      writeToken,
      updatedAt: Date.now()
    })
  );
};

export const setCashRoomStatus = async (
  roomId: string,
  writeToken: string,
  status: 'open' | 'closed'
): Promise<void> => {
  await updateRemoteRoomMeta(roomId, writeToken, { status });
};

export const deleteCashRoom = async (roomId: string): Promise<void> => {
  await ensureAnonymousAuth();
  const { db } = getFirebaseClients();
  const expensesSnap = await getDocs(collection(db, 'cashRooms', roomId, 'expenses'));
  if (!expensesSnap.empty) {
    const batch = writeBatch(db);
    expensesSnap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  await deleteDoc(doc(db, 'cashRooms', roomId));
  forgetCashRoom(roomId);
};

export const listAvailableCashRooms = async (): Promise<CashRoomListItem[]> => {
  if (!isFirebaseConfigured()) return [];
  await ensureAnonymousAuth();
  const { db, auth } = getFirebaseClients();
  const uid = auth.currentUser?.uid || '';

  const byId = new Map<string, CashRoomListItem>();

  if (uid) {
    try {
      const q = query(collection(db, 'cashRooms'), where('hostUid', '==', uid));
      const snap = await getDocs(q);
      snap.forEach((d) => {
        const data = d.data() as CashRoomMeta;
        byId.set(d.id, {
          roomId: d.id,
          writeToken: data.writeToken,
          tripName: data.tripName || 'Reisekasse',
          tripDates: data.tripDates,
          status: data.status === 'closed' ? 'closed' : 'open',
          updatedAt: data.updatedAt || 0,
          isHost: true
        });
      });
    } catch {
      // Fallback to local known rooms if list rule is not yet published
    }
  }

  try {
    const raw = localStorage.getItem(KNOWN_ROOMS_STORAGE_KEY);
    const known: { roomId: string; writeToken: string }[] = raw ? JSON.parse(raw) : [];
    for (const item of known) {
      if (byId.has(item.roomId)) continue;
      try {
        const snap = await getDoc(doc(db, 'cashRooms', item.roomId));
        if (snap.exists()) {
          const data = snap.data() as CashRoomMeta;
          byId.set(snap.id, {
            roomId: snap.id,
            writeToken: data.writeToken || item.writeToken,
            tripName: data.tripName || 'Reisekasse',
            tripDates: data.tripDates,
            status: data.status === 'closed' ? 'closed' : 'open',
            updatedAt: data.updatedAt || 0,
            isHost: Boolean(uid && data.hostUid === uid)
          });
        } else {
          forgetCashRoom(item.roomId);
        }
      } catch {
        // ignore deleted or inaccessible room
      }
    }
  } catch {
    // ignore storage errors
  }

  return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
};

export type AddTravelerResult =
  | { ok: true; updatedTravelerNames: string; addedNames: string[] }
  | { ok: false; error: string };

const parseTravelerList = (raw: string): string[] =>
  (raw || '').split(',').map((n) => n.trim()).filter(Boolean);

export const addTravelerSafe = async (params: {
  rawInputName: string;
  currentTravelerNames: string;
  cashSync?: { roomId: string; writeToken: string; enabled: boolean };
}): Promise<AddTravelerResult> => {
  const parsedInputs = parseTravelerList(params.rawInputName);
  const uniqueInputs: string[] = [];
  for (const name of parsedInputs) {
    if (uniqueInputs.some((u) => u.toLowerCase() === name.toLowerCase())) {
      return {
        ok: false,
        error: `Der Name "${name}" ist doppelt in deiner Eingabe.`
      };
    }
    uniqueInputs.push(name);
  }

  if (uniqueInputs.length === 0) {
    return { ok: false, error: 'Bitte gib mindestens einen gültigen Namen ein.' };
  }

  const localList = parseTravelerList(params.currentTravelerNames);
  const localDuplicate = uniqueInputs.find((cand) =>
    localList.some((n) => n.toLowerCase() === cand.toLowerCase())
  );
  if (localDuplicate) {
    return {
      ok: false,
      error: `Der Name "${localDuplicate}" existiert bereits und kann nicht doppelt angelegt werden.`
    };
  }

  if (params.cashSync?.enabled && params.cashSync.roomId && params.cashSync.writeToken) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        ok: false,
        error: 'Neue Namen können bei einer Live-Kasse nur online angelegt werden.'
      };
    }

    await ensureAnonymousAuth();
    const { db } = getFirebaseClients();
    const roomRef = doc(db, 'cashRooms', params.cashSync.roomId);
    const serverSnap = await getDocFromServer(roomRef);
    const serverNamesRaw = serverSnap.exists()
      ? ((serverSnap.data() as CashRoomMeta).travelerNames || '')
      : params.currentTravelerNames;

    const mergedList = Array.from(new Set([...parseTravelerList(serverNamesRaw), ...localList]));
    const serverDuplicate = uniqueInputs.find((cand) =>
      mergedList.some((n) => n.toLowerCase() === cand.toLowerCase())
    );
    if (serverDuplicate) {
      return {
        ok: false,
        error: `Der Name "${serverDuplicate}" existiert bereits und kann nicht doppelt angelegt werden.`
      };
    }

    const updatedTravelerNames = [...mergedList, ...uniqueInputs].join(', ');
    await updateDoc(roomRef, {
      travelerNames: updatedTravelerNames,
      writeToken: params.cashSync.writeToken,
      updatedAt: Date.now()
    });
    return { ok: true, updatedTravelerNames, addedNames: uniqueInputs };
  }

  const updatedTravelerNames = [...localList, ...uniqueInputs].join(', ');
  return { ok: true, updatedTravelerNames, addedNames: uniqueInputs };
};
// --- END OF FILE 447 Zeilen ---
