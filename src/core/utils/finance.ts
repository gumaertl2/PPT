// [2026-11-18] [09:30] - FEAT: Added computeExpenseMatrix pure helper for payer x recipient overview matrix.
// [2026-11-17] [16:51] - FEAT: Added buildInitialExactSplit helper for cent-accurate exact prefill when switching from equal/weights modes.
// [2026-11-17] [16:46] - FEAT: Added formatSplitParticipantsLabel helper for showing participant names instead of anonymous counts.
// [2026-11-17] [16:26] - FEAT: Added sortTravelerNames helper to sort active identity first followed by A-Z.
// [2026-11-17] [12:08] - FEAT: Created shared pure finance helper for calculating exact, weighted, and equal expense shares.
// src/core/utils/finance.ts

import type { Expense } from '../types/shared';

/**
 * Calculates each participant's share of an expense in the base currency.
 */
export const calculateExpenseSharesInBase = (
  exp: Expense,
  rate: number
): Record<string, number> => {
  const safeRate = rate > 0 ? rate : 1;
  const amountInBase = exp.amount / safeRate;
  const shares: Record<string, number> = {};

  if (exp.splitExact && Object.keys(exp.splitExact).length > 0) {
    Object.entries(exp.splitExact).forEach(([person, amt]) => {
      shares[person] = amt / safeRate;
    });
    return shares;
  }

  if (exp.splitWeights && Object.keys(exp.splitWeights).length > 0) {
    const totalWeight = Object.values(exp.splitWeights).reduce(
      (sum, w) => sum + (w > 0 ? w : 0),
      0
    );
    if (totalWeight > 0) {
      Object.entries(exp.splitWeights).forEach(([person, w]) => {
        if (w > 0) {
          shares[person] = (amountInBase * w) / totalWeight;
        }
      });
      return shares;
    }
  }

  if (exp.splitAmong && exp.splitAmong.length > 0) {
    const splitAmountInBase = amountInBase / exp.splitAmong.length;
    exp.splitAmong.forEach((person) => {
      shares[person] = splitAmountInBase;
    });
  }

  return shares;
};

/**
 * Calculates preview amounts per person from a weight map (in the expense's own currency).
 */
export const computeWeightedAmounts = (
  totalAmount: number,
  weights: Record<string, number>
): Record<string, number> => {
  const result: Record<string, number> = {};
  if (totalAmount <= 0) return result;
  const totalWeight = Object.values(weights).reduce(
    (sum, w) => sum + (w > 0 ? w : 0),
    0
  );
  if (totalWeight <= 0) return result;

  Object.entries(weights).forEach(([person, w]) => {
    if (w > 0) {
      result[person] = (totalAmount * w) / totalWeight;
    }
  });
  return result;
};

/**
 * Sorts participant names with the active identity first, followed by remaining names A-Z.
 */
export const sortTravelerNames = (
  names: string[],
  myIdentity?: string
): string[] => {
  const me = myIdentity?.trim().toLowerCase();
  return [...names].sort((a, b) => {
    const aIsMe = Boolean(me && a.trim().toLowerCase() === me);
    const bIsMe = Boolean(me && b.trim().toLowerCase() === me);
    if (aIsMe && !bIsMe) return -1;
    if (!aIsMe && bIsMe) return 1;
    return a.localeCompare(b, undefined, { sensitivity: 'base' });
  });
};

/**
 * Formats selected participants for compact split toggle labels (shows names instead of anonymous counts).
 */
export const formatSplitParticipantsLabel = (
  selected: string[],
  allNames: string[],
  myIdentity?: string,
  everyoneLabel = 'Alle'
): string => {
  if (allNames.length > 0 && selected.length === allNames.length) {
    return everyoneLabel;
  }
  const sorted = sortTravelerNames(selected, myIdentity);
  if (sorted.length <= 4) {
    return sorted.join(', ');
  }
  return `${sorted.slice(0, 4).join(', ')} +${sorted.length - 4}`;
};

/**
 * Builds cent-accurate initial exact split strings from the active equal/weighted selection.
 */
export const buildInitialExactSplit = (
  totalAmount: number,
  currentMode: 'equal' | 'weights' | 'exact',
  splitAmong: string[],
  splitWeights: Record<string, number>
): Record<string, string> => {
  const result: Record<string, string> = {};
  const totalCents = Math.round(totalAmount * 100);
  if (totalCents <= 0) return result;

  if (currentMode === 'weights') {
    const activeEntries = Object.entries(splitWeights).filter(([, w]) => w > 0);
    const totalWeight = activeEntries.reduce((sum, [, w]) => sum + w, 0);
    if (totalWeight <= 0) return result;

    const baseShares = activeEntries.map(([person, w]) => ({
      person,
      cents: Math.floor((totalCents * w) / totalWeight)
    }));
    const allocated = baseShares.reduce((sum, item) => sum + item.cents, 0);
    const remainder = totalCents - allocated;
    baseShares.forEach((item, idx) => {
      const finalCents = item.cents + (idx < remainder ? 1 : 0);
      if (finalCents > 0) result[item.person] = (finalCents / 100).toFixed(2);
    });
    return result;
  }

  if (currentMode === 'equal' && splitAmong.length > 0) {
    const count = splitAmong.length;
    const baseCents = Math.floor(totalCents / count);
    const remainder = totalCents - baseCents * count;
    splitAmong.forEach((person, idx) => {
      const finalCents = baseCents + (idx < remainder ? 1 : 0);
      if (finalCents > 0) result[person] = (finalCents / 100).toFixed(2);
    });
  }

  return result;
};

export interface ExpenseMatrixResult {
  matrix: Record<string, Record<string, number>>;
  rowTotals: Record<string, number>;
  colTotals: Record<string, number>;
  grandTotal: number;
}

/**
 * Computes a payer x recipient matrix in base currency (excluding settlements).
 */
export const computeExpenseMatrix = (
  expenses: Expense[],
  names: string[],
  getRate: (currency: string) => number
): ExpenseMatrixResult => {
  const matrix: Record<string, Record<string, number>> = {};
  const rowTotals: Record<string, number> = {};
  const colTotals: Record<string, number> = {};
  let grandTotal = 0;

  names.forEach((payer) => {
    matrix[payer] = {};
    rowTotals[payer] = 0;
    colTotals[payer] = 0;
    names.forEach((recipient) => {
      matrix[payer][recipient] = 0;
    });
  });

  expenses.forEach((exp) => {
    if (exp.isSettlement) return;
    const rate = getRate(exp.currency || 'EUR');
    const payer = exp.paidBy;
    if (!matrix[payer]) {
      matrix[payer] = {};
      rowTotals[payer] = 0;
    }
    const shares = calculateExpenseSharesInBase(exp, rate);
    Object.entries(shares).forEach(([recipient, amtBase]) => {
      if (amtBase <= 0) return;
      matrix[payer][recipient] = (matrix[payer][recipient] || 0) + amtBase;
      rowTotals[payer] = (rowTotals[payer] || 0) + amtBase;
      colTotals[recipient] = (colTotals[recipient] || 0) + amtBase;
      grandTotal += amtBase;
    });
  });

  return { matrix, rowTotals, colTotals, grandTotal };
};
// --- END OF FILE 205 Zeilen ---
