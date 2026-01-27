// 29.01.2026 00:15 - FIX: Added correct 'done' status check for 'sondertage' (checks project.analysis.ideenScout).
// 28.01.2026 17:00 - FIX: Corrected status checks for 'guide' and 'details' to match V40 data structure.
// src/features/Workflow/WorkflowSelectionModal.tsx

import React, { useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
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

type StepStatus = 'locked' | 'available' | 'done';

export const WorkflowSelectionModal: React.FC<WorkflowSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onStart 
}) => {
  const { project } = useTripStore();
  const [selectedSteps, setSelectedSteps] = useState<WorkflowStepId[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  // 1. SPRACHE ERMITTELN (Fallback auf 'de')
  const lang = project.meta.language === 'en' ? 'en' : 'de';

  // 2. STATUS-LOGIK (Zentralisiert)
  const getStepStatus = (stepId: WorkflowStepId): StepStatus => {
    // Basis-Check: Haben wir überhaupt Orte?
    const places = project.data.places || {};
    const validPlaces = Object.values(places).filter((p: any) => p.id !== 'dummy-example-id');
    const hasPlaces = validPlaces.length > 0;
    
    switch (stepId) {
      case 'chefPlaner':
        // Check if analysis exists
        return project.analysis.chefPlaner ? 'done' : 'available';

      case 'routeArchitect':
        return project.analysis.routeArchitect ? 'done' : 'available';

      case 'basis':
        return hasPlaces ? 'done' : 'available';
      
      case 'anreicherer':
          if (!hasPlaces) return 'locked';
          
          const isEnriched = validPlaces.some((p: any) => 
             (p.kurzbeschreibung && p.kurzbeschreibung.length > 20) || 
             (p.logistics_info && p.logistics_info.length > 10) ||
             // V40 Check (english keys)
             (p.description && p.description.length > 20)
          );
          return isEnriched ? 'done' : 'available';

      case 'guide':
        if (!hasPlaces) return 'locked'; 
        // FIX: V40 uses analysis.tourGuide, not data.routes
        return project.analysis.tourGuide ? 'done' : 'available';

      case 'details':
        if (!hasPlaces) return 'locked';
        // FIX: V40 stores details directly on the Place object (detailContent), not in data.content
        const hasDetails = validPlaces.some((p: any) => p.detailContent && p.detailContent.length > 50);
        return hasDetails ? 'done' : 'available';

      case 'dayplan':
        const hasGuide = project.analysis.tourGuide; // Also updated dependency check
        if (!hasPlaces || !hasGuide) return 'locked';
        return project.itinerary.days.length > 0 ? 'done' : 'available';

      case 'infos':
        const hasInfos = Object.values(project.data.content).some((c: any) => c.type === 'info' || c.type === 'Information');
        return hasInfos ? 'done' : 'available';

      case 'food':
        if (!hasPlaces) return 'locked';
        const hasRestaurants = validPlaces.some((p: any) => p.category === 'restaurant' || p.category === 'Restaurant');
        return hasRestaurants ? 'done' : 'available';

      case 'accommodation':
        if (!hasPlaces) return 'locked';
        const manualHotel = project.userInputs.logistics?.stationary?.hotel;
        // FIX: Using V40 English Key 'validated_hotels'
        const hasValidatedHotels = (project.analysis.chefPlaner?.validated_hotels?.length || 0) > 0;
        return (manualHotel || hasValidatedHotels) ? 'done' : 'available';
      
      case 'sondertage':
          if (!hasPlaces) return 'locked';
          // FIX: Check if 'ideenScout' data exists in analysis
          const hasIdeen = !!(project.analysis as any).ideenScout;
          return hasIdeen ? 'done' : 'available';

      case 'transfers':
        const hasDayPlan = project.itinerary.days.length > 0;
        return hasDayPlan ? 'available' : 'locked';
        
      default:
        return 'available';
    }
  };

  // 3. INITIALE SELEKTION BEIM ÖFFNEN
  useEffect(() => {
    if (isOpen) {
      const defaults: WorkflowStepId[] = [];
      WORKFLOW_STEPS.forEach(step => {
        const status = getStepStatus(step.id);
        
        // EXCEPTION: 'infos' step shall NOT be selected by default
        if (step.id === 'infos') return;
        
        // EXCEPTION: Don't select 'done' steps by default (Safety)
        if (status === 'done') return;

        // Wir wählen standardmäßig nur aus, was "sinnvoll" (available) ist.
        if (status === 'available') {
          defaults.push(step.id);
        }
      });
      setSelectedSteps(defaults);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, project]); 

  const toggleStep = (id: WorkflowStepId) => {
    setSelectedSteps(prev => 
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  // 4. START HANDLER MIT GENERALISIERTER SICHERHEITSABFRAGE
  const handleStartRequest = () => {
    if (selectedSteps.length === 0) return;

    // PRÜFUNG: Ist IRGENDEIN ausgewählter Schritt bereits "erledigt"?
    // Das bedeutet, der User will einen Re-Run für existierende Daten.
    const isRerunningDoneSteps = selectedSteps.some(stepId => getStepStatus(stepId) === 'done');

    if (isRerunningDoneSteps) {
      setShowConfirm(true); // Warnung zeigen
    } else {
      executeStart(); // Sicherer Start (alles neu oder leer)
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

          {/* BODY (Liste der Schritte) */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3">
            {WORKFLOW_STEPS.map((step) => {
              const status = getStepStatus(step.id);
              const isSelected = selectedSteps.includes(step.id);
              
              const isWarning = status === 'locked'; 
              const isDone = status === 'done';
              
              // Dynamisches Styling
              let containerClass = "relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ";
              
              if (isSelected) {
                if (isDone) {
                   // SPECIAL WARNING STYLE FOR SELECTED RE-RUN
                   containerClass += "border-amber-500 bg-amber-50 shadow-sm";
                } else {
                   // Normal Selected
                   containerClass += "border-blue-500 bg-blue-50/50 shadow-sm";
                }
              } else if (isWarning) {
                // Locked / Missing Deps
                containerClass += "border-slate-100 bg-slate-50 opacity-80 hover:border-amber-300";
              } else if (isDone) {
                // Done but NOT selected (Safe state)
                containerClass += "border-green-200 bg-green-50/30 hover:border-green-400";
              } else {
                // Available
                containerClass += "border-slate-200 hover:border-blue-300 hover:bg-slate-50";
              }

              return (
                <div 
                  key={step.id} 
                  className={containerClass}
                  onClick={() => toggleStep(step.id)}
                >
                  {/* ICON / CHECKBOX */}
                  <div className="flex-shrink-0 mt-1">
                    {isWarning && !isSelected ? (
                      <Unlock className="w-6 h-6 text-amber-400" />
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

                  {/* TEXT & LABELS */}
                  <div className="flex-grow">
                    <div className="flex justify-between items-start">
                      <h3 className={`font-bold ${isWarning && !isSelected ? 'text-slate-500' : 'text-slate-800'}`}>
                        {step.label[lang]}
                      </h3>
                      
                      {/* STATUS BADGES */}
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
                        {/* FIX: Hide Interaction Badge if step is already DONE */}
                        {step.requiresUserInteraction && !isDone && (
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

                    {/* HINWEIS BEI RE-RUN SELEKTION */}
                    {isSelected && isDone && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 font-medium">
                          <AlertCircle className="w-3 h-3" />
                          <span>
                            {lang === 'de' 
                              ? 'Achtung: Vorhandene Daten werden überschrieben.' 
                              : 'Warning: Existing data will be overwritten.'}
                          </span>
                        </div>
                    )}

                    {/* HINWEIS BEI LOCK */}
                    {isWarning && step.requires && !isSelected && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-500">
                        <AlertCircle className="w-3 h-3" />
                        <span>
                          {lang === 'de' 
                            ? `Info: Daten für "${step.requires.join(', ')}" fehlen evtl.` 
                            : `Note: Data for "${step.requires.join(', ')}" might be missing.`}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* FOOTER ACTIONS */}
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

      {/* SICHERHEITS-MODAL (Generalisiert) */}
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
// --- END OF FILE 275 Zeilen ---