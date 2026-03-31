// 12.02.2026 18:25 - REFACTOR: Extracted getTaskLimit from Orchestrator.
// src/core/utils/LimitManager.ts

import { CONFIG } from '../../data/config';
import { useTripStore } from '../../store/useTripStore';
import type { TaskKey } from '../types';

export const LimitManager = {
    getTaskLimit(task: TaskKey, isManual: boolean): number {
        const aiSettings = useTripStore.getState().aiSettings;
        const mode = isManual ? 'manual' : 'auto';
        
        // 1. Check for specific User Override
        const taskOverride = aiSettings.chunkOverrides?.[task]?.[mode];
        if (taskOverride) return taskOverride;
        
        // 2. Check for Global Config Default
        const configDefault = CONFIG.taskRouting.chunkDefaults?.[task]?.[mode];
        if (configDefault) return configDefault;
        
        // 3. Check for Global User Limit
        const globalLimit = aiSettings.chunkLimits?.[mode];
        if (globalLimit) return globalLimit;
        
        // 4. Ultimate Fallback
        return 10;
    }
};
// --- END OF FILE 28 Lines ---