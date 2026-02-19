// 19.02.2026 14:45 - FEAT: Added 'showPlanningMode: true' to handleGoToPrios for direct planning access.
// 19.02.2026 12:00 - FIX: Repaired TypeScript Errors (TS2367, TS2322, TS6133) & restored missing warning block.
// 17.02.2026 22:05 - FIX: Added Error Boundary around executeStart & Robust UI handling.
// 17.02.2026 21:35 - FEAT: UI Integration of 'validateStepStart' for Priority Check.
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
  RotateCcw,
  Sparkles,      
  RefreshCw,     
  PlusCircle,
  ListTodo,
  AlertTriangle     
} from 'lucide-react';

interface WorkflowSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStart: (selectedSteps: WorkflowStepId[], options?: { mode: 'smart' | 'force' }) => void;
}

export const WorkflowSelectionModal: React.FC<WorkflowSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onStart 
}) => {
  const { project, setUIState } = useTripStore();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSmartConfirm, setShowSmartConfirm] = useState(false);
  const [showPrioConfirm, setShowPrioConfirm] = useState(false);
  const [startError, setStartError] = useState<string | null>(null); 
  
  const { selectedSteps, toggleStep, getStepStatus, isStationary, validateStepStart } = useWorkflowSelection(isOpen);
  const lang = project.meta.language === 'en' ? 'en' : 'de';

  const handleStartRequest = () => {
    if (selectedSteps.length === 0) return;
    setStartError(null);

    // 1. PRIORITY CHECK
    if (selectedSteps.includes('initialTagesplaner')) {
        const validation = validateStepStart('initialTagesplaner');
        // FIX: Geändert von 'missing_priorities' auf 'no_priorities' (TS2367)
        if (!validation.canStart && validation.reason === 'no_priorities') {
            setShowPrioConfirm(true);
            return;
        }
    }
    
    // 2. SMART MODE CHECK
    const isChefredakteurSelected = selectedSteps.includes('chefredakteur');
    const chefredakteurStatus = getStepStatus('chefredakteur');
    const places = project.data.places || {};
    const missingCount = Object.values(places).filter((p: any) => !p.detailContent || p.detailContent.length < 50).length;
    
    if (isChefredakteurSelected && chefredakteurStatus === 'done' && missingCount > 0 && missingCount < Object.keys(places).length) {
        setShowSmartConfirm(true);
        return;
    }

    const isRerunningDoneSteps = selectedSteps.some(stepId => getStepStatus(stepId) === 'done');
    if (isRerunningDoneSteps) {
      setShowConfirm(true); 
    } else {
      executeStart(); 
    }
  };

  const executeStart = async (options?: { mode: 'smart' | 'force' }) => {
    try {
        // FIX: Entfernt, da 'plan' kein gültiger viewMode ('list' | 'map') ist und TS2322 verursachte. 
        // Der Orchestrator setzt den Ladezustand ohnehin.
        
        await onStart(selectedSteps, options); 
        onClose();
        
        setShowConfirm(false);
        setShowSmartConfirm(false);
        setShowPrioConfirm(false);
    } catch (err: any) {
        console.error("Workflow Start Error:", err);
        setStartError(err.message || "Unbekannter Fehler beim Starten.");
    }
  };

  const handleGoToPrios = () => {
      onClose();
      // FIX: Trigger the global 'showPlanningMode' state so SightsView opens it immediately
      setUIState({ viewMode: 'list', showPlanningMode: true }); 
  };

  if (!isOpen) return null;

  const totalPlaces = Object.keys(project.data.places || {}).length;
  const missingPlaces = Object.values(project.data.places || {}).filter((p: any) => !p.detailContent || p.detailContent.length < 50).length;

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]">
          
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white rounded-t-xl">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <span className="text-2xl">✨</span> 
                {lang === 'de' ? 'KI-Workflow starten' : 'Start AI Workflow'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {lang === 'de' ? 'Wählen Sie die Aufgaben für die KI aus.' : 'Select tasks for the AI to perform.'}
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-3 relative">
            
            {/* ERROR DISPLAY */}
            {startError && (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4 flex items-start gap-2 border border-red-200">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block font-bold">Fehler beim Starten:</strong>
                        <span className="text-sm">{startError}</span>
                    </div>
                </div>
            )}

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
                <div key={step.id} className={containerClass} onClick={() => toggleStep(step.id)}>
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
                            {isSelected ? (lang === 'de' ? 'Neu Ausführen' : 'Re-Run') : (lang === 'de' ? 'Erledigt' : 'Done')}
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

                    {/* FIX: Dieser Block wurde wiederhergestellt, was TS6133 behebt (AlertCircle & isStationary) */}
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
        onConfirm={() => executeStart({ mode: 'force' })}
        onCancel={() => setShowConfirm(false)}
      />

      {/* PRIORITY WARNING DIALOG */}
      {showPrioConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 border-l-8 border-amber-500">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
                            <ListTodo size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">
                                {lang === 'de' ? 'Keine Prioritäten gesetzt' : 'No Priorities Set'}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {lang === 'de' ? 'Tagesplaner Empfehlung' : 'Day Planner Recommendation'}
                            </p>
                        </div>
                    </div>
                    
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        {lang === 'de' 
                           ? 'Du hast noch keine Prioritäten (Fix, Prio 1, Prio 2) vergeben. Der Tagesplaner funktioniert am besten, wenn er weiß, was dir wichtig ist.'
                           : 'You have not set any priorities yet. The Day Planner works best when it knows what is important to you.'
                        }
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={handleGoToPrios}
                            className="flex items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            <Settings2 size={18} />
                            {lang === 'de' ? 'Jetzt Prioritäten vergeben' : 'Assign Priorities Now'}
                        </button>
                        
                        <button 
                            onClick={() => executeStart()}
                            className="flex items-center justify-center gap-2 p-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                        >
                            <Play size={18} />
                            {lang === 'de' ? 'Ohne Prios planen (Zufall)' : 'Plan without Prios (Random)'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {showSmartConfirm && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                            <Sparkles size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg text-slate-900">
                                {lang === 'de' ? 'Smart-Update verfügbar' : 'Smart Update Available'}
                            </h3>
                            <p className="text-sm text-slate-500">
                                {lang === 'de' ? 'Für "Chefredakteur" Inhalte' : 'For "Editor-in-Chief" content'}
                            </p>
                        </div>
                    </div>
                    
                    <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                        {lang === 'de' 
                           ? `Es sind bereits Texte vorhanden. Möchtest du nur die ${missingPlaces} fehlenden Texte ergänzen oder alle ${totalPlaces} Texte neu generieren?`
                           : `Content already exists. Do you want to only fill the ${missingPlaces} missing texts or regenerate all ${totalPlaces} texts?`
                        }
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        <button 
                            onClick={() => executeStart({ mode: 'smart' })}
                            className="flex items-center justify-center gap-2 p-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                        >
                            <PlusCircle size={18} />
                            {lang === 'de' ? 'Nur fehlende ergänzen (Smart)' : 'Fill missing only (Smart)'}
                        </button>
                        
                        <button 
                            onClick={() => executeStart({ mode: 'force' })}
                            className="flex items-center justify-center gap-2 p-3 bg-white text-slate-600 border border-slate-200 rounded-xl font-medium hover:bg-slate-50 transition-colors"
                        >
                            <RefreshCw size={18} />
                            {lang === 'de' ? 'Alle neu generieren (Langsamer)' : 'Regenerate all (Slower)'}
                        </button>
                    </div>

                    <button onClick={() => setShowSmartConfirm(false)} className="w-full mt-4 text-xs text-slate-400 font-medium hover:text-slate-600">
                        {lang === 'de' ? 'Abbrechen' : 'Cancel'}
                    </button>
                </div>
            </div>
        </div>
      )}
    </>
  );
};
// --- END OF FILE 342 Zeilen ---