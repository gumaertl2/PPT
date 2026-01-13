// src/App.tsx
// 10.01.2026 17:30
// UPDATE: Replaced react-hot-toast with native NotificationSystem

import { useEffect } from 'react';
import { useTripStore } from './store/useTripStore';
import { useTripGeneration } from './hooks/useTripGeneration';
import { WorkflowSelectionModal } from './features/Workflow/WorkflowSelectionModal';
import { WelcomeScreen } from './features/Welcome/WelcomeScreen';
import { CockpitWizard } from './features/Cockpit/CockpitWizard';
import { AnalysisReviewView } from './features/Cockpit/AnalysisReviewView';
import { NotificationSystem } from './features/Shared/NotificationSystem';
import { InfoModal } from './features/Welcome/InfoModal';
import { CatalogModal } from './features/Welcome/CatalogModal';
import { ManualPromptModal } from './features/Cockpit/ManualPromptModal';
import { ConfirmModal } from './features/Cockpit/ConfirmModal';
import { SettingsModal } from './features/Cockpit/SettingsModal';
import type { WorkflowStepId } from './core/types';

function App() {
  const { 
    view, 
    project, 
    setLanguage, 
    isWorkflowModalOpen, 
    setWorkflowModalOpen 
  } = useTripStore();
  
  const { startWorkflow } = useTripGeneration();

  useEffect(() => {
    // Initiale Sprache setzen basierend auf Browser oder Projekt
    const browserLang = navigator.language.startsWith('de') ? 'de' : 'en';
    if (project.meta.language !== browserLang) {
      setLanguage(browserLang);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartWorkflow = (selectedSteps: WorkflowStepId[]) => {
    // 1. Modal schließen
    setWorkflowModalOpen(false);
    // 2. Engine starten
    startWorkflow(selectedSteps);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* GLOBAL NOTIFICATIONS (Native) */}
      <NotificationSystem />
      
      {/* GLOBAL MODALS */}
      <WorkflowSelectionModal 
        isOpen={isWorkflowModalOpen} 
        onClose={() => setWorkflowModalOpen(false)}
        onStart={handleStartWorkflow}
      />
      
      <InfoModal />
      <CatalogModal />
      <ManualPromptModal />
      <ConfirmModal />
      <SettingsModal />

      {/* VIEW ROUTING */}
      {view === 'welcome' && <WelcomeScreen />}
      {view === 'wizard' && <CockpitWizard />}
      {view === 'analysis_review' && <AnalysisReviewView />}
      
    </div>
  );
}

export default App;