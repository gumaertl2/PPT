// 20.02.2026 09:40 - UX FIX: Guide-Button schließt/öffnet nicht mehr ungewollt den Filter, sondern scrollt nach oben.
// 20.02.2026 09:35 - LAYOUT FIX: Header ist nun kugelsicher 'fixed' am Viewport verankert (verschwindet nie wieder).
// 17.02.2026 15:05 - LAYOUT: Cockpit 2.1. Critical Flexbox Fix & Moved Auto-Toggle to Menu.
// src/features/Cockpit/Layout/CockpitHeader.tsx

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Map as MapIcon, 
  BookOpen, 
  Info, 
  Filter, 
  HelpCircle, 
  Edit3,
  Home,
  Search, 
  X
} from 'lucide-react';

import { useTripStore } from '../../../store/useTripStore';
import { SettingsModal } from '../SettingsModal';
import ExportModal from '../ExportModal'; 
import PrintModal from '../PrintModal'; 
import { AdHocFoodModal } from '../AdHocFoodModal'; 
import { SafeExitModal } from '../SafeExitModal'; 
import { ActionsMenu } from './ActionsMenu'; 
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

  const handleLoadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
        await loadProject(file); 
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
    setUIState({ printConfig: config });
    setTimeout(() => {
        window.print();
    }, 500);
  };

  // SAFE EXIT HANDLERS
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
      let baseName = "Papatours_Reise";
      if (uiState.currentFileName) {
          baseName = uiState.currentFileName.replace(/\.json$/i, '');
      } else {
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
      if (!userFileName) return;

      let finalName = userFileName;
      if (!finalName.endsWith('.json')) finalName += '.json';

      saveProject(finalName);

      resetProject();
      onReset();
      setView('welcome');
      setShowExitModal(false);
  };

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      {/* FIX 1: Unsichtbarer Abstandhalter, der das Layout schützt, da der Header nun fixed ist */}
      <div className="h-16 w-full shrink-0 bg-transparent no-print"></div>

      {/* FIX 2: Header ist nun kugelsicher (fixed, w-full, z-[999]) an der Decke des Bildschirms verankert */}
      <header className="bg-white border-b border-slate-200 fixed top-0 left-0 w-full h-16 z-[999] shadow-sm transform-none">
        <div className="max-w-6xl mx-auto px-2 lg:px-4 h-full flex items-center justify-between gap-2 sm:gap-4">
          
          {/* LEFT GROUP: Home + Scrollable Nav + Search */}
          <div className="flex items-center gap-1 md:gap-2 flex-1 min-w-0">
            
            <button 
              onClick={handleHomeClick} 
              className="p-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-colors mr-1 shrink-0"
              title={t('tooltips.home')}
            >
              <Home className="w-6 h-6" />
            </button>
            
            {/* Scrollable Nav Container */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar mask-gradient pr-2 shrink min-w-0">
                 <button 
                    onClick={() => setViewMode('plan')} 
                    className={`flex flex-col items-center px-2 py-1 rounded transition-colors shrink-0 ${
                       viewMode === 'plan' 
                         ? 'text-blue-600 bg-blue-50' 
                         : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title={t('tooltips.plan')}
                 >
                   <Edit3 className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.plan')}</span>
                 </button>

                 <button 
                   onClick={() => {
                     if (viewMode === 'sights') {
                       if (uiState.viewMode === 'map') {
                         setUIState({ viewMode: 'list' });
                       } else {
                         // FIX 3: Öffnet nicht mehr ungewollt den Filter! Scrollt stattdessen elegant nach oben.
                         window.scrollTo({ top: 0, behavior: 'smooth' });
                       }
                     } else {
                       setViewMode('sights');
                       setUIState({ viewMode: 'list' });
                       window.scrollTo({ top: 0, behavior: 'smooth' });
                     }
                   }} 
                   className={`flex flex-col items-center px-2 py-1 rounded transition-colors shrink-0 ${
                     viewMode === 'sights' && uiState.viewMode !== 'map' 
                       ? 'text-blue-600 bg-blue-50' 
                       : 'text-slate-500 hover:bg-slate-100'
                   }`}
                   title={t('tooltips.guide')}
                 >
                   <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.guide')}</span>
                 </button>

                 <button 
                   onClick={() => setViewMode('info')}
                   className={`flex flex-col items-center px-2 py-1 rounded transition-colors shrink-0 ${
                     viewMode === 'info' 
                       ? 'text-blue-600 bg-blue-50' 
                       : 'text-slate-500 hover:bg-slate-100'
                   }`}
                   title={t('tooltips.info')}
                 >
                   <Info className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.info_travel')}</span>
                 </button>

                 <button 
                   onClick={() => {
                     setViewMode('sights');
                     setUIState({ viewMode: 'map', selectedPlaceId: null });
                   }}
                   className={`flex flex-col items-center px-2 py-1 rounded transition-colors shrink-0 ${
                     viewMode === 'sights' && uiState.viewMode === 'map'
                       ? 'text-blue-600 bg-blue-50' 
                       : 'text-slate-500 hover:bg-slate-100'
                   }`}
                   title={t('tooltips.map')}
                 >
                   <MapIcon className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.map')}</span>
                 </button>

                 <button 
                   onClick={() => {
                     if (viewMode !== 'sights') setViewMode('sights');
                     toggleSightFilter();
                   }}
                   className={`flex flex-col items-center px-2 py-1 rounded transition-colors shrink-0 ${
                     isSightFilterOpen && viewMode === 'sights'
                       ? 'text-blue-600 bg-blue-50'
                       : isFilterActive ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-500 hover:bg-slate-100'
                   }`}
                   title={t('tooltips.filter')}
                 >
                   <Filter className={`w-4 h-4 lg:w-5 lg:h-5 mb-0.5 ${isFilterActive ? 'fill-amber-500' : ''}`} />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.search')}</span>
                 </button>
            </div>

             {/* Search Bar - Sticks to the nav */}
             <div className="relative flex items-center ml-1 group shrink-0">
                <Search className="absolute left-2 w-3 h-3 text-slate-400 pointer-events-none" />
                <input 
                  type="text" 
                  value={uiState.searchTerm || ''}
                  onChange={(e) => {
                      if (viewMode !== 'sights') setViewMode('sights');
                      setUIState({ searchTerm: e.target.value });
                  }}
                  placeholder={t('sights.search_placeholder', { defaultValue: 'Suchen...' })}
                  className="pl-7 pr-6 py-1.5 text-xs border border-slate-200 rounded-full bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white w-24 sm:focus:w-48 transition-all duration-300 placeholder:text-slate-400"
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
          
          {/* RIGHT GROUP (System) - Fixed width, never shrinks */}
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">

              <button 
                onClick={onOpenHelp} 
                className="flex flex-col items-center px-2 py-1 text-slate-500 hover:bg-slate-100 rounded transition-colors shrink-0"
                title={t('tooltips.help')}
              >
                <HelpCircle className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.help')}</span>
              </button>
              
              <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

              <ActionsMenu 
                viewMode={viewMode}
                setViewMode={setViewMode}
                onLoadClick={handleLoadClick}
                onReset={onReset}
                onOpenExport={() => setIsExportModalOpen(true)}
                onOpenPrint={() => setIsPrintModalOpen(true)}
                onOpenAdHoc={() => setIsAdHocModalOpen(true)}
                onOpenSettings={() => setShowSettingsModal(true)}
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
// --- END OF FILE 314 Zeilen ---