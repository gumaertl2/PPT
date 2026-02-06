// 06.02.2026 18:45 - FIX: Pass printConfig to PrintReport and wrap in 'print-only' container.
// 06.02.2026 18:25 - FIX: Corrected PrintReport import to Named Import (TS2613).
// 23.01.2026 15:55 - FIX: Integrated PrintReport for multi-page WYSIWYG printing.
// src/features/Cockpit/CockpitWizard.tsx

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../store/useTripStore'; 
import { useTripGeneration } from '../../hooks/useTripGeneration';
import type { WorkflowStepId, CockpitViewMode } from '../../core/types'; 

// Components
import { AnalysisReviewView } from './AnalysisReviewView';
import { RouteReviewView } from './RouteReviewView';
import { SightsView } from './SightsView';
import { InfoView } from '../info/InfoView'; 
import { ConfirmModal } from './ConfirmModal';
import { InfoModal } from '../Welcome/InfoModal';
import { ManualPromptModal } from './ManualPromptModal'; 
import { WorkflowSelectionModal } from '../Workflow/WorkflowSelectionModal';
import { PrintReport } from './PrintReport'; 

// Layout Components
import { CockpitHeader } from './Layout/CockpitHeader'; 
import { CockpitFooter } from './Layout/CockpitFooter';

// Icons
import { 
  Map as MapIcon, 
  Users, 
  Search, 
  Edit3, 
  FileText, 
  CheckCircle 
} from 'lucide-react';

// Steps
import { LogisticsStep } from './steps/LogisticsStep';
import { TravelerStep } from './steps/TravelerStep';
import { InterestsStep } from './steps/InterestsStep';
import { DatesStep } from './steps/DatesStep';
import { MiscStep } from './steps/MiscStep';
import { ReviewStep } from './steps/ReviewStep';

// Data
import { HELP_TEXTS } from '../../data/staticData';
import type { LanguageCode } from '../../core/types';

