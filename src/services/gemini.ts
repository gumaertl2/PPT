// 09.02.2026 17:00 - FEAT: Added Google Search Grounding support via 'tools'.
// 28.01.2026 18:30 - FIX: Applied 'Thinking Config' correctly when user overrides model to 'Flash+' (thinking).
// src/services/gemini.ts

import { CONFIG } from '../data/config';
import type { ModelType } from '../data/config'; 
import type { TaskKey } from '../core/types';   

import { SecurityService } from './security';
import { validateJson } from './validation';
import { useTripStore } from '../store/useTripStore'; 

// --- HELPER: JSON EXTRACTION (ARRAY AWARE) ---
function extractJsonBlock(text: string): string {
  // 1. Try to find an ARRAY first (most common for our lists)
  const arrayStart = text.indexOf('[');
  const arrayEnd = text.lastIndexOf(']');

  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
      // Check if this array looks like the main container
      const objectStart = text.indexOf('{');
      if (objectStart === -1 || arrayStart < objectStart) {
           const potentialJson = text.substring(arrayStart, arrayEnd + 1);
           try {
               JSON.parse(potentialJson);
               return potentialJson; 
           } catch (e) { }
      }
  }

  // 2. Fallback: Try to find an OBJECT (classic logic)
  let startIndex = text.indexOf('{');
  const lastIndex = text.lastIndexOf('}');

  if (startIndex === -1 || lastIndex === -1 || startIndex >= lastIndex) {
    return text;
  }

  let currentStart = startIndex;
  while (currentStart !== -1 && currentStart < lastIndex) {
    const potentialJson = text.substring(currentStart, lastIndex + 1);
    try {
      JSON.parse(potentialJson);
      return potentialJson; 
    } catch (e) {
      currentStart = text.indexOf('{', currentStart + 1);
    }
  }

  return text.substring(startIndex, lastIndex + 1);
}

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
    this.retryDelay = 120000; 
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
  // NEW: Request Deduplication Map to prevent double calls from Frontend
  _activeRequests: new Map<string, Promise<any>>(),

  determineModel(taskKey: TaskKey | null): ModelType {
    const store = useTripStore.getState();
    const { strategy, modelOverrides } = store.aiSettings;

    if (strategy === 'pro') return 'pro';
    if (strategy === 'fast') return 'flash'; 

    if (taskKey) {
        if (modelOverrides && modelOverrides[taskKey]) {
            return modelOverrides[taskKey]! as ModelType; 
        }
        const defaultModel = CONFIG.taskRouting.defaults[taskKey];
        if (defaultModel === 'pro') return 'pro';
        return 'flash'; 
    }
    return 'pro'; 
  },

  async call<T = any>(
    prompt: string, 
    taskKey: TaskKey | null = null,
    modelIdOverride?: string, 
    onRetryDelay?: (delay: number, msg: string) => void,
    signal?: AbortSignal,
    enableGoogleSearch: boolean = false // NEW: Flag for Search Grounding
  ): Promise<T> {
    
    const store = useTripStore.getState();
    const isDebug = store.aiSettings.debug;
    const taskName = taskKey || 'unknown';
    const currentStrategy = store.aiSettings.strategy;
    const { modelOverrides } = store.aiSettings;

    // --- DEDUPLICATION CHECK ---
    const requestKey = `${taskName}:${currentStrategy}:${prompt.length}:${prompt.substring(0, 50)}:${enableGoogleSearch}`; 
    
    if (GeminiService._activeRequests.has(requestKey)) {
        if (isDebug) console.log(`[GeminiService] Dedup: Reusing active request for ${taskName}`);
        return GeminiService._activeRequests.get(requestKey) as Promise<T>;
    }

    const apiKey = SecurityService.loadApiKey();
    if (!apiKey) {
      throw new NoRetryError("Kein API-Key gefunden. Bitte Key in den Einstellungen speichern.", 401);
    }

    let selectedModelKey: ModelType = 'pro'; 
    let modelEndpoint = '';
    let generationConfig: any = { 
        temperature: 0.4,
        responseMimeType: 'application/json' 
    };

    const userHasSpecificOverride = taskKey && modelOverrides && modelOverrides[taskKey];

    if (currentStrategy === 'fast') {
        modelEndpoint = 'gemini-2.5-flash:generateContent';
        selectedModelKey = 'flash';
    }
    else if (currentStrategy === 'pro') {
        modelEndpoint = 'gemini-2.5-pro:generateContent';
        selectedModelKey = 'pro';
    }
    else if (currentStrategy === 'optimal') {
        if (userHasSpecificOverride) {
             const forcedModel = modelOverrides[taskKey!]!; 
             if (forcedModel === 'pro') {
                 modelEndpoint = 'gemini-2.5-pro:generateContent';
                 selectedModelKey = 'pro';
             } else if (forcedModel === 'thinking') { 
                 modelEndpoint = 'gemini-2.5-flash:generateContent';
                 selectedModelKey = 'flash';
                 generationConfig = {
                      responseMimeType: 'application/json',
                      thinkingConfig: {
                         includeThoughts: true,
                         thinkingBudget: -1 
                      }
                 };
             } else {
                 modelEndpoint = 'gemini-2.5-flash:generateContent';
                 selectedModelKey = 'flash';
             }
        } else {
             const configDefault = taskKey ? CONFIG.taskRouting.defaults[taskKey] : undefined;
             if (configDefault === 'pro') {
                 modelEndpoint = 'gemini-2.5-pro:generateContent';
                 selectedModelKey = 'pro';
             } else {
                 modelEndpoint = 'gemini-2.5-flash:generateContent';
                 selectedModelKey = 'flash'; 
                 generationConfig = {
                      responseMimeType: 'application/json',
                      thinkingConfig: {
                         includeThoughts: true,
                         thinkingBudget: -1 
                      }
                 };
             }
        }
    }
    else {
        modelEndpoint = modelIdOverride || 'gemini-2.5-pro:generateContent';
    }

    if (!modelEndpoint && modelIdOverride) modelEndpoint = modelIdOverride;

    // FORCE SEARCH: If search is requested, ensure we use a model that supports it (Flash usually)
    // Actually Pro and Flash both support it, but Flash is faster.
    if (enableGoogleSearch && !userHasSpecificOverride) {
        // Just keep selected model, but we add tools below
    }

    RateLimiter.checkRateLimit(selectedModelKey);

    let finalPrompt = prompt;

    if (isDebug) {
      store.logEvent({
        task: taskName,
        type: 'request',
        model: `${selectedModelKey} (${currentStrategy}) [Search: ${enableGoogleSearch}]`, 
        content: finalPrompt
      });
    }

    const apiUrl = `${CONFIG.api.baseUrl}${modelEndpoint}?key=${apiKey}`;

    // --- EXECUTION FUNCTION ---
    const executeRequest = async (): Promise<T> => {
        let repairAttempts = 0;
        const MAX_REPAIR_ATTEMPTS = 2;
        const INTERNAL_RETRIES = 1;

        if (import.meta.env.DEV) {
          console.log(`>>> API CALL [${currentStrategy}] -> ${modelEndpoint}`, { apiUrl, enableGoogleSearch });
        }

        // NEW: Construct Tools Payload
        const toolsPayload = enableGoogleSearch ? [{ googleSearch: {} }] : undefined;

        for (let attempt = 0; attempt <= INTERNAL_RETRIES; attempt++) {
          try {
            if (signal?.aborted) throw new UserAbortError();

            const response = await fetch(apiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                contents: [{ parts: [{ text: finalPrompt }] }],
                safetySettings: CONFIG.api.safetySettings,
                generationConfig: generationConfig,
                tools: toolsPayload // Inject Tools if needed
              }),
              signal: signal
            });

            if (!response.ok) {
              const errorBody = await response.text();
              if (response.status === 404) throw new NoRetryError(`Modell nicht gefunden (404). URL: ${modelEndpoint}`, 404, errorBody, finalPrompt);
              if (response.status === 429) throw new ServerOverloadError("Rate Limit überschritten.", 429, errorBody, finalPrompt);
              if (response.status === 503) throw new ServerOverloadError("Google Server überlastet (503).", 503, errorBody, finalPrompt);
              if (response.status >= 500) throw new ApiError(`Google Server Fehler (${response.status}).`, response.status, errorBody, finalPrompt);
              throw new NoRetryError(`API-Fehler: ${response.status} - ${errorBody}`, response.status, errorBody, finalPrompt);
            }

            const data = await response.json();

            if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
              const finish = data.candidates?.[0]?.finishReason;
              if (finish === 'SAFETY' || finish === 'BLOCK') {
                throw new NoRetryError(`Blockiert durch Sicherheitsfilter (${finish}).`, 400, JSON.stringify(data), finalPrompt);
              }
              throw new NoRetryError("Leere Antwort von der KI erhalten.", 500, JSON.stringify(data), finalPrompt);
            }

            const parts = data.candidates[0].content.parts || [];
            const rawText = parts.map((p: any) => p.text).join('');
            
            const cleanText = extractJsonBlock(rawText);

            const validation = validateJson<T>(cleanText, [], (msg) => console.warn(msg));

            if (validation.valid && validation.data) {
              RateLimiter.recordCall(selectedModelKey);
              const tokens = data.usageMetadata?.totalTokenCount || 0;
              (store as any).addUsageStats(tokens, selectedModelKey);

              // CHECK GROUNDING METADATA (Optional Debug Info)
              const groundingMetadata = data.candidates[0].groundingMetadata;
              if (isDebug && groundingMetadata) {
                  console.log("[GeminiService] Grounding Metadata:", groundingMetadata);
              }

              if (isDebug) {
                store.logEvent({
                  task: taskName,
                  type: 'response',
                  model: selectedModelKey,
                  content: cleanText, 
                  meta: {
                    finishReason: data.candidates[0].finishReason,
                    tokens: data.usageMetadata, 
                    thinkingConfig: generationConfig.thinkingConfig,
                    rawResponseSnippet: rawText.substring(0, 100) + "...",
                    grounding: groundingMetadata
                  }
                });
              }

              return validation.data;
            } else {
              console.warn("Ungültiges JSON. Starte Reparatur...", cleanText);
              
              if (isDebug) {
                 store.logEvent({
                   task: taskName,
                   type: 'info',
                   model: selectedModelKey,
                   content: `JSON Validation Failed. Starting Repair Attempt ${repairAttempts + 1}.`,
                   meta: { invalidJson: cleanText, error: validation.error }
                 });
              }
              
              if (repairAttempts < MAX_REPAIR_ATTEMPTS) {
                repairAttempts++;
                finalPrompt = `SYSTEM ERROR: You returned TEXT instead of JSON. 
                Stop chatting. Stop explaining. 
                Output ONLY the raw JSON object for this data:\n${cleanText}\n\nError: ${validation.error}`;
                
                throw new ApiError(`JSON Validierung fehlgeschlagen.`, 422, cleanText, finalPrompt);
              } else {
                throw new NoRetryError(`JSON Reparatur gescheitert.`, 422, cleanText, finalPrompt);
              }
            }

          } catch (error) {
            if (error instanceof UserAbortError) throw error;
            
            if (isDebug) {
               store.logEvent({
                 task: taskName,
                 type: 'error',
                 model: selectedModelKey,
                 content: (error as Error).message,
                 meta: { rawError: error, attempt: attempt + 1 }
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
    };

    const promise = executeRequest();
    
    GeminiService._activeRequests.set(requestKey, promise);
    
    promise.finally(() => {
        GeminiService._activeRequests.delete(requestKey);
    });

    return promise;
  }
};
// --- END OF FILE 475 Zeilen ---