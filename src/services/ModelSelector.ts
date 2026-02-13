// 12.02.2026 18:30 - REFACTOR: Extracted resolveModelId from Orchestrator. 3-Model-Strategy.
// src/services/ModelSelector.ts

import { CONFIG } from '../data/config';
import { useTripStore } from '../store/useTripStore';
import type { TaskKey } from '../core/types';

export const ModelSelector = {
    resolve(task: TaskKey): string {
        // 1. Hardcoded Enforcements for Critical Wizard Steps (Always PRO)
        if (task === 'basis' || task === 'anreicherer') return CONFIG.api.models.pro;
        
        const aiSettings = useTripStore.getState().aiSettings;
        const taskOverride = aiSettings.modelOverrides?.[task];
        
        // 2. User Overrides (Specific Task) - Supports 3-Model-Strategy
        if (taskOverride === 'pro') return CONFIG.api.models.pro;
        if (taskOverride === 'flash') return CONFIG.api.models.flash;
        if (taskOverride === 'thinking') return CONFIG.api.models.thinking; 

        // 3. Global Strategy Strategy Overrides
        if (aiSettings.strategy === 'pro') return CONFIG.api.models.pro; 
        if (aiSettings.strategy === 'fast') return CONFIG.api.models.flash; 
        
        // 4. Config Defaults (Adaptive)
        const recommendedType = CONFIG.taskRouting.defaults[task] || 'flash';
        
        // Extended Type Cast to support 'thinking' safely
        return CONFIG.api.models[recommendedType as 'pro'|'flash'|'thinking'] || CONFIG.api.models.flash;
    }
};
// --- END OF FILE 31 Lines ---