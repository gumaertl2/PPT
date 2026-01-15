// src/hooks/useTripGeneration.ts
// 12.01.2026 19:00 - UPDATE: Implemented result processing for 'basis' and 'anreicherer'.
// 16.01.2026 03:40 - FIX: Corrected TaskKey import source to resolve build errors (TS2345).
// 16.01.2026 04:30 - FINAL FIX: Consolidated TaskKey import from core/types for Vercel parity.

import { useState, useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { useTripStore } from '../store/useTripStore';
import { PayloadBuilder } from '../core/prompts/PayloadBuilder';
import { GeminiService } from '../services/gemini';
import { WORKFLOW_STEPS } from '../core/Workflow/steps';
// FIX: Using unified types from core/types to ensure 'dayplan' etc. are valid TaskKeys
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
    setManualMode
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
    if (aiSettings.debug) logEvent({ task: 'workflow_manager', type: 'system', content: 'Workflow CANCELLED' });
  }, [aiSettings.debug, logEvent, setManualMode]);

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
        if (Array.isArray(data)) {
            data.forEach((name: string) => {
                const id = uuidv4();
                updatePlace(id, { id, name, source: 'ai_basis', createdAt: new Date().toISOString() });
            });
        }
        break;
      case 'anreicherer':
        if (Array.isArray(data)) {
            data.forEach((item: any) => { if (item.id) updatePlace(item.id, item); });
        }
        break;
      case 'chefPlaner':
         if (data) setAnalysisResult('chefPlaner', data);
         break;
      case 'routeArchitect':
         if (data) setAnalysisResult('routeArchitect', data);
         break;
      default:
        console.warn(`No processor defined for step: ${step}`, data);
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
      addNotification({ type: 'loading', message: t('status.workflow_start', { step: stepLabel }), autoClose: 2000 });
      const sendingToastId = `sending-${Date.now()}`; 
      try {
        const payload = PayloadBuilder.buildPrompt(nextStepId as TaskKey); 
        const apiKey = useTripStore.getState().apiKey;
        if (!apiKey) {
            setManualMode(payload, nextStepId);
            setStatus('waiting_for_user');
            return;
        }
        const result = await GeminiService.call(payload, nextStepId as TaskKey);
        dismissNotification(sendingToastId);
        if (isMounted) {
            processResult(nextStepId, result);
            setQueue(prev => prev.slice(1));
        }
      } catch (err) {
        dismissNotification(sendingToastId);
        if (isMounted) { setError((err as Error).message); setStatus('error'); }
      }
    };
    executeNextStep();
    return () => { isMounted = false; };
  }, [queue, status, currentStep, aiSettings.debug, logEvent, processResult, addNotification, dismissNotification, cancelWorkflow, t, lang, setManualMode]);

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
      try {
          const prompt = PayloadBuilder.buildPrompt(task, feedback);
          const apiKey = useTripStore.getState().apiKey;
          if (!apiKey) { setManualMode(prompt, task); setStatus('waiting_for_user'); return; }
          const result = await GeminiService.call(prompt, task);
          processResult(task, result);
          setStatus('success');
      } catch (e) { setStatus('error'); }
  }, [processResult, setManualMode]);

  return { status, currentStep, queue, error, progress, manualPrompt, submitManualResult, startWorkflow, resumeWorkflow, cancelWorkflow, startSingleTask };
};
// --- END OF FILE 335 Zeilen ---