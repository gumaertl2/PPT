// src/features/Cockpit/Layout/ActionsMenu.tsx
// 17.02.2026 13:30 - REFACTOR: Extracted ActionsMenu from CockpitHeader to reduce file size.

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Menu, 
  FileInput, 
  Layout, 
  Map as MapIcon, 
  Sparkles, 
  Zap, 
  Globe, 
  Printer, 
  Save, 
  Upload, 
  FileText, 
  Terminal 
} from 'lucide-react';

import { useTripStore } from '../../../store/useTripStore';
import { ExportService } from '../../../services/ExportService';
import type { CockpitViewMode } from '../../../core/types';

interface ActionsMenuProps {
  viewMode: CockpitViewMode;
  setViewMode: (mode: CockpitViewMode) => void;
  onLoadClick: () => void;
  onReset: () => void;
  onOpenExport: () => void;
  onOpenPrint: () => void;
  onOpenAdHoc: () => void;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
  viewMode,
  setViewMode,
  onLoadClick,
  onReset,
  onOpenExport,
  onOpenPrint,
  onOpenAdHoc
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const { 
    project, 
    saveProject, 
    resetProject, 
    downloadFlightRecorder, 
    setWorkflowModalOpen,
    uiState
  } = useTripStore();

  const hasAnalysisResult = !!project.analysis.chefPlaner;
  const hasRouteResult = !!project.analysis.routeArchitect;

  // --- LOGIC MOVED FROM HEADER ---

  const handleOpenAiWorkflows = () => {
    setIsOpen(false);
    if (hasAnalysisResult) {
        setWorkflowModalOpen(true);
    } else {
        alert(t('analysis.errorTitle'));
    }
  };
  
  const handleOpenRoute = () => {
      setIsOpen(false);
      if (hasRouteResult) {
          setViewMode('routeArchitect');
      }
  };

  const handleSaveProject = () => {
    // FIX: Prefer existing filename if available
    if (uiState.currentFileName) {
        const currentName = uiState.currentFileName.replace(/\.json$/i, '');
        const userFileName = window.prompt("Dateiname für Speicherstand:", currentName);
        
        if (!userFileName) {
            setIsOpen(false);
            return;
        }
        
        let finalName = userFileName;
        if (!finalName.endsWith('.json')) finalName += '.json';
        saveProject(finalName);
        setIsOpen(false);
        return;
    }

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

    let fileName = `${safeName}_log_${new Date().toISOString().slice(0,10)}.json`;

    // Prompt User for filename
    const userFileName = window.prompt("Dateiname für Speicherstand:", fileName);
    if (!userFileName) {
        setIsOpen(false);
        return; // Cancelled
    }
    
    fileName = userFileName;
    if (!fileName.endsWith('.json')) fileName += '.json';

    saveProject(fileName);
    setIsOpen(false);
  };

  const handleResetClick = () => {
    if (confirm("Wirklich alles löschen und neu starten?")) { 
      resetProject();
      onReset(); 
      setIsOpen(false);
    }
  };

  const handleExportClick = async () => {
    setIsOpen(false); 
    const success = await ExportService.copyExportToClipboard();
    if (success) onOpenExport();
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex flex-col items-center px-3 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
        title={t('tooltips.menu')}
      >
        <Menu className="w-4 h-4 lg:w-5 lg:h-5 mb-0.5" />
        <span className="text-[10px] font-bold uppercase tracking-wide hidden md:inline">{t('wizard.toolbar.actions')}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in slide-in-from-top-2">
          
          <button 
            onClick={() => { setViewMode('wizard'); setIsOpen(false); }} 
            className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium ${viewMode === 'wizard' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'}`}
            title={t('tooltips.menu_items.data')}
          >
            <FileInput className="w-4 h-4" /> {t('wizard.actions_menu.data')}
          </button>
          
          <button 
            onClick={() => { if(hasAnalysisResult) { setViewMode('analysis'); setIsOpen(false); }}} 
            disabled={!hasAnalysisResult}
            className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium ${
                !hasAnalysisResult ? 'text-slate-300 cursor-not-allowed' : 
                viewMode === 'analysis' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'
            }`}
            title={t('tooltips.menu_items.foundation')}
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
            title={t('tooltips.menu_items.route')}
          >
            <MapIcon className="w-4 h-4" /> {t('wizard.actions_menu.route')}
          </button>
          
          <button 
            onClick={handleOpenAiWorkflows} 
            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
            title={t('tooltips.menu_items.ai_workflows')}
          >
            <Sparkles className="w-4 h-4 text-purple-500" /> AI Workflows
          </button>

          <button 
            onClick={() => { setIsOpen(false); onOpenAdHoc(); }}
            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
            title={t('tooltips.menu_items.adhoc_food')}
          >
            <Zap className="w-4 h-4 text-amber-500" /> {t('wizard.actions_menu.adhoc_food')}
          </button>

          <button 
            onClick={handleExportClick} 
            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
            title={t('tooltips.menu_items.map_export')}
          >
            <Globe className="w-4 h-4 text-green-500" /> {t('wizard.actions_menu.map_export')}
          </button>
          <button 
            onClick={() => { setIsOpen(false); onOpenPrint(); }} 
            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
            title={t('tooltips.menu_items.print')}
          >
            <Printer className="w-4 h-4 text-slate-500" /> {t('wizard.actions_menu.print')}
          </button>
          
          <div className="h-px bg-slate-100 my-1"></div>
          
          <button 
            onClick={handleSaveProject} 
            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
            title={t('tooltips.menu_items.save')}
          >
            <Save className="w-4 h-4 text-blue-500" /> {t('wizard.actions_menu.save')}
          </button>
          <button 
            onClick={() => { setIsOpen(false); onLoadClick(); }} 
            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
            title={t('tooltips.menu_items.load')}
          >
            <Upload className="w-4 h-4 text-green-500" /> {t('wizard.actions_menu.load')}
          </button>
          <button 
            onClick={handleResetClick} 
            className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-3 text-sm font-medium"
            title={t('tooltips.menu_items.new')}
          >
            <FileText className="w-4 h-4" /> {t('wizard.actions_menu.new')}
          </button>
          
          <button 
            onClick={() => { downloadFlightRecorder(); setIsOpen(false); }} 
            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
            title={t('tooltips.menu_items.log')}
          >
            <Terminal className="w-4 h-4 text-slate-500" /> {t('wizard.actions_menu.log')}
          </button>
        </div>
      )}
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
};
// --- END OF FILE 200 Lines ---