export const CockpitWizard = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  // Store & Hooks
  const { 
      project, 
      setView, 
      isWorkflowModalOpen, 
      setWorkflowModalOpen,
      uiState // FIX: Added uiState to access printConfig
  } = useTripStore(); 
  
  const { userInputs } = project;
  
  const { 
    startWorkflow,
    startSingleTask, 
    status, 
    error, 
    cancelWorkflow,
    manualPrompt,       
    submitManualResult  
  } = useTripGeneration();

  // Local State
  const [viewMode, setViewMode] = useState<CockpitViewMode>('wizard');
  const [currentStep, setCurrentStep] = useState(0);
  
  // Modals
  const [showHelp, setShowHelp] = useState(false);
  const [helpContent, setHelpContent] = useState({ title: '', body: '' });
  const [showRerunModal, setShowRerunModal] = useState(false);

  const STEPS = [
    { id: 'logistics', label: t('wizard.steps.logistics'), icon: MapIcon, component: LogisticsStep },
    { id: 'travelers', label: t('wizard.steps.travelers'), icon: Users, component: TravelerStep },
    { id: 'interests', label: t('wizard.steps.interests'), icon: Search, component: InterestsStep },
    { id: 'dates', label: t('wizard.steps.dates'), icon: Edit3, component: DatesStep },
    { id: 'misc', label: t('wizard.steps.misc'), icon: FileText, component: MiscStep },
    { id: 'review', label: t('wizard.steps.review'), icon: CheckCircle, component: ReviewStep }
  ];

  const hasAnalysisResult = !!project.analysis.chefPlaner;
  
  // --- NAVIGATION ---

  const jumpToStep = (index: number) => {
    if (status === 'generating') return;
    setCurrentStep(index);
    setViewMode('wizard');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // --- ANALYSIS & WORKFLOW ---

  const executeAnalysis = async () => {
    await startSingleTask('chefPlaner');
    setViewMode('analysis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleAnalyze = () => {
    if (hasAnalysisResult) {
      setShowRerunModal(true);
    } else {
      executeAnalysis();
    }
  };

  const handleRerunConfirm = () => {
    setShowRerunModal(false);
    executeAnalysis();
  };

  const handleRerunCancel = () => {
    setShowRerunModal(false);
    setViewMode('analysis');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleContinueFromAnalysis = async () => {
    try {
      const mode = project.userInputs.logistics.mode;
      if (mode === 'mobil' || mode === 'roundtrip') {
          if (!project.analysis.routeArchitect) {
              await startSingleTask('routeArchitect');
          }
          setViewMode('routeArchitect');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
          setWorkflowModalOpen(true);
      }
    } catch (e) {
      console.error("Workflow sequence failed:", e);
    }
  };

  const handleContinueFromRoute = async () => {
      setWorkflowModalOpen(true);
  };

  const handleStartSelectedWorkflows = async (selectedSteps: WorkflowStepId[]) => {
      setWorkflowModalOpen(false); 
      if (selectedSteps.length > 0) {
          await startWorkflow(selectedSteps);
          setViewMode('sights');
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };
  
  // --- HEADER ACTIONS ---

  const handleHeaderReset = () => {
    setView('wizard');
    setViewMode('wizard');
    setCurrentStep(0);
  };

  const handleHeaderLoad = (hasAnalysis: boolean) => {
    if (hasAnalysis) {
      setViewMode('analysis');
    } else {
      setViewMode('wizard');
      setCurrentStep(STEPS.length - 1); 
    }
  };

  const openHelp = () => {
    const stepKeys = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];
    const key = stepKeys[currentStep] || 'step1';
    const data = HELP_TEXTS[key] || HELP_TEXTS['step1'];
    
    setHelpContent({ 
      title: data.title[currentLang] || data.title.de || '', 
      body: data.body[currentLang] || data.body.de || '' 
    });
    
    setShowHelp(true);
  };

  const isStepDone = (index: number) => {
    const { logistics, travelers, selectedInterests, dates, notes, customPreferences } = userInputs;
    switch (index) {
      case 0: 
        return logistics.mode === 'stationaer' 
          ? (!!logistics.stationary.region || !!logistics.stationary.destination) 
          : !!logistics.roundtrip.region;
      case 1: return travelers.adults > 0 && travelers.origin.trim().length > 0;
      case 2: return selectedInterests.length > 0;
      case 3: return dates.fixedEvents.some(e => e.title && e.title.trim() !== '');
      case 4: return !!notes || !!customPreferences['noGos'];
      case 5: return hasAnalysisResult;
      default: return false;
    }
  };

  const CurrentComponent = STEPS[currentStep].component;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans text-slate-900">
      
      <CockpitHeader 
        viewMode={viewMode}
        setViewMode={(mode) => setViewMode(mode)}
        onReset={handleHeaderReset}
        onLoad={handleHeaderLoad}
        onOpenHelp={openHelp}
      />

      {viewMode === 'wizard' && (
        <div className="bg-white border-b border-slate-200 shadow-sm sticky top-16 z-20">
          <div className="max-w-4xl mx-auto px-4 overflow-x-auto no-scrollbar py-3">
            <div className="flex items-center justify-between min-w-[500px]">
              {STEPS.map((step, index) => {
                const isActive = currentStep === index;
                const hasData = isStepDone(index);
                let bubbleClass = isActive 
                  ? "bg-blue-600 border-blue-600 text-white shadow-md scale-110 ring-2 ring-blue-100" 
                  : hasData 
                    ? "bg-blue-100 border-blue-300 text-blue-700 font-bold hover:bg-blue-200"
                    : "bg-white border-slate-200 text-slate-300 hover:border-slate-300";
                
                return (
                  <div key={step.id} className="flex flex-col items-center relative group min-w-[70px]">
                      {index < STEPS.length - 1 && (
                        <div className={`absolute top-3.5 left-1/2 w-full h-0.5 -z-10 transition-colors duration-300 ${
                          (hasData || isActive) ? 'bg-blue-500' : 'bg-slate-100'
                        }`} />
                      )}
                      <button 
                        onClick={() => jumpToStep(index)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all duration-200 z-10 border-2 ${bubbleClass}`}
                      >
                        {index + 1}
                      </button>
                      <span className={`text-[10px] mt-1.5 whitespace-nowrap px-2 py-0.5 rounded transition-colors ${isActive ? "text-blue-700 font-bold bg-blue-50" : "text-slate-400"}`}>
                        {step.label}
                      </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8 relative">
        {viewMode === 'analysis' ? (
          <AnalysisReviewView onNext={handleContinueFromAnalysis} />
        ) : viewMode === 'routeArchitect' ? (
          <RouteReviewView onNext={handleContinueFromRoute} />
        ) : viewMode === 'sights' ? (
          <SightsView /> 
        ) : viewMode === 'info' ? (
          <InfoView /> 
        ) : (
          <CurrentComponent onEdit={jumpToStep} />
        )}
      </main>

      {viewMode === 'wizard' && (
        <CockpitFooter 
          status={status}
          error={error}
          onResetStatus={cancelWorkflow}
          currentStep={currentStep}
          totalSteps={STEPS.length}
          onBack={handleBack}
          onNext={handleNext}
          onAnalyze={handleAnalyze}
        />
      )}

      <InfoModal 
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        title={helpContent.title}
        content={helpContent.body}
      />

      <ConfirmModal 
        isOpen={showRerunModal}
        title={t('analysis.title')} 
        message={t('analysis.confirmRerun')} 
        confirmText={t('actions.yes') || "OK"} 
        cancelText={t('actions.cancel')} 
        onConfirm={handleRerunConfirm}
        onCancel={handleRerunCancel}
      />
      
      <ManualPromptModal
        isOpen={!!manualPrompt}
        promptText={manualPrompt || ''}
        onClose={cancelWorkflow}
        onSubmit={submitManualResult}
        error={error}
      />

      <WorkflowSelectionModal
        isOpen={isWorkflowModalOpen} 
        onClose={() => setWorkflowModalOpen(false)}
        onStart={handleStartSelectedWorkflows}
      />

      {/* FIX: Conditional Rendering for PrintReport with Config */}
      {uiState.printConfig && (
        <div className="print-only">
           <PrintReport config={uiState.printConfig} />
        </div>
      )}

    </div>
  );
};
// --- END OF FILE 362 Zeilen ---