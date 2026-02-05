// 05.02.2026 16:00 - FIX: Solved Race Condition in Workflow Loop (Timeout wrapper).
// 05.02.2026 21:15 - FIX: Softened Dependency Guard (Warn instead of Block) to keep Workflow running.
// 06.02.2026 17:10 - FIX: STALE CLOSURE BUG. Accessing live store state in timeout to ensure queue progression.
// src/hooks/useTripGeneration.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../store/useTripStore';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { TripOrchestrator } from '../services/orchestrator';
import { ResultProcessor } from '../services/ResultProcessor';
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
  const isExecutingRef = useRef<boolean>(false);

  const progress = initialQueueLength.current > 0 
    ? Math.round(((initialQueueLength.current - queue.length) / initialQueueLength.current) * 100)
    : 0;

  const cancelWorkflow = useCallback(() => {
    setStatus('idle');
    setQueue([]);
    setCurrentStep(null);
    setManualMode(null, null);
    resetChunking(); 
    isExecutingRef.current = false;
    if (aiSettings.debug) logEvent({ task: 'workflow_manager', type: 'system', content: 'Workflow CANCELLED' });
  }, [aiSettings.debug, logEvent, setManualMode, resetChunking]);

  // --- RESULT PROCESSING DELEGATION ---
  const processResult = useCallback((step: WorkflowStepId | TaskKey, data: any) => {
      // Delegate entire logic to Service
      ResultProcessor.process(step, data);
  }, []); 

  // --- WORKFLOW ENGINE ---
  useEffect(() => {
    let isMounted = true;

    const executeNextStep = async () => {
      // GUARD: Prevent parallel execution or re-entry if already running
      if (isExecutingRef.current) return;
      
      if (status !== 'generating' || queue.length === 0) {
        if (status === 'generating' && queue.length === 0) {
          setStatus('success');
          setCurrentStep(null);
          addNotification({ type: 'success', message: t('status.success'), autoClose: 1500 });
        }
        return;
      }

      const nextStepId = queue[0];

      // --- DEPENDENCY GUARD (PHASE LOCK) - SOFTENED ---
      // FIX: Warn but DO NOT STOP. Let the agents handle raw data or skip it.
      if (['chefredakteur', 'tourGuide'].includes(nextStepId)) {
        const currentPlaces = Object.values(useTripStore.getState().project.data.places || {});
        // Check for raw 'Sight' candidates that should have been enriched
        const hasRawCandidates = currentPlaces.some((p: any) => p.category === 'Sight' || p.category === 'Sightseeing');
        
        if (hasRawCandidates) {
            console.warn(`[DependencyGuard] Warning: Raw candidates detected before ${nextStepId}. Proceeding anyway.`);
            // Removed: setError / setStatus('error') / return
        }
      }
      // -------------------------------------

      // LOCK
      isExecutingRef.current = true;

      const stepDef = WORKFLOW_STEPS.find(s => s.id === nextStepId);
      if (stepDef?.requiresUserInteraction && currentStep !== nextStepId) {
          setStatus('waiting_for_user');
          setCurrentStep(nextStepId);
          isExecutingRef.current = false; // UNLOCK
          return; 
      }
      setCurrentStep(nextStepId);
      const stepLabel = stepDef?.label[lang] || nextStepId;
      
      // UX UPGRADE: Add Chunk Progress Info
      let progressSuffix = "";
      // NOTE: We use current store state for display, which is reactive
      const liveChunkState = useTripStore.getState().chunkingState;
      if (liveChunkState.isActive && liveChunkState.totalChunks > 1) {
          progressSuffix = ` (${liveChunkState.currentChunk}/${liveChunkState.totalChunks})`;
      }

      const loadingId = addNotification({ 
        type: 'loading', 
        message: t('status.workflow_start', { step: stepLabel }) + progressSuffix, 
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
            isExecutingRef.current = false; // UNLOCK
            return;
        }

        const result = await TripOrchestrator.executeTask(nextStepId as TaskKey);
        
        dismissNotification(loadingId);
        if (isMounted) {
            processResult(nextStepId, result);
            
            // FIX: Wrap state updates in setTimeout to allow 'finally' block to run.
            // BUGFIX: Access LIVE store state. The local 'chunkingState' variable is stale 
            // (captured at start of async function) and doesn't reflect Orchestrator updates.
            setTimeout(() => {
              if (!isMounted) return;
              
              const liveState = useTripStore.getState().chunkingState;

              if (liveState.isActive && liveState.currentChunk < liveState.totalChunks) {
                setChunkingState({ currentChunk: liveState.currentChunk + 1 });
                // We do NOT slice queue yet, we repeat step
              } else {
                setQueue(prev => prev.slice(1));
                resetChunking();
              }
            }, 0);
        }
      } catch (err) {
        dismissNotification(loadingId);
        if (!isMounted) { isExecutingRef.current = false; return; }
        
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
      } finally {
          isExecutingRef.current = false; // UNLOCK ALWAYS
      }
    };
    
    executeNextStep();
    
    return () => { isMounted = false; };
  }, [
    queue, status, chunkingState.currentChunk, // Needs to react to chunks
    aiSettings.debug, logEvent, processResult, addNotification, 
    dismissNotification, cancelWorkflow, t, lang, setManualMode, setChunkingState, resetChunking
  ]);

  const startWorkflow = useCallback((steps: WorkflowStepId[]) => {
    if (steps.length === 0) return;
    initialQueueLength.current = steps.length;
    setQueue(steps);
    setStatus('generating');
    setError(null);
    isExecutingRef.current = false; // Reset lock
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
      // SINGLE TASK MODE - ALSO GUARDED
      if (isExecutingRef.current) return;
      isExecutingRef.current = true;

      setStatus('generating');
      setError(null);

      const stepDef = WORKFLOW_STEPS.find(s => s.id === task);
      const stepLabel = stepDef?.label[lang] || task;

      // UX UPGRADE: Chunk Info for Single Tasks (if applicable)
      const currentChunkState = useTripStore.getState().chunkingState;
      let progressSuffix = "";
      if (currentChunkState.isActive && currentChunkState.totalChunks > 1) {
          progressSuffix = ` (${currentChunkState.currentChunk}/${currentChunkState.totalChunks})`;
      }

      const loadingId = addNotification({ 
        type: 'loading', 
        message: t('status.workflow_start', { step: stepLabel }) + progressSuffix, 
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
              isExecutingRef.current = false;
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
      } finally {
          isExecutingRef.current = false;
      }
  }, [processResult, setManualMode, addNotification, dismissNotification, lang, t, cancelWorkflow]);

  return { status, currentStep, queue, error, progress, manualPrompt, submitManualResult, startWorkflow, resumeWorkflow, cancelWorkflow, startSingleTask };
};
// --- END OF FILE 331 Zeilen ---