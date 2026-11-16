// [2026-11-16] [17:00] - FEAT: Created useCashSync hook to synchronize local Zustand expenses with Firebase cashRooms.
// src/hooks/useCashSync.ts

import { useEffect, useRef, useState } from 'react';
import { useTripStore } from '../store/useTripStore';
import {
  isFirebaseConfigured,
  subscribeCashRoom,
  upsertRemoteExpense,
  deleteRemoteExpense,
  updateRemoteRoomMeta,
  type CashRoomMeta
} from '../services/firebaseCashService';
import type { Expense, CurrencyConfig } from '../core/types/shared';

export interface GuestRoomParams {
  roomId: string;
  writeToken: string;
}

export const useCashSync = (guestParams?: GuestRoomParams | null) => {
  const { project, applyRemoteCashState, setCashSync } = useTripStore();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  const activeRoomId = guestParams?.roomId || (project.data.cashSync?.enabled ? project.data.cashSync.roomId : null);
  const activeToken = guestParams?.writeToken || (project.data.cashSync?.enabled ? project.data.cashSync.writeToken : null);

  const lastRemoteExpensesRef = useRef<Record<string, Expense>>({});
  const lastRemoteMetaRef = useRef<{ travelerNames?: string; currencyConfig?: CurrencyConfig; tripName?: string }>({});
  const hasInitialSnapshotRef = useRef(false);

  // If guest link opened, ensure cashSync is stored in transient state for UI awareness
  useEffect(() => {
    if (guestParams && (!project.data.cashSync || project.data.cashSync.roomId !== guestParams.roomId)) {
      setCashSync({
        roomId: guestParams.roomId,
        writeToken: guestParams.writeToken,
        enabled: true
      });
    }
  }, [guestParams, project.data.cashSync, setCashSync]);

  // 1. Subscribe to Firestore room & expenses
  useEffect(() => {
    if (!activeRoomId || !isFirebaseConfigured()) {
      setIsSynced(false);
      return;
    }

    hasInitialSnapshotRef.current = false;
    setSyncError(null);

    const unsubscribe = subscribeCashRoom(activeRoomId, {
      onMeta: (meta: CashRoomMeta) => {
        lastRemoteMetaRef.current = {
          tripName: meta.tripName,
          travelerNames: meta.travelerNames,
          currencyConfig: meta.currencyConfig
        };
        applyRemoteCashState({
          tripName: meta.tripName,
          travelerNames: meta.travelerNames,
          currencyConfig: meta.currencyConfig
        });
        setIsSynced(true);
      },
      onExpenses: (remoteExpenses: Record<string, Expense>) => {
        lastRemoteExpensesRef.current = remoteExpenses;
        hasInitialSnapshotRef.current = true;
        applyRemoteCashState({ expenses: remoteExpenses });
        setIsSynced(true);
      },
      onError: (err: Error) => {
        setSyncError(err.message || 'Sync-Fehler');
      }
    });

    return () => {
      unsubscribe();
      hasInitialSnapshotRef.current = false;
    };
  }, [activeRoomId, applyRemoteCashState]);

  // 2. Push local expense changes to Firestore
  useEffect(() => {
    if (!activeRoomId || !hasInitialSnapshotRef.current || !isFirebaseConfigured()) return;

    const currentExpenses = (project.data.expenses || {}) as Record<string, Expense>;
    const prevExpenses = lastRemoteExpensesRef.current;

    // Upsert added or modified expenses
    for (const [id, exp] of Object.entries(currentExpenses)) {
      const prev = prevExpenses[id];
      if (!prev || JSON.stringify(prev) !== JSON.stringify(exp)) {
        lastRemoteExpensesRef.current = { ...lastRemoteExpensesRef.current, [id]: exp };
        upsertRemoteExpense(activeRoomId, exp).catch((err) => setSyncError(err.message));
      }
    }

    // Delete removed expenses
    for (const id of Object.keys(prevExpenses)) {
      if (!(id in currentExpenses)) {
        const nextRef = { ...lastRemoteExpensesRef.current };
        delete nextRef[id];
        lastRemoteExpensesRef.current = nextRef;
        deleteRemoteExpense(activeRoomId, id).catch((err) => setSyncError(err.message));
      }
    }
  }, [activeRoomId, project.data.expenses]);

  // 3. Push local travelerNames or currencyConfig changes to Firestore
  useEffect(() => {
    if (!activeRoomId || !activeToken || !hasInitialSnapshotRef.current || !isFirebaseConfigured()) return;

    const currentNames = project.userInputs?.travelers?.travelerNames || '';
    const currentCurrency = project.data.currencyConfig;
    const prevMeta = lastRemoteMetaRef.current;

    const namesChanged = prevMeta.travelerNames !== undefined && prevMeta.travelerNames !== currentNames;
    const currencyChanged =
      currentCurrency !== undefined &&
      JSON.stringify(prevMeta.currencyConfig) !== JSON.stringify(currentCurrency);

    if (namesChanged || currencyChanged) {
      lastRemoteMetaRef.current = {
        ...prevMeta,
        travelerNames: currentNames,
        currencyConfig: currentCurrency
      };
      updateRemoteRoomMeta(activeRoomId, activeToken, {
        ...(namesChanged ? { travelerNames: currentNames } : {}),
        ...(currencyChanged ? { currencyConfig: currentCurrency } : {})
      }).catch((err) => setSyncError(err.message));
    }
  }, [activeRoomId, activeToken, project.userInputs?.travelers?.travelerNames, project.data.currencyConfig]);

  return { isSynced, syncError, activeRoomId };
};
// --- END OF FILE 136 Zeilen ---
