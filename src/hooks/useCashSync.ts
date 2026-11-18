// [2026-11-18] [16:21] - FEAT: Synced isCashRoomOriginalHost flag for Option A PIN ownership.
// [2026-11-18] [15:54] - FIX/FEAT: Added pendingDeletesRef guard, preserved write/delete errors across snapshot rollbacks, and synced isCashRoomHost/cashRoomHasPassword.
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
  type CashRoomMeta,
  type CashRoomAccessInfo
} from '../services/firebaseCashService';
import type { Expense, CurrencyConfig } from '../core/types/shared';

export interface GuestRoomParams {
  roomId: string;
  writeToken: string;
}

export const useCashSync = (guestParams?: GuestRoomParams | null) => {
  const { project, applyRemoteCashState, setCashSync, setCashSyncError, setCashRoomLoaded, setCashRoomHost, setCashRoomOriginalHost, setCashRoomHasPassword } = useTripStore();
  const [syncError, setSyncErrorState] = useState<string | null>(null);
  const [isSynced, setIsSynced] = useState(false);

  const reportSyncError = (msg: string | null) => {
    setSyncErrorState(msg);
    setCashSyncError(msg);
  };

  const activeRoomId = guestParams?.roomId || (project.data.cashSync?.enabled ? project.data.cashSync.roomId : null);
  const activeToken = guestParams?.writeToken || (project.data.cashSync?.enabled ? project.data.cashSync.writeToken : null);

  const lastRemoteExpensesRef = useRef<Record<string, Expense>>({});
  const lastServerExpensesRef = useRef<Record<string, Expense>>({});
  const pendingDeletesRef = useRef<Set<string>>(new Set());
  const hasWriteErrorRef = useRef(false);
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
      setCashRoomHost(true);
      setCashRoomOriginalHost(true);
      setCashRoomHasPassword(false);
      hasWriteErrorRef.current = false;
      pendingDeletesRef.current.clear();
      return;
    }

    hasInitialSnapshotRef.current = false;
    hasWriteErrorRef.current = false;
    pendingDeletesRef.current.clear();
    setCashRoomLoaded(false);
    reportSyncError(null);

    const unsubscribe = subscribeCashRoom(activeRoomId, {
      onMeta: (meta: CashRoomMeta, access: CashRoomAccessInfo) => {
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
        setCashRoomHost(access.isHost);
        setCashRoomOriginalHost(access.isOriginalHost);
        setCashRoomHasPassword(access.hasAdminPassword);
        setCashRoomLoaded(true);
        if (!hasWriteErrorRef.current) {
          reportSyncError(null);
        }
        setIsSynced(true);
      },
      onExpenses: (remoteExpenses: Record<string, Expense>) => {
        lastServerExpensesRef.current = remoteExpenses;
        let effectiveRemote = remoteExpenses;
        if (pendingDeletesRef.current.size > 0) {
          effectiveRemote = { ...remoteExpenses };
          pendingDeletesRef.current.forEach((delId) => {
            delete effectiveRemote[delId];
          });
        }
        lastRemoteExpensesRef.current = effectiveRemote;
        hasInitialSnapshotRef.current = true;
        applyRemoteCashState({ expenses: effectiveRemote });
        if (!hasWriteErrorRef.current) {
          reportSyncError(null);
        }
        setIsSynced(true);
      },
      onRoomDeleted: () => {
        setCashSync(undefined);
        setCashRoomHost(true);
        setCashRoomOriginalHost(true);
        setCashRoomHasPassword(false);
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
        upsertRemoteExpense(activeRoomId, exp)
          .then(() => {
            if (hasWriteErrorRef.current) {
              hasWriteErrorRef.current = false;
              reportSyncError(null);
            }
          })
          .catch((err) => {
            hasWriteErrorRef.current = true;
            const isPerm = err?.code === 'permission-denied' || String(err?.message || '').toLowerCase().includes('permission');
            reportSyncError(
              isPerm
                ? 'Speichern/Ändern nicht erlaubt: Dieser Browser ist nicht als Host des Live-Raums freigeschaltet.'
                : (err?.message || 'Sync-Fehler beim Speichern')
            );
          });
      }
    }

    // Delete removed expenses
    for (const id of Object.keys(prevExpenses)) {
      if (!(id in currentExpenses)) {
        const nextRef = { ...lastRemoteExpensesRef.current };
        delete nextRef[id];
        lastRemoteExpensesRef.current = nextRef;
        pendingDeletesRef.current.add(id);
        deleteRemoteExpense(activeRoomId, id)
          .then(() => {
            pendingDeletesRef.current.delete(id);
            if (hasWriteErrorRef.current) {
              hasWriteErrorRef.current = false;
              reportSyncError(null);
            }
          })
          .catch((err) => {
            pendingDeletesRef.current.delete(id);
            hasWriteErrorRef.current = true;
            const isPerm = err?.code === 'permission-denied' || String(err?.message || '').toLowerCase().includes('permission');
            reportSyncError(
              isPerm
                ? 'Löschen nicht erlaubt: Dieser Browser ist nicht als Host dieses Live-Raums freigeschaltet (ggf. per Host-PIN entsperren).'
                : (err?.message || 'Fehler beim Löschen')
            );
            if (lastServerExpensesRef.current[id]) {
              lastRemoteExpensesRef.current = { ...lastServerExpensesRef.current };
              applyRemoteCashState({ expenses: { ...lastServerExpensesRef.current } });
            }
          });
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
// --- END OF FILE 270 Zeilen ---
