// 20.01.2026 19:20 - FIX: "Operation Clean Sweep" - Updated Result Processor to English V40 Keys.
// src/hooks/useTripGeneration.ts
// 18.01.2026 16:30 - FIX: Added 'Smart Error Handler' with I18N.
// 17.01.2026 18:45 - REFACTOR: Integrated TripOrchestrator.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../store/useTripStore';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { TripOrchestrator } from '../services/orchestrator';
import { WORKFLOW_STEPS } from '../core/Workflow/steps';
import type { WorkflowStepId, TaskKey } from '../core/types'; 

export type GenerationStatus = 
  | 'idle' 
  | 'generating' 
  | 'waiting_for_user' 
  | 'paused' 
  | 'success' 
  | 'error';

interface UseTripGenerationReturn {
  status: GenerationStatus;
  currentStep: WorkflowStepId | null;
  queue: WorkflowStepId[];
  error: string | null;
  progress: number;
  
  manualPrompt: string | null;
  submitManualResult: (jsonResult: any) => Promise<void>;

  startWorkflow: (steps: WorkflowStepId[]) => void;
  resumeWorkflow: () => void;
  cancelWorkflow: () => void;
  startSingleTask: (task: TaskKey, feedback?: string) => Promise<void>;
}

// --- SMART ERROR HANDLER HELPER ---
const getFriendlyErrorMessage = (error: any, lang: 'de' | 'en'): string => {
  const msg = (error?.message || '').toLowerCase();
  const isDe = lang === 'de';

  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('unterbrochen') || msg.includes('connection')) {
    return isDe
      ? 'Zeitüberschreitung oder Netzwerkfehler. Bitte Verbindung prüfen.'
      : 'Timeout or Network Error. Please check connection.';
  }
  
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
    return isDe
      ? 'Zu viele Anfragen (429). Bitte kurz warten.'
      : 'Too Many Requests (429). Please wait a moment.';
  }

  if (msg.includes('500') || msg.includes('503') || msg.includes('overloaded')) {
    return isDe
      ? 'Server-Überlastung. Bitte später versuchen.'
      : 'Server Overload. Please try again later.';
  }

  if (msg.includes('safety') || msg.includes('blocked') || msg.includes('policy')) {
    return isDe
      ? 'Sicherheits-Filter: Anfrage wurde blockiert.'
      : 'Safety Filter: Request blocked.';
  }

  if (msg.includes('json') || msg.includes('syntax')) {
     return isDe
      ? 'Format-Fehler: Ungültige Daten von KI.'
      : 'Format Error: Invalid AI data.';
  }

  return isDe ? `Fehler: ${msg}` : `Error: ${msg}`;
};

