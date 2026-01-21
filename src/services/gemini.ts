// 21.01.2026 18:00 - FIX: Removed double 'models/' prefix causing 404 errors.
// src/services/gemini.ts
// 21.01.2026 17:30 - FIX: Aligned determineModel with "Flash+ = Thinking" logic.

import { CONFIG } from '../data/config';
import type { ModelType } from '../data/config'; 
import type { TaskKey } from '../core/types';   

import { SecurityService } from './security';
import { validateJson } from './validation';
import { useTripStore } from '../store/useTripStore'; 

// --- FEHLER-KLASSEN ---

export class ApiError extends Error {
  status: number;
  rawResponse: string | null;
  prompt: string | null;

  constructor(message: string, status: number, rawResponse: string | null = null, prompt: string | null = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.rawResponse = rawResponse;
    this.prompt = prompt;
  }
}

export class NoRetryError extends ApiError {
  constructor(message: string, status: number, rawResponse: string | null = null, prompt: string | null = null) {
    super(message, status, rawResponse, prompt);
    this.name = 'NoRetryError';
  }
}

export class QuotaExceededError extends NoRetryError {
  constructor(message: string, rawResponse: string | null = null, prompt: string | null = null) {
    super(message, 429, rawResponse, prompt);
    this.name = 'QuotaExceededError';
  }
}

export class ServerOverloadError extends ApiError {
  retryDelay: number;
  constructor(message: string, status: number, rawResponse: string | null = null, prompt: string | null = null) {
    super(message, status, rawResponse, prompt);
    this.name = 'ServerOverloadError';
    this.retryDelay = 120000; // 2 Minuten Default
  }
}

export class UserAbortError extends Error {
  constructor(message?: string) {
    super(message || 'Vorgang vom Nutzer abgebrochen.');
    this.name = 'UserAbortError';
  }
}

// --- RATE LIMITER (Internal) ---

const RateLimiter = {
  _getHistory(model: ModelType): number[] {
    const key = `${CONFIG.rateLimit.storageKey}-${model}`;
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : [];
    } catch (e) {
      return [];
    }
  },

  _saveHistory(model: ModelType, history: number[]) {
    const key = `${CONFIG.rateLimit.storageKey}-${model}`;
    localStorage.setItem(key, JSON.stringify(history));
  },

  checkRateLimit(model: ModelType) {
    const history = this._getHistory(model);
    const now = Date.now();
    const oneHourAgo = now - 3600000;

    const activeCalls = history.filter(timestamp => timestamp > oneHourAgo);
    const limit = CONFIG.rateLimit.maxCallsPerHour[model] || 100;
    
    if (activeCalls.length >= limit) {
      const oldestCall = activeCalls[0] || now;
      const waitTimeMinutes = Math.ceil((oldestCall + 3600000 - now) / 60000);
      throw new UserAbortError(`Limit für ${model.toUpperCase()} erreicht (${limit}/h). Wartezeit: ${waitTimeMinutes} Min.`);
    }
    
    this._saveHistory(model, activeCalls);
  },

  recordCall(model: ModelType) {
    const history = this._getHistory(model);
    history.push(Date.now());
    this._saveHistory(model, history);
  }
};

// --- SERVICE ---

