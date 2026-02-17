// 17.02.2026 13:40 - REFACTOR: Integrated ActionsMenu component & cleaned up imports.
// 17.02.2026 12:30 - UX: Added Mouseover-Tooltips for all buttons and menu items.
// 17.02.2026 12:10 - REFACTOR: Integrated SafeExitModal component for clean architecture & I18n.
// 17.02.2026 11:45 - FEAT: Added 'Safe Home' Exit Modal with Copyright & Disclaimer.
// 09.02.2026 11:35 - FIX: Added filename persistence (Strict User Code Base).
// 06.02.2026 19:35 - FEAT: Wired 'Plan' button to switch viewMode to 'plan'.
// 06.02.2026 18:55 - FIX: Added 'await' to loadProject to ensure filename is set before UI updates.
// src/features/Cockpit/Layout/CockpitHeader.tsx

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Map as MapIcon, 
  BookOpen, 
  Info, 
  Filter, 
  Terminal, 
  HelpCircle, 
  Edit3,
  Home,
  Search, 
  X,
  Sparkles // Kept for Auto-Button
} from 'lucide-react';

import { useTripStore } from '../../../store/useTripStore';
import { SettingsModal } from '../SettingsModal';
import ExportModal from '../ExportModal'; 
import PrintModal from '../PrintModal'; 
import { AdHocFoodModal } from '../AdHocFoodModal'; 
import { SafeExitModal } from '../SafeExitModal'; 
import { ActionsMenu } from './ActionsMenu'; // NEW: Imported Component
import type { CockpitViewMode, PrintConfig } from '../../../core/types'; 

interface CockpitHeaderProps {
  viewMode: CockpitViewMode;
  setViewMode: (mode: CockpitViewMode) => void;
  onReset: () => void;       
  onLoad: (hasAnalysis: boolean) => void; 
  onOpenHelp: () => void;   
}