export const useTripGeneration = (): UseTripGenerationReturn => {
  const { t } = useTranslation();
  
  const { 
    aiSettings,
    logEvent,
    setAnalysisResult,
    updatePlace,
    addNotification,
    dismissNotification,
    project,
    manualPrompt,
    manualStepId,
    setManualMode,
    chunkingState,
    setChunkingState,
    resetChunking
  } = useTripStore();
  
  const lang = (project.meta.language === 'en' ? 'en' : 'de') as 'de' | 'en';
  
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [queue, setQueue] = useState<WorkflowStepId[]>([]);
  const [currentStep, setCurrentStep] = useState<WorkflowStepId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialQueueLength = useRef<number>(0);
  const progress = initialQueueLength.current > 0 
    ? Math.round(((initialQueueLength.current - queue.length) / initialQueueLength.current) * 100)
    : 0;

  const cancelWorkflow = useCallback(() => {
    setStatus('idle');
    setQueue([]);
    setCurrentStep(null);
    setManualMode(null, null);
    resetChunking(); 
    if (aiSettings.debug) logEvent({ task: 'workflow_manager', type: 'system', content: 'Workflow CANCELLED' });
  }, [aiSettings.debug, logEvent, setManualMode, resetChunking]);

  // --- RESULT PROCESSING (V40 ENGLISH MAPPING) ---
  const processResult = useCallback((step: WorkflowStepId | TaskKey, data: any) => {
    if (aiSettings.debug) {
      logEvent({
        task: step,
        type: 'info',
        content: `Processing Result for ${step}`,
        meta: { dataKeys: Object.keys(data || {}) }
      });
    }

    switch (step) {
      case 'basis': {
        // V40: 'candidates' array or direct array
        const candidates = Array.isArray(data) ? data : (data?.candidates || []);

        if (Array.isArray(candidates) && candidates.length > 0) {
            candidates.forEach((name: string) => {
                const id = uuidv4();
                updatePlace(id, { 
                  id, 
                  name, 
                  category: 'Sight', 
                  // Default properties for new drafts
                  userPriority: 0,
                  visited: false
                });
            });
            console.log(`[Basis] ${candidates.length} candidates stored.`);
        } else {
            console.warn(`[Basis] Warning: No 'candidates' found.`, data);
        }
        break;
      }

      case 'anreicherer': {
        // V40: Direct array or { candidates: [...] }
        let enrichedItems: any[] = [];
        if (Array.isArray(data)) {
            enrichedItems = data;
        } else if (data?.candidates && Array.isArray(data.candidates)) {
            enrichedItems = data.candidates;
        }

        if (enrichedItems.length > 0) {
            enrichedItems.forEach((item: any) => { 
                if (item.id) {
                   // Map V40 Item to Store Place
                   updatePlace(item.id, {
                     ...item, // Assumes item keys match V40 Place interface (name, category, address, etc.)
                     // Explicit mapping just in case
                     category: item.category || 'Sight',
                     address: item.address,
                     location: item.location,
                     description: item.description,
                     openingHours: item.openingHours
                   }); 
                }
            });
            console.log(`[Enricher] ${enrichedItems.length} places enriched.`);
        } else {
             console.warn(`[Enricher] Warning: No data found.`, data);
        }
        break;
      }

      case 'food': {
        // V40: { candidates: [...] }
        let foodItems: any[] = [];
        if (Array.isArray(data)) {
            foodItems = data;
        } else if (data?.candidates && Array.isArray(data.candidates)) {
            foodItems = data.candidates;
        }

        if (foodItems.length > 0) {
            foodItems.forEach((item: any) => {
                const id = item.id || uuidv4(); 
                updatePlace(id, {
                    id,
                    name: item.name,
                    category: 'Restaurant', // Override category
                    // V40 Mapping
                    address: item.address,
                    location: item.location, 
                    rating: item.rating || 0,
                    // Store extra fields in description or custom props if needed
                    description: `${item.cuisine || ''} - ${item.priceLevel || ''} (${item.guides?.join(', ') || ''})`,
                    // Keep original data for reference if needed
                    ...item 
                });
            });
            console.log(`[Food] ${foodItems.length} restaurants stored.`);
        } else {
            console.warn(`[Food] Warning: No 'candidates' found.`, data);
        }
        break;
      }

      case 'chefPlaner':
         // Data is already strictly typed ChefPlanerResult (English)
         if (data) setAnalysisResult('chefPlaner', data);
         break;

      case 'routeArchitect':
         // Data is already strictly typed RouteArchitectResult (English)
         if (data) setAnalysisResult('routeArchitect', data);
         break;
      
      default:
        console.log(`Processor: No specific handler for ${step}`, data);
    }
  }, [aiSettings.debug, logEvent, setAnalysisResult, updatePlace]);

  // --- WORKFLOW ENGINE ---
  useEffect(() => {
    let isMounted = true;
    const executeNextStep = async () => {
      if (status !== 'generating' || queue.length === 0) {
        if (status === 'generating' && queue.length === 0) {
          setStatus('success');
          setCurrentStep(null);
          addNotification({ type: 'success', message: t('status.success'), autoClose: 1500 });
        }
        return;
      }
      const nextStepId = queue[0];
      const stepDef = WORKFLOW_STEPS.find(s => s.id === nextStepId);
      if (stepDef?.requiresUserInteraction && currentStep !== nextStepId) {
         setStatus('waiting_for_user');
         setCurrentStep(nextStepId);
         return; 
      }
      setCurrentStep(nextStepId);
      const stepLabel = stepDef?.label[lang] || nextStepId;
      
      const loadingId = addNotification({ 
        type: 'loading', 
        message: t('status.workflow_start', { step: stepLabel }), 
        autoClose: false,
        actions: [
          {
            label: t('actions.cancel', 'Abbrechen'),
            onClick: cancelWorkflow,
            variant: 'outline'
          }
        ]
      });

      try {
        const apiKey = useTripStore.getState().apiKey;
        
        if (!apiKey) {
            const payload = PayloadBuilder.buildPrompt(nextStepId as TaskKey); 
            dismissNotification(loadingId);
            setManualMode(payload, nextStepId);
            setStatus('waiting_for_user');
            return;
        }

        const result = await TripOrchestrator.executeTask(nextStepId as TaskKey);
        
        dismissNotification(loadingId);
        if (isMounted) {
            processResult(nextStepId, result);
            
            if (chunkingState.isActive && chunkingState.currentChunk < chunkingState.totalChunks) {
              setChunkingState({ currentChunk: chunkingState.currentChunk + 1 });
            } else {
              setQueue(prev => prev.slice(1));
              resetChunking();
            }
        }
      } catch (err) {
        dismissNotification(loadingId);
        if (!isMounted) return; 
        
        const friendlyMsg = getFriendlyErrorMessage(err, lang);
        
        setError(friendlyMsg); 
        setStatus('error');

        addNotification({
          type: 'error',
          message: `${stepLabel}: ${friendlyMsg}`,
          autoClose: false,
          actions: [
            { 
              label: t('actions.retry', 'Wiederholen'), 
              onClick: () => { setStatus('generating'); }, 
              variant: 'default' 
            },
            { 
              label: t('actions.skip', 'Schritt überspringen'), 
              onClick: () => { setQueue(prev => prev.slice(1)); setStatus('generating'); }, 
              variant: 'outline' 
            }
          ]
        });
      }
    };
    executeNextStep();
    return () => { isMounted = false; };
  }, [
    queue, status, currentStep, aiSettings.debug, logEvent, processResult, addNotification, 
    dismissNotification, cancelWorkflow, t, lang, setManualMode, chunkingState, setChunkingState, resetChunking
  ]);

  const startWorkflow = useCallback((steps: WorkflowStepId[]) => {
    if (steps.length === 0) return;
    initialQueueLength.current = steps.length;
    setQueue(steps);
    setStatus('generating');
    setError(null);
  }, []);

  const resumeWorkflow = useCallback(() => {
    if (status === 'waiting_for_user') setStatus('generating');
  }, [status]);

  const submitManualResult = useCallback(async (jsonResult: any) => {
    if (!manualStepId) return;
    let parsedData = jsonResult;
    if (typeof jsonResult === 'string') {
        try { parsedData = JSON.parse(jsonResult); } catch (e) { setError("JSON Error"); return; }
    }
    try {
        processResult(manualStepId as TaskKey, parsedData);
        setManualMode(null, null);
        if (queue.length > 0) { setQueue(prev => prev.slice(1)); setStatus('generating'); } 
        else setStatus('success');
    } catch (e) { setStatus('error'); }
  }, [manualStepId, processResult, queue.length, setManualMode]);

  const startSingleTask = useCallback(async (task: TaskKey, feedback?: string) => {
      setStatus('generating');
      setError(null);

      const stepDef = WORKFLOW_STEPS.find(s => s.id === task);
      const stepLabel = stepDef?.label[lang] || task;

      const loadingId = addNotification({ 
        type: 'loading', 
        message: t('status.workflow_start', { step: stepLabel }), 
        autoClose: false,
        actions: [
          {
            label: t('actions.cancel', 'Abbrechen'),
            onClick: cancelWorkflow,
            variant: 'outline'
          }
        ]
      });

      try {
          const apiKey = useTripStore.getState().apiKey;
          if (!apiKey) { 
              const prompt = PayloadBuilder.buildPrompt(task, feedback);
              dismissNotification(loadingId);
              setManualMode(prompt, task); 
              setStatus('waiting_for_user'); 
              return; 
          }

          const result = await TripOrchestrator.executeTask(task, feedback);

          dismissNotification(loadingId);
          processResult(task, result);
          setStatus('success');
      } catch (err) { 
          dismissNotification(loadingId);
          setStatus('error'); 
          
          const friendlyMsg = getFriendlyErrorMessage(err, lang);

          addNotification({
            type: 'error',
            message: friendlyMsg,
            autoClose: 5000
          });
      }
  }, [processResult, setManualMode, addNotification, dismissNotification, lang, t, cancelWorkflow]);

  return { status, currentStep, queue, error, progress, manualPrompt, submitManualResult, startWorkflow, resumeWorkflow, cancelWorkflow, startSingleTask };
};
// --- END OF FILE 365 Zeilen ---