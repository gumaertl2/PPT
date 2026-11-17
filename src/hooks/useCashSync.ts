// [2026-11-17] [12:44] - FEAT: Synced defaultWeights and set isCashRoomLoaded transient flag when metadata arrives.
// [2026-11-17] [12:00] - FEAT: Synced local tripName and tripDates edits to Firestore room metadata.
// [2026-11-17] [10:28] - FEAT: Synced meta.tripDates into cashSync and forwarded syncError into store.
// [2026-11-16] [19:16] - FEAT: Synced room status ('open'|'closed') and handled remote room deletion.
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
  const { project, applyRemoteCashState, setCashSync, setCashSyncError, setCashRoomLoaded } = useTripStore();
  const [syncError, setSyncErrorState] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  const reportSyncError = (msg: string | null) => {
    setSyncErrorState(msg);
    setCashSyncError(msg);
  };

  const activeRoomId = guestParams?.roomId || (project.data.cashSync?.enabled ? project.data.cashSync.roomId : null);
  const activeToken = guestParams?.writeToken || (project.data.cashSync?.enabled ? project.data.cashSync.writeToken : null);

  const lastRemoteExpensesRef = useRef<Record<string, Expense>>({});
  const lastRemoteMetaRef = useRef<{
    travelerNames?: string;
    currencyConfig?: CurrencyConfig;
    defaultWeights?: Record<string, number>;
    tripName?: string;
    tripDates?: string;
  }>({});
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
    setCashRoomLoaded(false);
    reportSyncError(null);

    const unsubscribe = subscribeCashRoom(activeRoomId, {
      onMeta: (meta: CashRoomMeta) => {
        lastRemoteMetaRef.current = {
          tripName: meta.tripName,
          tripDates: meta.tripDates,
          travelerNames: meta.travelerNames,
          currencyConfig: meta.currencyConfig,
          defaultWeights: meta.defaultWeights
        };
        applyRemoteCashState({
          tripName: meta.tripName,
          travelerNames: meta.travelerNames,
          currencyConfig: meta.currencyConfig,
          defaultExpenseWeights: meta.defaultWeights
        });
        const currentSync = useTripStore.getState().project.data.cashSync;
        const nextStatus = meta.status || 'open';
        const nextDates = meta.tripDates;
        if (currentSync && (currentSync.roomStatus !== nextStatus || currentSync.tripDates !== nextDates)) {
          setCashSync({ ...currentSync, roomStatus: nextStatus, tripDates: nextDates });
        }
        setCashRoomLoaded(true);
        reportSyncError(null);
        setIsSynced(true);
      },
      onExpenses: (remoteExpenses: Record<string, Expense>) => {
        lastRemoteExpensesRef.current = remoteExpenses;
        hasInitialSnapshotRef.current = true;
        applyRemoteCashState({ expenses: remoteExpenses });
        reportSyncError(null);
        setIsSynced(true);
      },
      onRoomDeleted: () => {
        setCashSync(undefined);
        setIsSynced(false);
        reportSyncError('Dieser Live-Raum wurde geschlossen bzw. gelöscht.');
      },
      onError: (err: Error) => {
        reportSyncError(err.message || 'Sync-Fehler');
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
        upsertRemoteExpense(activeRoomId, exp).catch((err) => reportSyncError(err.message));
      }
    }

    // Delete removed expenses
    for (const id of Object.keys(prevExpenses)) {
      if (!(id in currentExpenses)) {
        const nextRef = { ...lastRemoteExpensesRef.current };
        delete nextRef[id];
        lastRemoteExpensesRef.current = nextRef;
        deleteRemoteExpense(activeRoomId, id).catch((err) => reportSyncError(err.message));
      }
    }
  }, [activeRoomId, project.data.expenses]);

  // 3. Push local travelerNames, currencyConfig, defaultWeights, tripName or tripDates changes to Firestore
  useEffect(() => {
    if (!activeRoomId || !activeToken || !hasInitialSnapshotRef.current || !isFirebaseConfigured()) return;

    const currentNames = project.userInputs?.travelers?.travelerNames || '';
    const currentCurrency = project.data.currencyConfig;
    const currentWeights = project.data.defaultExpenseWeights;
    const currentTripName = project.meta?.name || '';
    const currentTripDates = project.data.cashSync?.tripDates;
    const prevMeta = lastRemoteMetaRef.current;

    const namesChanged = prevMeta.travelerNames !== undefined && prevMeta.travelerNames !== currentNames;
    const currencyChanged =
      currentCurrency !== undefined &&
      JSON.stringify(prevMeta.currencyConfig) !== JSON.stringify(currentCurrency);
    const weightsChanged =
      currentWeights !== undefined &&
      JSON.stringify(prevMeta.defaultWeights) !== JSON.stringify(currentWeights);
    const tripNameChanged =
      prevMeta.tripName !== undefined &&
      Boolean(currentTripName.trim()) &&
      currentTripName !== 'Neue Reise' &&
      currentTripName !== 'New Trip' &&
      prevMeta.tripName !== currentTripName;
    const tripDatesChanged =
      currentTripDates !== undefined &&
      prevMeta.tripDates !== currentTripDates;

    if (namesChanged || currencyChanged || weightsChanged || tripNameChanged || tripDatesChanged) {
      lastRemoteMetaRef.current = {
        ...prevMeta,
        travelerNames: currentNames,
        currencyConfig: currentCurrency,
        defaultWeights: currentWeights,
        ...(tripNameChanged ? { tripName: currentTripName } : {}),
        ...(tripDatesChanged ? { tripDates: currentTripDates } : {})
      };
      updateRemoteRoomMeta(activeRoomId, activeToken, {
        ...(namesChanged ? { travelerNames: currentNames } : {}),
        ...(currencyChanged ? { currencyConfig: currentCurrency } : {}),
        ...(weightsChanged ? { defaultWeights: currentWeights } : {}),
        ...(tripNameChanged ? { tripName: currentTripName } : {}),
        ...(tripDatesChanged ? { tripDates: currentTripDates } : {})
      }).catch((err) => reportSyncError(err.message));
    }
  }, [
    activeRoomId,
    activeToken,
    project.userInputs?.travelers?.travelerNames,
    project.data.currencyConfig,
    project.data.defaultExpenseWeights,
    project.meta?.name,
    project.data.cashSync?.tripDates
  ]);

  return { isSynced, syncError, activeRoomId };
};
// --- END OF FILE 193 Zeilen ---
