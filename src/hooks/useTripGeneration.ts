// 20.02.2026 20:15 - FIX: Added Hard Kill-Switch (Abort Guard) to effectively cancel background tasks and dismiss loading modal immediately.
// 20.02.2026 14:15 - FIX: Switched to functional state updates for queue slicing.
// src/hooks/useTripGeneration.ts

import { useCallback, useEffect, useRef } from 'react';
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

  startWorkflow: (steps: WorkflowStepId[], options?: { mode: 'smart' | 'force' }) => void;
  resumeWorkflow: () => void;
  cancelWorkflow: () => void;
  startSingleTask: (task: TaskKey, feedback?: string, options?: { mode: 'smart' | 'force' }) => Promise<void>;
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

// --- GLOBAL LOCK ---
let globalIsExecutingLock = false;

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
    setChunkingState,
    resetChunking,
    workflow,
    setWorkflowState,
    resetWorkflow
  } = useTripStore();
  
  const lang = (project.meta.language === 'en' ? 'en' : 'de') as 'de' | 'en';
  const { status, queue, currentStep, error } = workflow;

  const initialQueueLength = useRef<number>(queue.length > 0 ? queue.length + (currentStep ? 1 : 0) : 0);
  const workflowOptionsRef = useRef<{ mode: 'smart' | 'force' } | undefined>(undefined);
  
  // NEW: Ref to track the active notification so we can kill it immediately
  const activeNotificationId = useRef<string | null>(null);

  useEffect(() => {
      if (status === 'generating' && initialQueueLength.current === 0 && queue.length > 0) {
          initialQueueLength.current = queue.length;
      }
  }, [status, queue.length]);

  const progress = initialQueueLength.current > 0 
    ? Math.round(((initialQueueLength.current - queue.length) / initialQueueLength.current) * 100)
    : 0;

  const cancelWorkflow = useCallback(() => {
    resetWorkflow(); 
    setManualMode(null, null);
    resetChunking(); 
    globalIsExecutingLock = false;
    workflowOptionsRef.current = undefined; 
    
    // KILL-SWITCH: Close the loading modal instantly
    if (activeNotificationId.current) {
        dismissNotification(activeNotificationId.current);
        activeNotificationId.current = null;
    }

    if (aiSettings.debug) logEvent({ task: 'workflow_manager', type: 'system', content: 'Workflow CANCELLED' });
  }, [aiSettings.debug, logEvent, setManualMode, resetChunking, resetWorkflow, dismissNotification]);

  const processResult = useCallback((step: WorkflowStepId | TaskKey, data: any) => {
      ResultProcessor.process(step, data);
  }, []); 

  // --- WORKFLOW ENGINE ---
  useEffect(() => {
    let isMounted = true;

    const executeNextStep = async () => {
      if (globalIsExecutingLock) return;
      
      const currentWorkflow = useTripStore.getState().workflow;
      const currentQueue = currentWorkflow.queue;
      const currentStatus = currentWorkflow.status;

      if (currentStatus !== 'generating' || currentQueue.length === 0) {
        if (currentStatus === 'generating' && currentQueue.length === 0) {
          setWorkflowState({ status: 'success', currentStep: null });
          addNotification({ type: 'success', message: t('status.success'), autoClose: 1500 });
        }
        return;
      }

      const nextStepId = currentQueue[0];

      if (['chefredakteur', 'tourGuide'].includes(nextStepId)) {
        const currentPlaces = Object.values(useTripStore.getState().project.data.places || {});
        const hasRawCandidates = currentPlaces.some((p: any) => p.category === 'Sight' || p.category === 'Sightseeing');
        if (hasRawCandidates) {
            console.warn(`[DependencyGuard] Warning: Raw candidates detected before ${nextStepId}. Proceeding anyway.`);
        }
      }

      globalIsExecutingLock = true;

      const stepDef = WORKFLOW_STEPS.find(s => s.id === nextStepId);
      if (stepDef?.requiresUserInteraction && currentStep !== nextStepId) {
          setWorkflowState({ status: 'waiting_for_user', currentStep: nextStepId });
          globalIsExecutingLock = false; 
          return; 
      }
      
      setWorkflowState({ currentStep: nextStepId });
      const stepLabel = stepDef?.label[lang] || nextStepId;
      
      let progressSuffix = "";
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
      activeNotificationId.current = loadingId;

      try {
        const apiKey = useTripStore.getState().apiKey;
        const isAutoMode = !!apiKey; 
        
        if (!apiKey) {
            const payload = PayloadBuilder.buildPrompt(nextStepId as TaskKey); 
            dismissNotification(loadingId);
            setManualMode(payload, nextStepId);
            setWorkflowState({ status: 'waiting_for_user' });
            globalIsExecutingLock = false; 
            return;
        }

        const result = await TripOrchestrator.executeTask(
            nextStepId as TaskKey, 
            undefined, 
            undefined, 
            workflowOptionsRef.current 
        );
        
        // --- ABORT GUARD ---
        // Check if the user clicked cancel while we were waiting for the AI
        if (useTripStore.getState().workflow.status !== 'generating') {
            console.log(`[Workflow] Task ${nextStepId} finished, but workflow was cancelled. Dropping result.`);
            return; // Abort processing silently!
        }

        dismissNotification(loadingId);
        if (activeNotificationId.current === loadingId) activeNotificationId.current = null;
        
        if (isMounted) {
            processResult(nextStepId, result);
            
            await new Promise(r => setTimeout(r, 1000));

            setTimeout(() => {
              if (!isMounted) return;
              
              if (isAutoMode) {
                  resetChunking(); 
                  const currentGlobalQueue = useTripStore.getState().workflow.queue;
                  setWorkflowState({ queue: currentGlobalQueue.slice(1) });
              } else {
                  const liveState = useTripStore.getState().chunkingState;
                  if (liveState.isActive && liveState.currentChunk < liveState.totalChunks) {
                    setChunkingState({ currentChunk: liveState.currentChunk + 1 });
                  } else {
                    const currentGlobalQueue = useTripStore.getState().workflow.queue;
                    setWorkflowState({ queue: currentGlobalQueue.slice(1) });
                    resetChunking();
                  }
              }
            }, 0);
        }
      } catch (err) {
        // --- ABORT GUARD FOR ERRORS ---
        if (useTripStore.getState().workflow.status !== 'generating') return;

        dismissNotification(loadingId);
        if (activeNotificationId.current === loadingId) activeNotificationId.current = null;
        
        if (!isMounted) { globalIsExecutingLock = false; return; }
        
        const friendlyMsg = getFriendlyErrorMessage(err, lang);
        setWorkflowState({ error: friendlyMsg, status: 'error' });

        addNotification({
          type: 'error',
          message: `${stepLabel}: ${friendlyMsg}`,
          autoClose: false,
          actions: [
            { 
              label: t('actions.retry', 'Wiederholen'), 
              onClick: () => { setWorkflowState({ status: 'generating' }); }, 
              variant: 'default' 
            },
            { 
              label: t('actions.skip', 'Schritt überspringen'), 
              onClick: () => { 
                  const currentGlobalQueue = useTripStore.getState().workflow.queue;
                  setWorkflowState({ queue: currentGlobalQueue.slice(1), status: 'generating' }); 
              }, 
              variant: 'outline' 
            }
          ]
        });
      } finally {
          globalIsExecutingLock = false; 
      }
    };
    
    executeNextStep();
    
    return () => { isMounted = false; };
  }, [
    status, 
    queue.length, 
    currentStep,
    aiSettings.debug, logEvent, processResult, addNotification, 
    dismissNotification, cancelWorkflow, t, lang, setManualMode, setChunkingState, resetChunking,
    setWorkflowState
  ]);

  const startWorkflow = useCallback((steps: WorkflowStepId[], options?: { mode: 'smart' | 'force' }) => {
    if (steps.length === 0) return;
    initialQueueLength.current = steps.length;
    workflowOptionsRef.current = options; 
    setWorkflowState({ 
        queue: steps, 
        status: 'generating', 
        error: null,
        currentStep: null 
    });
    globalIsExecutingLock = false; 
  }, [setWorkflowState]);

  const resumeWorkflow = useCallback(() => {
    if (status === 'waiting_for_user') setWorkflowState({ status: 'generating' });
  }, [status, setWorkflowState]);

  const submitManualResult = useCallback(async (jsonResult: any) => {
    if (!manualStepId) return;
    let parsedData = jsonResult;
    if (typeof jsonResult === 'string') {
        try { parsedData = JSON.parse(jsonResult); } catch (e) { setWorkflowState({ error: "JSON Error" }); return; }
    }
    try {
        processResult(manualStepId as TaskKey, parsedData);
        setManualMode(null, null);
        
        const freshQueue = useTripStore.getState().workflow.queue;
        if (freshQueue.length > 0) { 
             setWorkflowState({ queue: freshQueue.slice(1), status: 'generating' }); 
        } else {
             setWorkflowState({ status: 'success' });
        }
    } catch (e) { setWorkflowState({ status: 'error' }); }
  }, [manualStepId, processResult, setManualMode, setWorkflowState]);

  const startSingleTask = useCallback(async (task: TaskKey, feedback?: string, options?: { mode: 'smart' | 'force' }) => {
      if (globalIsExecutingLock) return;
      globalIsExecutingLock = true;

      setWorkflowState({ status: 'generating', error: null, currentStep: task as WorkflowStepId });

      const stepDef = WORKFLOW_STEPS.find(s => s.id === task);
      const stepLabel = stepDef?.label[lang] || task;

      let progressSuffix = "";
      const currentChunkState = useTripStore.getState().chunkingState;
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
      activeNotificationId.current = loadingId;

      try {
          const apiKey = useTripStore.getState().apiKey;
          if (!apiKey) { 
              const prompt = PayloadBuilder.buildPrompt(task, feedback);
              dismissNotification(loadingId);
              setManualMode(prompt, task); 
              setWorkflowState({ status: 'waiting_for_user' }); 
              globalIsExecutingLock = false;
              return; 
          }

          const result = await TripOrchestrator.executeTask(task, feedback, undefined, options);

          // --- ABORT GUARD ---
          if (useTripStore.getState().workflow.status !== 'generating') return;

          dismissNotification(loadingId);
          if (activeNotificationId.current === loadingId) activeNotificationId.current = null;
          
          processResult(task, result);
          setWorkflowState({ status: 'success', currentStep: null });
      } catch (err) { 
          // --- ABORT GUARD FOR ERRORS ---
          if (useTripStore.getState().workflow.status !== 'generating') return;

          dismissNotification(loadingId);
          if (activeNotificationId.current === loadingId) activeNotificationId.current = null;
          
          const friendlyMsg = getFriendlyErrorMessage(err, lang);
          setWorkflowState({ status: 'error', error: friendlyMsg });

          addNotification({
            type: 'error',
            message: friendlyMsg,
            autoClose: 5000
          });
      } finally {
          globalIsExecutingLock = false;
      }
  }, [processResult, setManualMode, addNotification, dismissNotification, lang, t, cancelWorkflow, setWorkflowState]);

  return { status, currentStep, queue, error, progress, manualPrompt, submitManualResult, startWorkflow, resumeWorkflow, cancelWorkflow, startSingleTask };
};
// --- END OF FILE 402 Zeilen ---