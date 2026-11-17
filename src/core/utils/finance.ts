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
// --- END OF FILE 89 Zeilen ---
