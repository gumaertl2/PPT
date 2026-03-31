// 12.02.2026 18:20 - REFACTOR: Extracted mergeResults from Orchestrator.
// src/core/utils/resultMerger.ts

import type { TaskKey } from '../types';

export const ResultMerger = {
    merge(results: any[], task: TaskKey): any {
        if (!results || results.length === 0) return null;
        if (results.length === 1) return results[0];
        
        // Special Handling for Day Plans (Merging Arrays of Days)
        if (['dayplan', 'initialTagesplaner'].includes(task)) {
            const merged = JSON.parse(JSON.stringify(results[0])); 
            for (let i = 1; i < results.length; i++) {
                 const chunk = results[i];
                 const newDays = chunk.days || chunk.itinerary?.days || [];
                 if (Array.isArray(newDays)) {
                     if (merged.days && Array.isArray(merged.days)) merged.days.push(...newDays);
                     else if (merged.itinerary?.days && Array.isArray(merged.itinerary.days)) merged.itinerary.days.push(...newDays);
                     else { if (!merged.days) merged.days = []; merged.days.push(...newDays); }
                 }
            }
            return merged;
        }

        let merged: any = {};
        // If results are flat arrays (e.g. lists of places), merge them
        if (Array.isArray(results[0])) return results.flat();
        
        // Generic Object Merge
        results.forEach(chunk => {
            Object.keys(chunk).forEach(key => {
                const value = chunk[key];
                if (Array.isArray(value)) {
                    merged[key] = [...(merged[key] || []), ...value];
                } else if (typeof value === 'object' && value !== null) {
                    merged[key] = { ...(merged[key] || {}), ...value };
                } else {
                    merged[key] = value;
                }
            });
        });
        return merged;
    }
};
// --- END OF FILE 45 Lines ---