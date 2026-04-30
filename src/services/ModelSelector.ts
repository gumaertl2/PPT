// 17.02.2026 10:20 - FIX: Priority Shift. User Overrides (Matrix) now trump Hardcoded Enforcements.
// src/services/ModelSelector.ts

import { CONFIG } from '../data/config';
import { useTripStore } from '../store/useTripStore';
import type { TaskKey } from '../core/types';

export const ModelSelector = {
    resolve(task: TaskKey): string {
        const aiSettings = useTripStore.getState().aiSettings;
        const taskOverride = aiSettings.modelOverrides?.[task];
        
        // 1. User Overrides (Specific Task) - Supports 3-Model-Strategy (HIGHEST PRIORITY)
        // This allows the user to force 'thinking' or 'flash' even for critical tasks like 'basis'.
        if (taskOverride === 'pro') return CONFIG.api.models.pro;
        if (taskOverride === 'flash') return CONFIG.api.models.flash;
        if (taskOverride === 'thinking') return CONFIG.api.models.thinking; 

        // 2. Global Strategy Strategy Overrides
        if (aiSettings.strategy === 'pro') return CONFIG.api.models.pro; 
        if (aiSettings.strategy === 'fast') return CONFIG.api.models.flash; 
        
        // 3. Config Defaults (Adaptive)
        // Fallback to what is defined in config.ts (e.g. 'thinking' for basis/anreicherer)
        const recommendedType = CONFIG.taskRouting.defaults[task] || 'flash';
        
        // Extended Type Cast to support 'thinking' safely
        return CONFIG.api.models[recommendedType as 'pro'|'flash'|'thinking'] || CONFIG.api.models.flash;
    }
};
// --- END OF FILE 31 Lines ---