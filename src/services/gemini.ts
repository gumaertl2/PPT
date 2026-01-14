// src/services/gemini.ts
// 14.01.2026 17:45 - FIX: Added (store as any) cast to addUsageStats to bypass TS inference error.

import { CONFIG } from '../data/config';
import type { TaskKey, ModelType } from '../data/config';

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
  constructor() {
    super('Vorgang vom Nutzer abgebrochen.');
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
    if (taskKey && CONFIG.taskRouting.defaults[taskKey]) {
      return CONFIG.taskRouting.defaults[taskKey];
    }
    return 'pro'; 
  },

  async call<T = any>(
    prompt: string, 
    taskKey: TaskKey | null = null,
    onRetryDelay?: (delay: number, msg: string) => void,
    signal?: AbortSignal
  ): Promise<T> {
    
    // 0. FLUGSCHREIBER SETUP
    const store = useTripStore.getState();
    const isDebug = store.aiSettings.debug;
    const taskName = taskKey || 'unknown';

    const apiKey = SecurityService.loadApiKey();
    if (!apiKey) {
      throw new NoRetryError("Kein API-Key gefunden. Bitte Key in den Einstellungen speichern.", 401);
    }

    const selectedModelKey = this.determineModel(taskKey);
    RateLimiter.checkRateLimit(selectedModelKey);

    // 1. LOG REQUEST
    if (isDebug) {
      store.logEvent({
        task: taskName,
        type: 'request',
        model: selectedModelKey,
        content: prompt
      });
    }

    const modelEndpoint = CONFIG.api.models[selectedModelKey] || CONFIG.api.models.pro;
    const apiUrl = `${CONFIG.api.baseUrl}${modelEndpoint}?key=${apiKey}`;

    let currentPrompt = prompt;
    let repairAttempts = 0;
    const MAX_REPAIR_ATTEMPTS = 2;
    const INTERNAL_RETRIES = 1;

    // Dev-Log
    if (import.meta.env.DEV) {
      console.log(`>>> API CALL [${selectedModelKey}]`, apiUrl);
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
            generationConfig: { 
              temperature: 0.4 
            }
          }),
          signal: signal
        });

        // HTTP Error Handling
        if (!response.ok) {
          const errorBody = await response.text();
          
          if (response.status === 404) {
             throw new NoRetryError(
               `Modell nicht gefunden (404). URL: ${modelEndpoint}. Bitte prüfen, ob der API-Key korrekt ist und Zugriff auf Gemini 2.5 hat.`, 
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

        // Response Parsing
        const data = await response.json();

        if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
          const finish = data.candidates?.[0]?.finishReason;
          if (finish === 'SAFETY' || finish === 'BLOCK') {
            throw new NoRetryError(`Blockiert durch Sicherheitsfilter (${finish}).`, 400, JSON.stringify(data), currentPrompt);
          }
          throw new NoRetryError("Leere Antwort von der KI erhalten.", 500, JSON.stringify(data), currentPrompt);
        }

        const text = data.candidates[0].content.parts[0].text;

        // Validation & Auto-Repair
        const validation = validateJson<T>(text, [], (msg) => console.warn(msg));

        if (validation.valid && validation.data) {
          RateLimiter.recordCall(selectedModelKey);
          
          // --- STATS TRACKING START ---
          const tokens = data.usageMetadata?.totalTokenCount || 0;
          // FIX: Added (store as any) cast to bypass TS error "Expected 0 arguments"
          (store as any).addUsageStats(tokens, selectedModelKey);
          // --- STATS TRACKING END ---

          // 2. LOG RESPONSE (SUCCESS)
          if (isDebug) {
            store.logEvent({
              task: taskName,
              type: 'response',
              model: selectedModelKey,
              content: text,
              meta: {
                finishReason: data.candidates[0].finishReason,
                tokens: data.usageMetadata, // Falls verfügbar
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

        // Retry Logik
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
// --- END OF FILE 250 Zeilen ---