export const CockpitHeader: React.FC<CockpitHeaderProps> = ({
  viewMode,
  setViewMode,
  onReset,
  onLoad,
  onOpenHelp
}) => {
  const { t } = useTranslation();
  
  const { 
    project, 
    loadProject, 
    saveProject,
    resetProject, 
    apiKey, 
    usageStats, 
    setView, 
    toggleSightFilter, 
    isSightFilterOpen,     
    uiState, 
    setUIState
  } = useTripStore();
  
  // Local State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false); 
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false); 
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false); 
  const [showExitModal, setShowExitModal] = useState(false); 
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFilterActive = uiState.searchTerm || uiState.categoryFilter.length > 0;

  // --- ACTIONS LOGIC ---
  // Note: Most logic (Save, Reset, Workflows) has been moved to ActionsMenu.tsx

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  // FIX: Async handler to wait for file loading
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        // FIX: await ensures store is updated (including filename) BEFORE we proceed
        await loadProject(file); 
        
        // Check state immediately after await
        const state = useTripStore.getState();
        const hasAnalysis = !!state.project.analysis?.chefPlaner;
        onLoad(hasAnalysis);
    } catch (e) {
        console.error("File load failed", e);
        alert(t('welcome.error_read_file'));
    }

    event.target.value = ''; 
  };

  const handlePrintConfirm = (config: PrintConfig) => {
    setIsPrintModalOpen(false);
    // Write config to store so PrintReport component picks it up
    setUIState({ printConfig: config });
    
    // Slight delay to allow render, then print
    setTimeout(() => {
        window.print();
        // Optional: clear config after print if desired, but keeping it allows re-print
        // setUIState({ printConfig: null }); 
    }, 500);
  };

  // NEW: SAFE EXIT HANDLERS
  const handleHomeClick = () => {
      setShowExitModal(true);
  };

  const handleExitDiscard = () => {
      resetProject();
      onReset();
      setView('welcome');
      setShowExitModal(false);
  };

  const handleExitSave = () => {
      // 1. Trigger Save Logic (Inline to control flow)
      let baseName = "Papatours_Reise";
      if (uiState.currentFileName) {
          baseName = uiState.currentFileName.replace(/\.json$/i, '');
      } else {
          // Fallback naming logic
          const { logistics } = project.userInputs;
          if (logistics.mode === 'stationaer') {
              const dest = logistics.stationary.destination?.trim();
              if (dest) baseName = dest;
          } else {
             const reg = logistics.roundtrip.region?.trim();
             if (reg) baseName = `Rundreise_${reg}`;
          }
      }
      
      const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_'); 
      let fileName = safeName.endsWith('.json') ? safeName : `${safeName}.json`;

      const userFileName = window.prompt("Projekt speichern unter:", fileName);
      if (!userFileName) return; // Cancelled

      let finalName = userFileName;
      if (!finalName.endsWith('.json')) finalName += '.json';

      // 2. Save
      saveProject(finalName);

      // 3. Exit
      resetProject();
      onReset();
      setView('welcome');
      setShowExitModal(false);
  };

  const renderAutoManualButton = () => {
    if (apiKey) {
      return (
        <button 
          onClick={() => setShowSettingsModal(true)} 
          className="flex flex-col items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors group relative"
          title={t('tooltips.auto')}
        >
          <Sparkles className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
          <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.auto')}</span>
          
          {(usageStats.tokens > 0 || usageStats.calls > 0) && (
             <span className="absolute -top-1 -right-1 flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
             </span>
          )}
          <span className="text-[9px] text-slate-400 -mt-0.5 hidden lg:block">
            {usageStats.tokens > 1000 ? `${(usageStats.tokens/1000).toFixed(1)}k` : usageStats.tokens}
          </span>
        </button>
      );
    } else {
      return (
        <button 
          onClick={() => setShowSettingsModal(true)} 
          className="flex flex-col items-center px-2 py-1 text-slate-500 hover:bg-slate-100 rounded transition-colors"
          title={t('tooltips.manual')}
        >
          <Terminal className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
          <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.manual')}</span>
        </button>
      );
    }
  };

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-2 lg:px-4 h-16 flex items-center justify-between">
          
          <div className="flex items-center gap-1 md:gap-2">
            
            <button 
              onClick={handleHomeClick} 
              className="p-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-colors mr-2"
              title={t('tooltips.home')}
            >
              <Home className="w-6 h-6" />
            </button>
            
             {/* FIX: Wired up 'Plan' button */}
             <button 
                onClick={() => setViewMode('plan')} 
                className={`flex flex-col items-center px-2 py-1 rounded transition-colors ${
                   viewMode === 'plan' 
                     ? 'text-blue-600 bg-blue-50' 
                     : 'text-slate-500 hover:bg-slate-100'
                }`}
                title={t('tooltips.plan')}
             >
               <Edit3 className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
               <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.plan')}</span>
             </button>

             <button 
               onClick={() => {
                 if (viewMode === 'sights') {
                   // Switch back to list if currently in map mode, else toggle filter
                   if (uiState.viewMode === 'map') {
                     setUIState({ viewMode: 'list' });
                   } else {
                     toggleSightFilter();
                   }
                 } else {
                   setViewMode('sights');
                   setUIState({ viewMode: 'list' });
                 }
               }} 
               className={`flex flex-col items-center px-2 py-1 rounded transition-colors ${
                 viewMode === 'sights' && uiState.viewMode !== 'map' 
                   ? 'text-blue-600 bg-blue-50' 
                   : 'text-slate-500 hover:bg-slate-100'
               }`}
               title={t('tooltips.guide')}
             >
               <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
               <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.guide')}</span>
             </button>

             <button 
               onClick={() => setViewMode('info')}
               className={`flex flex-col items-center px-2 py-1 rounded transition-colors ${
                 viewMode === 'info' 
                   ? 'text-blue-600 bg-blue-50' 
                   : 'text-slate-500 hover:bg-slate-100'
               }`}
               title={t('tooltips.info')}
             >
               <Info className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
               <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.info_travel')}</span>
             </button>

             {/* FIX: Enabled Map Button with Selection Reset */}
             <button 
               onClick={() => {
                 setViewMode('sights');
                 // FIX: Explicitly set selectedPlaceId to null to trigger "Overview Mode"
                 setUIState({ viewMode: 'map', selectedPlaceId: null });
               }}
               className={`flex flex-col items-center px-2 py-1 rounded transition-colors ${
                 viewMode === 'sights' && uiState.viewMode === 'map'
                   ? 'text-blue-600 bg-blue-50' 
                   : 'text-slate-500 hover:bg-slate-100'
               }`}
               title={t('tooltips.map')}
             >
               <MapIcon className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
               <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.map')}</span>
             </button>

             <button 
               onClick={() => {
                 if (viewMode !== 'sights') setViewMode('sights');
                 toggleSightFilter();
               }}
               className={`flex flex-col items-center px-2 py-1 rounded transition-colors ${
                 isSightFilterOpen && viewMode === 'sights'
                   ? 'text-blue-600 bg-blue-50'
                   : isFilterActive ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-500 hover:bg-slate-100'
               }`}
               title={t('tooltips.filter')}
             >
               <Filter className={`w-4 h-4 lg:w-5 lg:h-5 mb-0.5 ${isFilterActive ? 'fill-amber-500' : ''}`} />
               <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.search')}</span>
             </button>

             <div className="relative flex items-center ml-1 group">
                <Search className="absolute left-2 w-3 h-3 text-slate-400 pointer-events-none" />
                <input 
                  type="text" 
                  value={uiState.searchTerm || ''}
                  onChange={(e) => {
                      if (viewMode !== 'sights') setViewMode('sights');
                      setUIState({ searchTerm: e.target.value });
                  }}
                  placeholder={t('sights.search_placeholder', { defaultValue: 'Suchen...' })}
                  className="pl-7 pr-6 py-1.5 text-xs border border-slate-200 rounded-full bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white focus:w-48 w-24 transition-all duration-300 placeholder:text-slate-400"
                />
                {uiState.searchTerm && (
                  <button 
                    onClick={() => setUIState({ searchTerm: '' })}
                    className="absolute right-1.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
             </div>
          </div>
          
          <div className="flex items-center gap-1 md:gap-2">

              {renderAutoManualButton()}

              <button 
                onClick={onOpenHelp} 
                className="flex flex-col items-center px-2 py-1 text-slate-500 hover:bg-slate-100 rounded transition-colors"
                title={t('tooltips.help')}
              >
                <HelpCircle className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.help')}</span>
              </button>
              
              <div className="w-px h-8 bg-slate-200 mx-1"></div>

              {/* NEW: Integrated Actions Menu */}
              <ActionsMenu 
                viewMode={viewMode}
                setViewMode={setViewMode}
                onLoadClick={handleLoadClick}
                onReset={onReset}
                onOpenExport={() => setIsExportModalOpen(true)}
                onOpenPrint={() => setIsPrintModalOpen(true)}
                onOpenAdHoc={() => setIsAdHocModalOpen(true)}
              />

          </div>
        </div>
      </header>
      
      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />

      <ExportModal 
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <PrintModal 
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        onConfirm={handlePrintConfirm}
      />

      <AdHocFoodModal 
        isOpen={isAdHocModalOpen} 
        onClose={() => setIsAdHocModalOpen(false)} 
      />

      <SafeExitModal 
        isOpen={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onDiscard={handleExitDiscard}
        onSave={handleExitSave}
      />
    </>
  );
};
// --- END OF FILE 335 Lines ---