// 20.03.2026 23:30 - FIX: Removed async print timeout to comply with iOS WebKit security policies. Implemented safe dispatch for Map Print Preview.
// 20.03.2026 18:00 - UX: Removed text label from Print button in header.
// src/features/Cockpit/Layout/CockpitHeader.tsx

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Map as MapIcon, 
  BookOpen, 
  Info, 
  Filter, 
  Edit3,
  Home,
  Search, 
  X,
  Wallet,
  Printer
} from 'lucide-react';

import { useTripStore } from '../../../store/useTripStore';
import { SettingsModal } from '../SettingsModal';
import ExportModal from '../ExportModal'; 
import PrintModal from '../PrintModal'; 
import { AdHocFoodModal } from '../AdHocFoodModal'; 
import { SafeExitModal } from '../SafeExitModal'; 
import { ActionsMenu } from './ActionsMenu'; 
import { TripFinanceModal } from '../TripFinanceModal'; 
import type { CockpitViewMode, PrintConfig } from '../../../core/types'; 
import { useTripGeneration } from '../../../hooks/useTripGeneration';
import { InfoModal } from '../../Welcome/InfoModal'; 
import { description } from '../../../data/Texts/description';
import { quickGuide } from '../../../data/Texts/quickguide';
import { SightFilterModal } from '../SightFilterModal'; 

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
  const { t, i18n } = useTranslation();
  
  useTripGeneration();

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
  
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false); 
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false); 
  const [isAdHocModalOpen, setIsAdHocModalOpen] = useState(false); 
  const [showExitModal, setShowExitModal] = useState(false); 
  const [showManualModal, setShowManualModal] = useState(false); 
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false); 
  const [showQuickGuide, setShowQuickGuide] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFilterActive = uiState.searchTerm || uiState.categoryFilter.length > 0 || uiState.visitedFilter !== 'all';

  const currentLang = (i18n.language.substring(0, 2) === 'en' ? 'en' : 'de') as 'de' | 'en';
  const manualContent = description[currentLang] || description['de'];
  const quickGuideContent = quickGuide[currentLang] || quickGuide['de'];

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
    }, 2000); 
  };

  // FIX: Apple-Proof Print Dispatch. Keine asynchronen Timeouts mehr!
  const handleDirectPrint = () => {
      const isMapActive = viewMode === 'sights' && uiState.viewMode === 'map';
      
      if (isMapActive) {
          // Öffnet das sichere React-Overlay in der Karte (Apple/iOS konform)
          window.dispatchEvent(new Event('open-map-print-preview'));
      } else {
          // Normaler Listen-Druck
          window.print();
      }
  };

  const handleHomeClick = () => {
      setShowExitModal(true);
  };

  const handleExitDiscard = () => {
      resetProject();
      onReset();
      setView('welcome');
      setShowExitModal(false);
  };

  const handleExitSave = async () => {
      let baseName = "Papatours_Reise";
      if (uiState.currentFileName) {
          baseName = uiState.currentFileName.replace(/\.json$/i, '');
      } else {
          const { logistics } = project.userInputs;
          if (logistics.mode === 'stationaer') {
              const dest = logistics.stationary.destination?.trim();
              const reg = logistics.stationary.region?.trim();
              if (dest && reg) baseName = `${dest}_${reg}`;
              else if (dest) baseName = dest;
              else if (reg) baseName = reg;
          } else {
             const reg = logistics.roundtrip.region?.trim();
             if (reg) baseName = `Rundreise_${reg}`;
          }
      }
      
      const safeName = baseName.replace(/[^a-zA-Z0-9_-]/g, '_'); 
      let fileName = safeName.endsWith('.json') ? safeName : `${safeName}.json`;

      if (!('showSaveFilePicker' in window)) {
          const userFileName = window.prompt("Projekt speichern unter:", fileName);
          if (!userFileName) return;

          fileName = userFileName;
          if (!fileName.endsWith('.json')) fileName += '.json';
      }

      const success = await saveProject(fileName);
      
      if (success) {
          resetProject();
          onReset();
          setView('welcome');
          setShowExitModal(false);
      }
  };

  return (
    <>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />

      <div className="h-16 w-full shrink-0 bg-transparent no-print"></div>

      <header className="bg-white border-b border-slate-200 fixed top-0 left-0 w-full h-16 z-[999] shadow-sm transform-none">
        <div className="max-w-4xl mx-auto px-2 sm:px-4 h-full flex items-center justify-between gap-1 sm:gap-4">
          
          <div className="flex items-center gap-0.5 sm:gap-2 flex-1 min-w-0">
            
            <button 
              onClick={handleHomeClick} 
              className="p-1.5 sm:p-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-colors shrink-0"
              title={t('tooltips.home')}
            >
              <Home className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            
            <div className="flex items-center gap-0.5 sm:gap-1 overflow-x-auto no-scrollbar mask-gradient pr-1 shrink min-w-0">
                 <button 
                    onClick={() => {
                        if (viewMode === 'plan') {
                            if (!isSightFilterOpen) toggleSightFilter();
                        } else {
                            setViewMode('plan');
                        }
                    }} 
                    className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded transition-colors shrink-0 ${
                       viewMode === 'plan' 
                         ? 'text-blue-600 bg-blue-50' 
                         : 'text-slate-500 hover:bg-slate-100'
                    }`}
                    title={t('wizard.toolbar.diary', { defaultValue: currentLang === 'en' ? 'Diary' : 'Tagebuch' })}
                 >
                   <Edit3 className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.diary', { defaultValue: currentLang === 'en' ? 'Diary' : 'Tagebuch' })}</span>
                 </button>

                 <button 
                   onClick={() => {
                     if (viewMode === 'sights' && uiState.viewMode !== 'map') {
                       if (!isSightFilterOpen) toggleSightFilter();
                       window.scrollTo({ top: 0, behavior: 'smooth' });
                     } else {
                       setViewMode('sights');
                       setUIState({ viewMode: 'list' });
                       window.scrollTo({ top: 0, behavior: 'smooth' });
                     }
                   }} 
                   className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded transition-colors shrink-0 ${
                     viewMode === 'sights' && uiState.viewMode !== 'map' 
                       ? 'text-blue-600 bg-blue-50' 
                       : 'text-slate-500 hover:bg-slate-100'
                   }`}
                   title={t('wizard.toolbar.guide')}
                 >
                   <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.guide')}</span>
                 </button>

                 <button 
                   onClick={() => setViewMode('info')}
                   className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded transition-colors shrink-0 ${
                     viewMode === 'info' 
                       ? 'text-blue-600 bg-blue-50' 
                       : 'text-slate-500 hover:bg-slate-100'
                   }`}
                   title={t('wizard.toolbar.info_travel')}
                 >
                   <Info className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.info_travel')}</span>
                 </button>

                 <button 
                   onClick={() => {
                     if (viewMode === 'sights' && uiState.viewMode === 'map') {
                         if (!isSightFilterOpen) toggleSightFilter();
                     } else {
                         setViewMode('sights');
                         setUIState({ viewMode: 'map', selectedPlaceId: null });
                     }
                   }}
                   className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded transition-colors shrink-0 ${
                     viewMode === 'sights' && uiState.viewMode === 'map'
                       ? 'text-blue-600 bg-blue-50' 
                       : 'text-slate-500 hover:bg-slate-100'
                   }`}
                   title={t('wizard.toolbar.map')}
                 >
                   <MapIcon className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.map')}</span>
                 </button>

                 <button 
                   onClick={() => {
                     toggleSightFilter();
                   }}
                   className={`flex flex-col items-center px-1.5 sm:px-2 py-1 rounded transition-colors shrink-0 ${
                     isSightFilterOpen
                       ? 'text-blue-600 bg-blue-50'
                       : isFilterActive ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-500 hover:bg-slate-100'
                   }`}
                   title={t('tooltips.filter')}
                 >
                   <Filter className={`w-4 h-4 lg:w-5 lg:h-5 mb-0.5 ${isFilterActive ? 'fill-amber-500' : ''}`} />
                   <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.toolbar.search')}</span>
                 </button>
            </div>

             <div className="relative flex items-center ml-0.5 sm:ml-1 group shrink-0">
                <Search className="absolute left-1.5 sm:left-2 w-3 h-3 text-slate-400 pointer-events-none" />
                <input 
                  type="text" 
                  value={uiState.searchTerm || ''}
                  onChange={(e) => {
                      if (viewMode !== 'sights' && viewMode !== 'info' && viewMode !== 'plan') {
                          setViewMode('sights');
                      }
                      setUIState({ searchTerm: e.target.value });
                  }}
                  placeholder={t('sights.search_placeholder_full', { defaultValue: currentLang === 'en' ? 'Keyword, place...' : 'Stichwort, Ort, Notiz...' })}
                  className="pl-6 sm:pl-7 pr-5 sm:pr-6 py-1.5 text-[10px] sm:text-xs border border-slate-200 rounded-full bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:bg-white w-20 focus:w-28 sm:w-24 sm:focus:w-36 transition-all duration-300 placeholder:text-slate-400"
                />
                {uiState.searchTerm && (
                  <button 
                    onClick={() => setUIState({ searchTerm: '' })}
                    className="absolute right-1 sm:right-1.5 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
             </div>
          </div>
          
          <div className="flex items-center gap-0.5 sm:gap-2 flex-shrink-0">
              <button 
                onClick={() => setIsFinanceModalOpen(true)}
                className="flex flex-col items-center px-1.5 sm:px-2 py-1 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 rounded transition-colors shrink-0"
                title={t('finance.title', { defaultValue: 'Reisekasse' })}
              >
                <Wallet className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide hidden xl:inline">{t('wizard.actions_menu.finance', { defaultValue: 'Kasse' })}</span>
              </button>

              <button 
                onClick={handleDirectPrint}
                className="flex flex-col justify-center items-center px-2 sm:px-3 py-1 h-full text-slate-500 hover:bg-slate-100 rounded transition-colors shrink-0"
                title={t('tooltips.menu_items.print', { defaultValue: 'Drucken' })}
              >
                <Printer className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              
              <div className="w-px h-6 sm:h-8 bg-slate-200 mx-0.5 sm:mx-1"></div>

              <ActionsMenu 
                viewMode={viewMode}
                setViewMode={setViewMode}
                onLoadClick={handleLoadClick}
                onReset={onReset}
                onOpenExport={() => setIsExportModalOpen(true)}
                onOpenPrint={() => setIsPrintModalOpen(true)}
                onOpenAdHoc={() => setIsAdHocModalOpen(true)}
                onOpenSettings={() => setShowSettingsModal(true)}
                onOpenManual={() => {
                  if (viewMode === 'wizard') {
                    onOpenHelp(); 
                  } else {
                    setShowManualModal(true); 
                  }
                }}
                onOpenQuickGuide={() => setShowQuickGuide(true)}
              />
          </div>
        </div>
      </header>
      
      <SightFilterModal />

      <SettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
      <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <PrintModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} onConfirm={handlePrintConfirm} />
      <AdHocFoodModal isOpen={isAdHocModalOpen} onClose={() => setIsAdHocModalOpen(false)} />
      <SafeExitModal isOpen={showExitModal} onCancel={() => setShowExitModal(false)} onDiscard={handleExitDiscard} onSave={handleExitSave} />
      <TripFinanceModal isOpen={isFinanceModalOpen} onClose={() => setIsFinanceModalOpen(false)} /> 
      
      <InfoModal 
        isOpen={showManualModal} 
        onClose={() => setShowManualModal(false)} 
        title={manualContent.title as string} 
        content={manualContent.content as string} 
      />

      <InfoModal 
        isOpen={showQuickGuide} 
        onClose={() => setShowQuickGuide(false)} 
        title={quickGuideContent.title as string} 
        content={quickGuideContent.content as string} 
      />
    </>
  );
};
// --- END OF FILE 387 Zeilen ---