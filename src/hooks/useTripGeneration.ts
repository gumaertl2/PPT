// 18.01.2026 16:30 - FIX: Added 'Smart Error Handler' with I18N to translate technical API errors into user-friendly messages.
// src/hooks/useTripGeneration.ts
// 12.01.2026 19:00 - UPDATE: Implemented result processing for 'basis' and 'anreicherer'.
// 16.01.2026 03:40 - FIX: Corrected TaskKey import source to resolve build errors (TS2345).
// 16.01.2026 04:30 - FINAL FIX: Consolidated TaskKey import from core/types for Vercel parity.
// 17.01.2026 18:45 - REFACTOR: Integrated TripOrchestrator for centralized logic handling.
// 18.01.2026 23:15 - FIX: Added 'Food' processor & robust Object/Array handling for all list-based agents.
// 18.01.2026 15:25 - FIX: Added functional 'Cancel' action to all loading notifications for blocking modal.
// 18.01.2026 15:35 - FIX: Implemented Chunking-Awareness in Workflow Manager.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../store/useTripStore';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
// NEU: Orchestrator statt direktem Service-Aufruf
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
  
  // Manual Mode Exports
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

  // 1. Netzwerk / Timeout / Abbruch
  if (msg.includes('failed to fetch') || msg.includes('network') || msg.includes('unterbrochen') || msg.includes('connection')) {
    return isDe
      ? 'Zeitüberschreitung oder Netzwerkfehler: Die KI hat nicht rechtzeitig geantwortet. Bitte prüfen Sie Ihre Verbindung und versuchen Sie es erneut ("Wiederholen").'
      : 'Timeout or Network Error: The AI did not respond in time. Please check your connection and try again ("Retry").';
  }
  
  // 2. Rate Limit / Quota (429)
  if (msg.includes('429') || msg.includes('quota') || msg.includes('rate limit')) {
    return isDe
      ? 'Zu viele Anfragen (429): Das Nutzungslimit ist erreicht. Bitte warten Sie einen Moment, bevor Sie es erneut versuchen.'
      : 'Too Many Requests (429): Quota exceeded. Please wait a moment before trying again.';
  }

  // 3. Server Fehler (500/503)
  if (msg.includes('500') || msg.includes('503') || msg.includes('overloaded')) {
    return isDe
      ? 'Server-Überlastung: Die Google AI Server sind momentan ausgelastet. Bitte versuchen Sie es in Kürze erneut.'
      : 'Server Overload: Google AI servers are currently busy. Please try again shortly.';
  }

  // 4. Safety / Content Policy
  if (msg.includes('safety') || msg.includes('blocked') || msg.includes('policy')) {
    return isDe
      ? 'Sicherheits-Filter: Die Anfrage wurde von der KI als unsicher eingestuft und blockiert. Bitte formulieren Sie die Anfrage ggf. um.'
      : 'Safety Filter: The request was flagged as unsafe by the AI and blocked. Please rephrase your request if necessary.';
  }

  // 5. JSON / Format Fehler
  if (msg.includes('json') || msg.includes('syntax')) {
     return isDe
      ? 'Verarbeitungsfehler: Die KI hat ungültige Daten gesendet. Ein erneuter Versuch löst das Problem meistens.'
      : 'Processing Error: The AI returned invalid data. Retrying usually fixes this.';
  }

  // Fallback: Original Fehler
  return isDe
    ? `Ein Fehler ist aufgetreten: ${msg}`
    : `An error occurred: ${msg}`;
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
    // NEU: Chunking-Steuerung für den Workflow-Manager
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
        const candidates = Array.isArray(data) 
            ? data 
            : (data?.kandidaten_liste || []);

        if (Array.isArray(candidates) && candidates.length > 0) {
            candidates.forEach((name: string) => {
                const id = uuidv4();
                updatePlace(id, { id, name, source: 'ai_basis', createdAt: new Date().toISOString() });
            });
            console.log(`[Basis] ${candidates.length} Orte gespeichert.`);
        } else {
            console.warn(`[Basis] Format-Warnung: Weder Array noch 'kandidaten_liste' gefunden.`, data);
        }
        break;
      }

      case 'anreicherer': {
        let enrichedItems: any[] = [];
        if (Array.isArray(data)) {
            enrichedItems = data;
        } else if (data?.ergebnisse && Array.isArray(data.ergebnisse)) {
            enrichedItems = data.ergebnisse;
        } else if (data?.ergebnis && Array.isArray(data.ergebnis)) {
            enrichedItems = data.ergebnis;
        }

        if (enrichedItems.length > 0) {
            enrichedItems.forEach((item: any) => { 
                if (item.id) updatePlace(item.id, item); 
            });
            console.log(`[Anreicherer] ${enrichedItems.length} Orte angereichert.`);
        } else {
             console.warn(`[Anreicherer] Format-Warnung: Keine 'ergebnisse' gefunden.`, data);
        }
        break;
      }

      case 'food': {
        let foodItems: any[] = [];
        if (Array.isArray(data)) {
            foodItems = data;
        } else if (data?.kandidaten && Array.isArray(data.kandidaten)) {
            foodItems = data.kandidaten;
        }

        if (foodItems.length > 0) {
            foodItems.forEach((item: any) => {
                const id = item.id || uuidv4(); 
                updatePlace(id, {
                    id,
                    name: item.name,
                    category: 'Restaurant', 
                    kategorie: 'Restaurant',
                    source: 'ai_food',
                    adresse: item.adresse,
                    geo_koordinaten: item.geo || item.geo_koordinaten, 
                    google_rating: item.rating || 0,
                    preis_tendenz: item.priceLevel,
                    kurzbeschreibung: `${item.cuisine || ''} (${item.guides?.join(', ') || ''})`,
                    createdAt: new Date().toISOString()
                });
            });
            console.log(`[Food] ${foodItems.length} Restaurants gespeichert.`);
        } else {
            console.warn(`[Food] Format-Warnung: Keine 'kandidaten' gefunden.`, data);
        }
        break;
      }

      case 'chefPlaner':
         if (data) setAnalysisResult('chefPlaner', data);
         break;
      case 'routeArchitect':
         if (data) setAnalysisResult('routeArchitect', data);
         break;
      
      default:
        console.log(`Processor: No specific handler for ${step}`, data);
    }
  }, [aiSettings.debug, logEvent, setAnalysisResult, updatePlace]);

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
            
            // CHUNKING WEICHE
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
        
        // FIX: Smart Error Message Generation
        const friendlyMsg = getFriendlyErrorMessage(err, lang);
        
        setError(friendlyMsg); // Show friendly message in UI state
        setStatus('error');

        addNotification({
          type: 'error',
          message: `${stepLabel}: ${friendlyMsg}`, // Friendly Message in Notification
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
    queue, 
    status, 
    currentStep, 
    aiSettings.debug, 
    logEvent, 
    processResult, 
    addNotification, 
    dismissNotification, 
    cancelWorkflow, 
    t, 
    lang, 
    setManualMode,
    chunkingState.currentChunk,
    chunkingState.isActive,
    chunkingState.totalChunks,
    setChunkingState,
    resetChunking
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
          
          // FIX: Smart Error Message Generation for Single Task
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
// --- END OF FILE 505 Zeilen ---