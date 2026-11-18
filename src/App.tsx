// [2026-11-18] [11:43] - FEAT: Added URL ?quickAdd=1 parsing and URL cleanup for Apple Pay / iOS Shortcut intake.
// [2026-11-17] [10:28] - FEAT: Added support for uiState.isCashOnlyMode focus view in App.tsx.
// [2026-11-16] [17:15] - FEAT: Added URL detection for ?cashRoom=&token= guest mode and global useCashSync hook.
// src/App.tsx
// 14.01.2026 17:25 - FIX: Removed unmanaged global modals and added required onNext prop to AnalysisReviewView (No downstream view available yet).

import { useEffect, useMemo, useState } from 'react';
import { useTripStore } from './store/useTripStore';
import { useTripGeneration } from './hooks/useTripGeneration';
import { useCashSync, type GuestRoomParams } from './hooks/useCashSync';
import { parseQuickAddParams, type QuickAddExpenseParams } from './core/utils/finance';
import { WorkflowSelectionModal } from './features/Workflow/WorkflowSelectionModal';
import { WelcomeScreen } from './features/Welcome/WelcomeScreen';
import { CockpitWizard } from './features/Cockpit/CockpitWizard';
import { AnalysisReviewView } from './features/Cockpit/AnalysisReviewView';
import { TripFinanceModal } from './features/Cockpit/TripFinanceModal';
import { NotificationSystem } from './features/Shared/NotificationSystem';
// FIX: Modals are used locally in features, not globally managed yet.
// import { InfoModal } from './features/Welcome/InfoModal';
// import { CatalogModal } from './features/Welcome/CatalogModal';
// import { ManualPromptModal } from './features/Cockpit/ManualPromptModal';
// import { ConfirmModal } from './features/Cockpit/ConfirmModal';
// import { SettingsModal } from './features/Cockpit/SettingsModal';
import type { WorkflowStepId } from './core/types';

function App() {
  const { 
    view, 
    project, 
    uiState,
    setUIState,
    setLanguage, 
    isWorkflowModalOpen, 
    setWorkflowModalOpen 
  } = useTripStore();
  
  const { startWorkflow } = useTripGeneration();

  const guestCashParams = useMemo<GuestRoomParams | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const roomId = params.get('cashRoom');
    const writeToken = params.get('token');
    if (roomId && writeToken) {
      return { roomId, writeToken };
    }
    return null;
  }, []);

  useCashSync(guestCashParams);

  const [initialQuickAdd, setInitialQuickAdd] = useState<QuickAddExpenseParams | null>(() =>
    parseQuickAddParams(window.location.search)
  );

  useEffect(() => {
    if (!initialQuickAdd) return;
    const url = new URL(window.location.href);
    ['quickAdd', 'amount', 'currency', 'title', 'lat', 'lng'].forEach((k) => url.searchParams.delete(k));
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [initialQuickAdd]);

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
      
      {/* FIX: Removed global mounting of unmanaged modals to fix TS errors. 
          These are correctly used inside their respective parent components.
      <InfoModal />
      <CatalogModal />
      <ManualPromptModal />
      <ConfirmModal />
      <SettingsModal />
      */}

      {/* VIEW ROUTING */}
      {guestCashParams ? (
        <TripFinanceModal
          isOpen={true}
          onClose={() => {}}
          isGuestMode={true}
          initialQuickAdd={initialQuickAdd}
          onClearQuickAdd={() => setInitialQuickAdd(null)}
        />
      ) : uiState.isCashOnlyMode || Boolean(initialQuickAdd) ? (
        <TripFinanceModal
          isOpen={true}
          onClose={() => {
            setInitialQuickAdd(null);
            setUIState({ isCashOnlyMode: false });
          }}
          isGuestMode={false}
          initialQuickAdd={initialQuickAdd}
          onClearQuickAdd={() => setInitialQuickAdd(null)}
        />
      ) : (
        <>
          {view === 'welcome' && <WelcomeScreen />}
          {view === 'wizard' && <CockpitWizard />}
          {view === 'analysis_review' && (
            <AnalysisReviewView 
              // FIX: Added required onNext prop. 
              // Note: No 'ItineraryView' is currently imported in App.tsx, so we stay here or log completion.
              onNext={() => console.log('Analysis Review completed. (No next view defined in App.tsx)')}
            />
          )}
        </>
      )}
      
    </div>
  );
}

export default App;
// --- END OF FILE 138 Zeilen ---