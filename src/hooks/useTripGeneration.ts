// src/hooks/useTripGeneration.ts
// 12.01.2026 19:00 - UPDATE: Implemented result processing for 'basis' and 'anreicherer'.
// 16.01.2026 03:40 - FIX: Corrected TaskKey import source to resolve build errors (TS2345).

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../store/useTripStore';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { GeminiService } from '../services/gemini';
import { WORKFLOW_STEPS } from '../core/Workflow/steps';
import type { WorkflowStepId, TaskKey } from '../core/types'; // FIX: Unified import from types.ts

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
    // --- NEU: Globaler Manual Mode State ---
    manualPrompt,
    manualStepId,
    setManualMode
  } = useTripStore();
  
  const lang = (project.meta.language === 'en' ? 'en' : 'de') as 'de' | 'en';
  
  // --- STATE ---
  const [status, setStatus] = useState<GenerationStatus>('idle');
  const [queue, setQueue] = useState<WorkflowStepId[]>([]);
  const [currentStep, setCurrentStep] = useState<WorkflowStepId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const initialQueueLength = useRef<number>(0);
  const progress = initialQueueLength.current > 0 
    ? Math.round(((initialQueueLength.current - queue.length) / initialQueueLength.current) * 100)
    : 0;

  // --- ACTIONS (Hoisted) ---

  const cancelWorkflow = useCallback(() => {
    setStatus('idle');
    setQueue([]);
    setCurrentStep(null);
    // Use Global Store Setter
    setManualMode(null, null);
    if (aiSettings.debug) logEvent({ task: 'workflow_manager', type: 'system', content: 'Workflow CANCELLED' });
  }, [aiSettings.debug, logEvent, setManualMode]);


  // --- RESULT PROCESSING ---
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
      case 'basis': 
        // BASIS: Namen-Liste -> IDs generieren -> Store
        if (Array.isArray(data)) {
            data.forEach((name: string) => {
                const id = uuidv4();
                // Minimales Place-Objekt anlegen
                updatePlace(id, { 
                    id, 
                    name, 
                    source: 'ai_basis',
                    createdAt: new Date().toISOString() 
                });
            });
            if (aiSettings.debug) logEvent({ task: step, type: 'info', content: `Stored ${data.length} candidates` });
        } else {
            console.warn('[Workflow] Basis result is not an array:', data);
        }
        break;

      case 'anreicherer':
        // ANREICHERER: Objekte mit ID -> Update Store
        if (Array.isArray(data)) {
            data.forEach((item: any) => {
                if (item.id) {
                    // Merge existing place with new details
                    updatePlace(item.id, item);
                }
            });
            if (aiSettings.debug) logEvent({ task: step, type: 'info', content: `Enriched ${data.length} places` });
        } else {
             console.warn('[Workflow] Anreicherer result is not an array:', data);
        }
        break;

      case 'guide':
        console.log('[Workflow] Result Guide:', data);
        break;
      case 'dayplan':
         console.log('[Workflow] Result Dayplan:', data);
         break;
      case 'chefPlaner':
         if (data) setAnalysisResult('chefPlaner', data);
         break;
      
      // FIX: Added Route Architect Processor to persist data in store
      case 'routeArchitect':
         if (data) setAnalysisResult('routeArchitect', data);
         break;

      default:
        console.warn(`No processor defined for step: ${step}`, data);
    }
  }, [aiSettings.debug, logEvent, setAnalysisResult, updatePlace]);


  // --- WORKFLOW ENGINE ---

  useEffect(() => {
    let isMounted = true;

    const executeNextStep = async () => {
      // Abbruchbedingungen
      if (status !== 'generating' || queue.length === 0) {
        if (status === 'generating' && queue.length === 0) {
          setStatus('success');
          setCurrentStep(null);
          if (aiSettings.debug) logEvent({ task: 'workflow_manager', type: 'system', content: 'Workflow COMPLETED' });
          
          addNotification({
            type: 'success',
            message: t('status.success'),
            autoClose: 1500 
          });
        }
        return;
      }

      const nextStepId = queue[0];
      const stepDef = WORKFLOW_STEPS.find(s => s.id === nextStepId);
      
      // Check: Human in the Loop?
      if (stepDef?.requiresUserInteraction && currentStep !== nextStepId) {
         setStatus('waiting_for_user');
         setCurrentStep(nextStepId);
         if (aiSettings.debug) logEvent({ task: nextStepId, type: 'system', content: 'Workflow PAUSED for User Interaction' });
         return; 
      }

      setCurrentStep(nextStepId);
      
      const stepLabel = stepDef?.label[lang] || nextStepId;
      
      // NOTIFICATION: Start Step (Auto Close)
      addNotification({
        type: 'loading',
        message: t('status.workflow_start', { step: stepLabel }),
        autoClose: 2000
      });
      
      const sendingToastId = `sending-${Date.now()}-${Math.random()}`; 

      try {
        if (aiSettings.debug) logEvent({ task: nextStepId, type: 'system', content: `Executing Step: ${nextStepId}` });

        const payload = PayloadBuilder.buildPrompt(nextStepId as any); 

        // CHECK API KEY for WORKFLOW (FIXED ACCESS)
        const apiKey = useTripStore.getState().apiKey;
        
        if (!apiKey) {
            // Global Store Setter
            setManualMode(payload, nextStepId);
            setStatus('waiting_for_user');
            
            addNotification({
                type: 'info',
                message: 'Kein API-Key. Manueller Modus gestartet.',
                autoClose: 3000
            });
            return; // Stop auto execution
        }
        
        // NOTIFICATION: Sending (Manual Close needed + Cancel Button)
        addNotification({
            id: sendingToastId,
            type: 'loading',
            // UPDATE: Pass dynamic step label
            message: t('status.sending', { step: stepLabel }),
            autoClose: false,
            actions: [
                {
                    label: t('actions.cancel'),
                    onClick: () => {
                        dismissNotification(sendingToastId);
                        cancelWorkflow();
                    },
                    variant: 'outline'
                }
            ]
        });

        const result = await GeminiService.call(payload, nextStepId as any);

        dismissNotification(sendingToastId);

        if (!isMounted) return;

        processResult(nextStepId, result);

        if (isMounted) {
            setQueue(prev => prev.slice(1));
        }

      } catch (err) {
        dismissNotification(sendingToastId);

        if (!isMounted) return; 

        console.error(`Error in step ${nextStepId}:`, err);
        const errorMessage = (err as Error).message || 'Unknown Error';
        setError(errorMessage);
        setStatus('error');
        
        if (aiSettings.debug) logEvent({ task: nextStepId, type: 'error', content: errorMessage });
        
        addNotification({
            type: 'error',
            message: t('status.error') + ': ' + errorMessage,
            autoClose: false,
            actions: [
              {
                label: t('status.action_retry'),
                onClick: () => {
                  setError(null);
                  setStatus('generating');
                },
                variant: 'default'
              },
              {
                label: t('status.action_skip'),
                onClick: () => {
                  setQueue(prev => prev.slice(1));
                  setError(null);
                  setStatus('generating');
                },
                variant: 'outline'
              }
            ]
        });
      }
    };

    executeNextStep();

    return () => { isMounted = false; };
  }, [queue, status, currentStep, aiSettings.debug, logEvent, processResult, addNotification, dismissNotification, cancelWorkflow, t, lang, setManualMode]);


  // --- PUBLIC ACTIONS ---

  const startWorkflow = useCallback((steps: WorkflowStepId[]) => {
    if (steps.length === 0) return;
    
    if (aiSettings.debug) {
        logEvent({ 
            task: 'workflow_manager', 
            type: 'system', 
            content: 'Workflow STARTED', 
            meta: { steps } 
        });
    }

    initialQueueLength.current = steps.length;
    setQueue(steps);
    setStatus('generating');
    setError(null);
  }, [aiSettings.debug, logEvent]);

  const resumeWorkflow = useCallback(() => {
    if (status === 'waiting_for_user') {
        if (aiSettings.debug) logEvent({ task: 'workflow_manager', type: 'system', content: 'Workflow RESUMED by User' });
        setStatus('generating');
    }
  }, [status, aiSettings.debug, logEvent]);

  // --- MANUAL RESULT SUBMISSION ---
  const submitManualResult = useCallback(async (jsonResult: any) => {
    // Read from Global Store
    if (!manualStepId) return;
    
    // Parse if string
    let parsedData = jsonResult;
    if (typeof jsonResult === 'string') {
        try {
            parsedData = JSON.parse(jsonResult);
        } catch (e) {
            setError("Ungültiges JSON Format.");
            return;
        }
    }

    try {
        setStatus('generating'); // Temporary state to process
        
        processResult(manualStepId as WorkflowStepId | TaskKey, parsedData);
        
        // Reset Manual State (Global)
        setManualMode(null, null);
        setError(null);
        
        // Continue Workflow or Finish Single Task
        if (queue.length > 0) {
            setQueue(prev => prev.slice(1)); // Next step
            setStatus('generating');
        } else {
            setStatus('success');
            addNotification({ type: 'success', message: 'Manuelle Daten übernommen.' });
        }
        
    } catch (e) {
        console.error("Manual processing failed", e);
        setError("Fehler beim Verarbeiten der manuellen Daten.");
        setStatus('error');
    }
  }, [manualStepId, processResult, queue.length, addNotification, setManualMode]);


  // --- LEGACY SUPPORT (Single Task) ---
  const startSingleTask = useCallback(async (task: TaskKey, feedback?: string) => {
      if (aiSettings.debug) logEvent({ task, type: 'system', content: 'Single Task Started' });
      setStatus('generating');
      setError(null);
      
      const startToastId = `start-${Date.now()}-${Math.random()}`;
      const sendingToastId = `sending-${Date.now()}-${Math.random()}`;

      // Determine label
      let taskLabel = task as string;
      if (task === 'chefPlaner') {
         taskLabel = 'Fundamentalanalyse'; // Fallback or use specific key
      } else {
         const foundStep = WORKFLOW_STEPS.find(s => s.id === task);
         if (foundStep) taskLabel = foundStep.label[lang];
      }

      // NOTIFICATION: Start Analysis
      if (task === 'chefPlaner') {
          addNotification({
            id: startToastId,
            type: 'loading',
            message: t('status.analysis_start'),
            autoClose: false 
          });
      } else {
          addNotification({
            id: startToastId,
            type: 'loading',
            message: t('status.workflow_start', { step: taskLabel }),
            autoClose: 3000
          });
      }
      
      try {
          const prompt = PayloadBuilder.buildPrompt(task, feedback);
          
          dismissNotification(startToastId);

          // CHECK API KEY for SINGLE TASK (FIXED ACCESS)
          const apiKey = useTripStore.getState().apiKey;
          
          if (!apiKey) {
              // Global Store Setter
              setManualMode(prompt, task);
              setStatus('waiting_for_user');
              
              addNotification({
                  type: 'info',
                  message: 'Kein API-Key. Manueller Modus.',
                  autoClose: 3000
              });
              return; 
          }

          addNotification({
             id: sendingToastId,
             type: 'loading',
             // UPDATE: Pass dynamic step label
             message: t('status.sending', { step: taskLabel }),
             autoClose: false,
             actions: [
                {
                    label: t('actions.cancel'),
                    onClick: () => {
                        dismissNotification(sendingToastId);
                        cancelWorkflow();
                    },
                    variant: 'outline'
                }
             ]
          });
      
          const result = await GeminiService.call(prompt, task);
          
          dismissNotification(sendingToastId);
          
          processResult(task, result);
          
          setStatus('success');
          if (aiSettings.debug) logEvent({ task, type: 'system', content: 'Single Task Completed' });
          
          addNotification({
             type: 'success',
             message: t('status.success'),
             autoClose: 1500 
          });
          
      } catch (e) {
          dismissNotification(startToastId);
          dismissNotification(sendingToastId);

          const errMsg = (e as Error).message;
          setError(errMsg);
          setStatus('error');
          if (aiSettings.debug) logEvent({ task, type: 'error', content: errMsg });
          
          addNotification({
             type: 'error',
             message: t('status.error'),
             autoClose: false,
             actions: [
               {
                 label: t('status.action_retry'),
                 onClick: () => {
                   startSingleTask(task, feedback);
                 },
                 variant: 'default'
               }
             ]
          });
      }
  }, [aiSettings.debug, logEvent, processResult, addNotification, dismissNotification, cancelWorkflow, t, lang, setManualMode]);

  return {
    status,
    currentStep,
    queue,
    error,
    progress,
    manualPrompt,
    submitManualResult,
    startWorkflow,
    resumeWorkflow,
    cancelWorkflow,
    startSingleTask
  };
};
// --- END OF FILE 335 Zeilen ---