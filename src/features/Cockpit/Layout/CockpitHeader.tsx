// 21.01.2026 13:10 - FIX: Using import type for CockpitViewMode & removed unused Lucide icons (TS6133).
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
  Menu, 
  FileInput, 
  Layout, 
  Sparkles, 
  Zap, 
  Globe, 
  Printer, 
  Save, 
  Upload, 
  FileText, 
  // FIX: Removed Database (TS6133)
  // FIX: Removed GitMerge (TS6133)
  Edit3,
  Home,
  Search, 
  X        
} from 'lucide-react';

import { useTripStore } from '../../../store/useTripStore';
import { SettingsModal } from '../SettingsModal';
import type { CockpitViewMode } from '../../../core/types'; // FIX: verbatimModuleSyntax requirement (TS1484)

interface CockpitHeaderProps {
  // FIX: Extended viewMode type to include central CockpitViewMode
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
    resetProject, 
    apiKey, 
    usageStats,
    downloadFlightRecorder,
    setWorkflowModalOpen, 
    setView, 
    toggleSightFilter, 
    isSightFilterOpen,   
    uiState, 
    setUIState
    // FIX: Removed isInfoViewOpen / setInfoViewOpen as it's no longer a modal
  } = useTripStore();
  
  const hasAnalysisResult = !!project.analysis.chefPlaner;
  const hasRouteResult = !!project.analysis.routeArchitect;

  // Local State
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isFilterActive = uiState.searchTerm || uiState.categoryFilter.length > 0;

  // --- ACTIONS LOGIC (ALL ORIGINAL HANDLERS PRESERVED) ---

  const handleOpenAiWorkflows = () => {
    setShowActionsMenu(false);
    if (hasAnalysisResult) {
        setWorkflowModalOpen(true);
    } else {
        alert(t('analysis.errorTitle'));
    }
  };
  
  const handleOpenRoute = () => {
      setShowActionsMenu(false);
      if (hasRouteResult) {
          setViewMode('routeArchitect');
      }
  };

  const handleSaveProject = () => {
    let baseName = "Papatours_Reise";
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

    const safeName = baseName
        .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
        .replace(/Ä/g, 'Ae').replace(/Ö/g, 'Oe').replace(/Ü/g, 'Ue')
        .replace(/ß/g, 'ss')
        .replace(/[^a-zA-Z0-9_-]/g, '_'); 

    const fileName = `${safeName}_${new Date().toISOString().slice(0,10)}.json`;

    const data = JSON.stringify(project, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowActionsMenu(false);
  };

  const handleLoadClick = () => {
    fileInputRef.current?.click();
    setShowActionsMenu(false);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.meta && json.userInputs) {
          loadProject(json);
          const hasAnalysis = !!json.analysis?.chefPlaner;
          onLoad(hasAnalysis);
        } else {
          alert(t('welcome.error_invalid_file'));
        }
      } catch (err) {
        console.error("Ladefehler:", err);
        alert(t('welcome.error_read_file'));
      }
    };
    reader.readAsText(file);
    event.target.value = ''; 
  };

  const handleResetClick = () => {
    if (confirm("Wirklich alles löschen und neu starten?")) { 
      resetProject();
      onReset(); 
      setShowActionsMenu(false);
    }
  };

  const placeholderAction = (name: string) => {
    alert(`Aktion '${name}' ist noch nicht implementiert.`);
    setShowActionsMenu(false);
  };

  const renderAutoManualButton = () => {
    if (apiKey) {
      return (
        <button 
          onClick={() => setShowSettingsModal(true)} 
          className="flex flex-col items-center px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors group relative"
          title="Einstellungen öffnen"
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
          title="API Key eingeben"
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
              onClick={() => setView('welcome')} 
              className="p-2 text-slate-700 hover:bg-slate-100 hover:text-blue-600 rounded-lg transition-colors mr-2"
              title="Zurück zum Start"
            >
              <Home className="w-6 h-6" />
            </button>
            
             <button onClick={() => alert("Plan View placeholder")} className="flex flex-col items-center px-2 py-1 text-slate-500 hover:bg-slate-100 rounded transition-colors">
               <Edit3 className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
               <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.plan')}</span>
             </button>

             <button 
               onClick={() => {
                 if (viewMode === 'sights') {
                   toggleSightFilter();
                 } else {
                   setViewMode('sights');
                 }
               }} 
               className={`flex flex-col items-center px-2 py-1 rounded transition-colors ${
                 viewMode === 'sights' 
                   ? 'text-blue-600 bg-blue-50' 
                   : 'text-slate-500 hover:bg-slate-100'
               }`}
             >
               <BookOpen className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
               <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.guide')}</span>
             </button>

             {/* FIX: Info Button now triggers viewMode switch */}
             <button 
               onClick={() => setViewMode('info')}
               className={`flex flex-col items-center px-2 py-1 rounded transition-colors ${
                 viewMode === 'info' 
                   ? 'text-blue-600 bg-blue-50' 
                   : 'text-slate-500 hover:bg-slate-100'
               }`}
             >
               <Info className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
               <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.info_travel')}</span>
             </button>

             <button className="flex flex-col items-center px-2 py-1 text-slate-400 hover:text-slate-600 cursor-not-allowed opacity-60">
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

              <button onClick={onOpenHelp} className="flex flex-col items-center px-2 py-1 text-slate-500 hover:bg-slate-100 rounded transition-colors">
                <HelpCircle className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.help')}</span>
              </button>
              
              <div className="w-px h-8 bg-slate-200 mx-1"></div>

              <div className="relative">
                <button 
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="flex flex-col items-center px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                >
                  <Menu className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
                  <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.actions')}</span>
                </button>

                {showActionsMenu && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    
                    <button 
                      onClick={() => { setViewMode('wizard'); setShowActionsMenu(false); }} 
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium ${viewMode === 'wizard' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'}`}
                    >
                      <FileInput className="w-4 h-4" /> {t('wizard.actions_menu.data')}
                    </button>
                    
                    <button 
                      onClick={() => { if(hasAnalysisResult) { setViewMode('analysis'); setShowActionsMenu(false); }}} 
                      disabled={!hasAnalysisResult}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium ${
                         !hasAnalysisResult ? 'text-slate-300 cursor-not-allowed' : 
                         viewMode === 'analysis' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'
                      }`}
                    >
                      <Layout className="w-4 h-4" /> {t('wizard.actions_menu.foundation')}
                    </button>
                    
                    <div className="h-px bg-slate-100 my-1"></div>

                    <button 
                      onClick={handleOpenRoute}
                      disabled={!hasRouteResult}
                      className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium ${
                         !hasRouteResult ? 'text-slate-300 cursor-not-allowed' :
                         viewMode === 'routeArchitect' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'
                      }`}
                    >
                      <MapIcon className="w-4 h-4" /> {t('wizard.actions_menu.route')}
                    </button>
                    
                    <button 
                      onClick={handleOpenAiWorkflows} 
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
                    >
                      <Sparkles className="w-4 h-4 text-purple-500" /> AI Workflows
                    </button>

                    <button onClick={() => placeholderAction('Ad-hoc Food')} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium">
                      <Zap className="w-4 h-4 text-amber-500" /> {t('wizard.actions_menu.adhoc_food')}
                    </button>
                    <button onClick={() => placeholderAction('Karten Export')} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium">
                      <Globe className="w-4 h-4 text-green-500" /> {t('wizard.actions_menu.map_export')}
                    </button>
                    <button onClick={() => placeholderAction('Drucken')} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium">
                      <Printer className="w-4 h-4 text-slate-500" /> {t('wizard.actions_menu.print')}
                    </button>
                    
                    <div className="h-px bg-slate-100 my-1"></div>
                    
                    <button onClick={handleSaveProject} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium">
                      <Save className="w-4 h-4 text-blue-500" /> {t('wizard.actions_menu.save')}
                    </button>
                    <button onClick={handleLoadClick} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium">
                      <Upload className="w-4 h-4 text-green-500" /> {t('wizard.actions_menu.load')}
                    </button>
                    <button onClick={handleResetClick} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-3 text-sm font-medium">
                      <FileText className="w-4 h-4" /> {t('wizard.actions_menu.new')}
                    </button>
                    
                    <button 
                      onClick={() => { downloadFlightRecorder(); setShowActionsMenu(false); }} 
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
                    >
                      <Terminal className="w-4 h-4 text-slate-500" /> {t('wizard.actions_menu.log')}
                    </button>
                  </div>
                )}
                {showActionsMenu && (
                  <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setShowActionsMenu(false)} />
                )}
              </div>

          </div>
        </div>
      </header>
      
      <SettingsModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
      />
    </>
  );
};
// --- END OF FILE 410 Zeilen ---