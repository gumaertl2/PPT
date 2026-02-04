// 05.02.2026 17:15 - REFACTOR: UI VIEW COMPONENT.
// - Logic delegates to useWorkflowSelection hook.
// - Pure presentation layer.
// src/features/Workflow/WorkflowSelectionModal.tsx

import React, { useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useWorkflowSelection } from '../../hooks/useWorkflowSelection';
import { WORKFLOW_STEPS } from '../../core/Workflow/steps';
import type { WorkflowStepId } from '../../core/types';
import { ConfirmModal } from '../Cockpit/ConfirmModal';
import { 
  CheckCircle2, 
  X,
  AlertCircle,
  Unlock,
  Play,
  Settings2,
  RotateCcw 
} from 'lucide-react';

interface WorkflowSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (selectedSteps: WorkflowStepId[]) => void;
}

export const WorkflowSelectionModal: React.FC<WorkflowSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onStart 
}) => {
  const { project } = useTripStore();
  const [showConfirm, setShowConfirm] = useState(false);
  
  // LOGIC HOOK INJECTION
  const { selectedSteps, toggleStep, getStepStatus, isStationary } = useWorkflowSelection(isOpen);

  const lang = project.meta.language === 'en' ? 'en' : 'de';

  // HANDLERS (UI specific)
  const handleStartRequest = () => {
    if (selectedSteps.length === 0) return;
    const isRerunningDoneSteps = selectedSteps.some(stepId => getStepStatus(stepId) === 'done');

    if (isRerunningDoneSteps) {
      setShowConfirm(true); 
    } else {
      executeStart(); 
    }
  };

  const executeStart = () => {
    onStart(selectedSteps);
    onClose();
    setShowConfirm(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
          
          {/* HEADER */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white rounded-t-xl">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="text-2xl">✨</span> 
                {lang === 'de' ? 'KI-Workflow starten' : 'Start AI Workflow'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {lang === 'de' 
                  ? 'Wählen Sie die Aufgaben für die KI aus.' 
                  : 'Select tasks for the AI to perform.'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {WORKFLOW_STEPS.map((step) => {
              const status = getStepStatus(step.id);
              const isSelected = selectedSteps.includes(step.id);
              const isWarning = status === 'locked'; 
              const isDone = status === 'done';
              
              let containerClass = "relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all ";
              if (!isWarning) containerClass += "cursor-pointer ";
              else containerClass += "cursor-not-allowed opacity-60 "; 
              
              if (isSelected) {
                if (isDone) containerClass += "border-amber-500 bg-amber-50 shadow-sm";
                else containerClass += "border-blue-500 bg-blue-50/50 shadow-sm";
              } else if (isWarning) {
                containerClass += "border-slate-100 bg-slate-50";
              } else if (isDone) {
                containerClass += "border-green-200 bg-green-50/30 hover:border-green-400";
              } else {
                containerClass += "border-slate-200 hover:border-blue-300 hover:bg-slate-50";
              }

              return (
                <div 
                  key={step.id} 
                  className={containerClass}
                  onClick={() => toggleStep(step.id)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {isWarning && !isSelected ? (
                      <Unlock className="w-6 h-6 text-slate-300" /> 
                    ) : isDone && !isSelected ? (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    ) : (
                      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                        isSelected 
                          ? (isDone ? 'bg-amber-500 border-amber-500' : 'bg-blue-600 border-blue-600') 
                          : 'border-slate-300 bg-white'
                      }`}>
                        {isSelected && (
                          isDone ? <RotateCcw className="w-4 h-4 text-white" /> : <CheckCircle2 className="w-4 h-4 text-white" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <h3 className={`font-bold ${isWarning && !isSelected ? 'text-slate-400' : 'text-slate-800'}`}>
                        {step.label[lang]}
                      </h3>
                      <div className="flex gap-2">
                        {isDone && (
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            isSelected ? 'text-amber-700 bg-amber-100' : 'text-green-600 bg-green-100'
                          }`}>
                            {isSelected 
                              ? (lang === 'de' ? 'Neu Ausführen' : 'Re-Run') 
                              : (lang === 'de' ? 'Erledigt' : 'Done')}
                          </span>
                        )}
                        {step.requiresUserInteraction && !isDone && !isWarning && (
                          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Settings2 className="w-3 h-3" />
                            {lang === 'de' ? 'Interaktion' : 'Interactive'}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <p className={`text-sm mt-1 ${isWarning && !isSelected ? 'text-slate-400' : 'text-slate-600'}`}>
                      {step.description[lang]}
                    </p>

                    {isWarning && isStationary && (step.id === 'routeArchitect' || step.id === 'transferPlanner') && (
                       <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                        <AlertCircle className="w-3 h-3" />
                        <span>
                          {lang === 'de' 
                            ? 'Nicht verfügbar für stationäre Reisen.' 
                            : 'Not available for stationary trips.'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER */}
          <div className="p-6 border-t border-slate-100 bg-slate-50 rounded-b-xl flex justify-between items-center">
            <div className="text-xs text-slate-500">
              {selectedSteps.length} {lang === 'de' ? 'Aufgaben gewählt' : 'tasks selected'}
            </div>
            <div className="flex gap-3">
              <button 
                onClick={onClose}
                className="px-4 py-2 text-slate-600 font-semibold hover:bg-slate-200 rounded-lg transition-colors"
              >
                {lang === 'de' ? 'Abbrechen' : 'Cancel'}
              </button>
              <button 
                onClick={handleStartRequest}
                disabled={selectedSteps.length === 0}
                className={`px-6 py-2 font-bold rounded-lg shadow-lg flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                  selectedSteps.some(id => getStepStatus(id) === 'done')
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-200'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                {selectedSteps.some(id => getStepStatus(id) === 'done')
                  ? (lang === 'de' ? 'Aktualisieren' : 'Update')
                  : (lang === 'de' ? 'Workflow starten' : 'Start Workflow')}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={showConfirm}
        title={lang === 'de' ? 'Schritte erneut ausführen?' : 'Re-run steps?'} 
        message={lang === 'de' 
          ? 'Einige der gewählten Schritte wurden bereits ausgeführt. Wenn Sie fortfahren, werden die vorhandenen Daten dieser Schritte überschrieben. Möchten Sie das wirklich?' 
          : 'Some selected steps have already been executed. If you continue, existing data for these steps will be overwritten. Do you really want to proceed?'}
        confirmText={lang === 'de' ? 'Ja, überschreiben' : 'Yes, overwrite'} 
        cancelText={lang === 'de' ? 'Abbrechen' : 'Cancel'} 
        onConfirm={executeStart}
        onCancel={() => setShowConfirm(false)}
      />
    </>
  );
};
// --- END OF FILE 190 Zeilen ---