export const GeminiService = {

  determineModel(taskKey: TaskKey | null): ModelType {
    // 1. Zugriff auf den Store (SSOT)
    const store = useTripStore.getState();
    const { strategy, modelOverrides } = store.aiSettings;

    // 2. Globale Strategien (Harte Überschreibung)
    if (strategy === 'pro') return 'pro';
    if (strategy === 'fast') return 'flash'; 

    // 3. Strategie "Optimal" (Matrix-Modus)
    if (taskKey) {
        // A. Gibt es einen User-Override für diesen speziellen Task?
        if (modelOverrides && modelOverrides[taskKey]) {
            return modelOverrides[taskKey]! as ModelType; 
        }

        // B. FIX: Default for Optimal is now FLASH (Thinking), not Config Default
        return 'flash';
    }

    // 4. Fallback of last resort
    return 'pro'; 
  },

  async call<T = any>(
    prompt: string, 
    taskKey: TaskKey | null = null,
    modelIdOverride?: string,
    onRetryDelay?: (delay: number, msg: string) => void,
    signal?: AbortSignal
  ): Promise<T> {
    
    // 0. FLUGSCHREIBER SETUP
    const store = useTripStore.getState();
    const isDebug = store.aiSettings.debug;
    const taskName = taskKey || 'unknown';
    const currentStrategy = store.aiSettings.strategy;
    const { modelOverrides } = store.aiSettings;

    const apiKey = SecurityService.loadApiKey();
    if (!apiKey) {
      throw new NoRetryError("Kein API-Key gefunden. Bitte Key in den Einstellungen speichern.", 401);
    }

    // --- MODEL SELECTION LOGIC (V2.5 + Thinking Fix) ---
    
    let selectedModelKey: ModelType = 'pro'; 
    let modelEndpoint = '';
    
    // Base Config
    let generationConfig: any = { 
      temperature: 0.4 
    };

    // LOGIK-KERN: Welches Modell gewinnt?
    const userHasSpecificOverride = taskKey && modelOverrides && modelOverrides[taskKey];

    // 2. Entscheiden basierend auf Strategie
    if (currentStrategy === 'fast') {
        // FIX: Removed 'models/' prefix as BaseURL already includes it
        modelEndpoint = 'gemini-2.5-flash:generateContent';
        selectedModelKey = 'flash';
    }
    else if (currentStrategy === 'pro') {
        // FIX: Removed 'models/' prefix
        modelEndpoint = 'gemini-2.5-pro:generateContent';
        selectedModelKey = 'pro';
    }
    else if (currentStrategy === 'optimal') {
        // FIX: "Thinking Mode" Logik
        
        if (userHasSpecificOverride) {
             // A. User will explizit PRO oder FLASH (ohne Thinking) via Matrix
             const forcedModel = modelOverrides[taskKey]!;
             if (forcedModel === 'pro') {
                 // FIX: Removed 'models/' prefix
                 modelEndpoint = 'gemini-2.5-pro:generateContent';
                 selectedModelKey = 'pro';
             } else {
                 // FIX: Removed 'models/' prefix
                 modelEndpoint = 'gemini-2.5-flash:generateContent';
                 selectedModelKey = 'flash';
             }
        } else {
             // B. Standard für "Optimal" = Flash + Thinking (Smart Flash)
             // FIX: Removed 'models/' prefix
             modelEndpoint = 'gemini-2.5-flash:generateContent';
             selectedModelKey = 'flash'; 
             
             // Activate Adaptive Thinking (Budget -1)
             generationConfig = {
                 thinkingConfig: {
                    includeThoughts: true,
                    thinkingBudget: -1 
                 }
                 // NO Temperature for Thinking Models!
             };
        }
    }
    else {
        // Fallback
        modelEndpoint = modelIdOverride || 'gemini-2.5-pro:generateContent';
    }

    // Safety Catch
    if (!modelEndpoint && modelIdOverride) modelEndpoint = modelIdOverride;

    RateLimiter.checkRateLimit(selectedModelKey);

    // 1. LOG REQUEST
    if (isDebug) {
      store.logEvent({
        task: taskName,
        type: 'request',
        model: `${selectedModelKey} (${currentStrategy}) [Thinking: ${!!generationConfig.thinkingConfig}]`, 
        content: prompt
      });
    }

    const apiUrl = `${CONFIG.api.baseUrl}${modelEndpoint}?key=${apiKey}`;

    let currentPrompt = prompt;
    let repairAttempts = 0;
    const MAX_REPAIR_ATTEMPTS = 2;
    const INTERNAL_RETRIES = 1;

    // Dev-Log
    if (import.meta.env.DEV) {
      console.log(`>>> API CALL [${currentStrategy}] -> ${modelEndpoint}`, { apiUrl, generationConfig });
    }

    for (let attempt = 0; attempt <= INTERNAL_RETRIES; attempt++) {
      try {
        if (signal?.aborted) throw new UserAbortError();

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            contents: [{ parts: [{ text: currentPrompt }] }],
            safetySettings: CONFIG.api.safetySettings,
            generationConfig: generationConfig 
          }),
          signal: signal
        });

        // HTTP Error Handling
        if (!response.ok) {
          const errorBody = await response.text();
          
          if (response.status === 404) {
             throw new NoRetryError(
               `Modell nicht gefunden (404). URL: ${modelEndpoint}. Bitte prüfen, ob der API-Key Zugriff auf Gemini 2.5 hat.`, 
               404, errorBody, currentPrompt
             );
          }

          if (response.status === 429) {
            if (errorBody.toLowerCase().includes("quota")) {
              throw new QuotaExceededError("Google API-Quota erschöpft.", errorBody, currentPrompt);
            } else {
              throw new ServerOverloadError("Rate Limit überschritten.", 429, errorBody, currentPrompt);
            }
          }
          
          if (response.status === 503) {
            throw new ServerOverloadError("Google Server überlastet (503).", 503, errorBody, currentPrompt);
          }
          
          if (response.status >= 500) {
            throw new ApiError(`Google Server Fehler (${response.status}).`, response.status, errorBody, currentPrompt);
          }

          throw new NoRetryError(`API-Fehler: ${response.status} - ${errorBody}`, response.status, errorBody, currentPrompt);
        }

        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
          const finish = data.candidates?.[0]?.finishReason;
          if (finish === 'SAFETY' || finish === 'BLOCK') {
            throw new NoRetryError(`Blockiert durch Sicherheitsfilter (${finish}).`, 400, JSON.stringify(data), currentPrompt);
          }
          throw new NoRetryError("Leere Antwort von der KI erhalten.", 500, JSON.stringify(data), currentPrompt);
        }

        const text = data.candidates[0].content.parts[0].text;

        const validation = validateJson<T>(text, [], (msg) => console.warn(msg));

        if (validation.valid && validation.data) {
          RateLimiter.recordCall(selectedModelKey);
          
          const tokens = data.usageMetadata?.totalTokenCount || 0;
          (store as any).addUsageStats(tokens, selectedModelKey);

          // 2. LOG RESPONSE
          if (isDebug) {
            store.logEvent({
              task: taskName,
              type: 'response',
              model: selectedModelKey,
              content: text,
              meta: {
                finishReason: data.candidates[0].finishReason,
                tokens: data.usageMetadata, 
                thinkingConfig: generationConfig.thinkingConfig,
                attempt: attempt + 1
              }
            });
          }

          return validation.data;
        } else {
          console.warn("Ungültiges JSON. Starte Reparatur...", text);
          
          // 3. LOG REPAIR ATTEMPT
          if (isDebug) {
             store.logEvent({
               task: taskName,
               type: 'info',
               model: selectedModelKey,
               content: `JSON Validation Failed. Starting Repair Attempt ${repairAttempts + 1}.`,
               meta: {
                 invalidJson: text,
                 error: validation.error
               }
             });
          }
          
          if (repairAttempts < MAX_REPAIR_ATTEMPTS) {
            repairAttempts++;
            currentPrompt = `SYSTEM ERROR: Invalid JSON received. You must fix this JSON:\n${text}\n\nError: ${validation.error}\n\nReturn ONLY valid JSON.`;
            throw new ApiError(`JSON Validierung fehlgeschlagen.`, 422, text, currentPrompt);
          } else {
            throw new NoRetryError(`JSON Reparatur gescheitert.`, 422, text, currentPrompt);
          }
        }

      } catch (error) {
        if (error instanceof UserAbortError) throw error;
        
        // 4. LOG ERROR
        if (isDebug) {
           store.logEvent({
             task: taskName,
             type: 'error',
             model: selectedModelKey,
             content: (error as Error).message,
             meta: {
               rawError: error,
               attempt: attempt + 1
             }
           });
        }

        if (error instanceof QuotaExceededError) throw error;
        if (error instanceof ServerOverloadError) throw error;
        if (error instanceof NoRetryError) throw error;

        if (attempt < INTERNAL_RETRIES) {
          const delay = 1000 * (attempt + 1);
          if (onRetryDelay) onRetryDelay(delay, "Verbindungsfehler, neuer Versuch...");
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    throw new Error("Unbekannter Fehler im API-Loop.");
  }
};
// --- END OF FILE 332 Zeilen ---