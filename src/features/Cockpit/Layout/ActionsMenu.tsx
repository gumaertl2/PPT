// 12.04.2026 14:10 - UX: Updated terminology (Briefing & Travel Guide). Replaced hardcoded string with t().
// 07.04.2026 09:30 - UX: Removed Settings and Flight Recorder from ActionsMenu for end-users.
// 20.03.2026 17:40 - UX: Moved Info & Quickguide to ActionsMenu, removed Finance.
// 19.03.2026 13:00 - UX: Avoid double prompting for filename.
// src/features/Cockpit/Layout/ActionsMenu.tsx

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Menu, 
  FileInput as FileInputIcon, 
  Layout, 
  Map as MapIcon, 
  Sparkles, 
  Zap, 
  Globe, 
  Printer, 
  Save, 
  Upload, 
  FileText, 
  HelpCircle
} from 'lucide-react';

import { useTripStore } from '../../../store/useTripStore';
import { ExportService } from '../../../services/ExportService';
import type { CockpitViewMode } from '../../../core/types';
import { MergeProjectModal } from './MergeProjectModal';

interface ActionsMenuProps {
  viewMode: CockpitViewMode;
  setViewMode: (mode: CockpitViewMode) => void;
  onLoadClick?: () => void; 
  onReset: () => void;
  onOpenExport: () => void;
  onOpenPrint: () => void;
  onOpenAdHoc: () => void;
  onOpenManual: () => void;
  onOpenQuickGuide: () => void;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
  viewMode,
  setViewMode,
  onReset,
  onOpenExport,
  onOpenPrint,
  onOpenAdHoc,
  onOpenManual,
  onOpenQuickGuide
}) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingLoadData, setPendingLoadData] = useState<any | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);

  const { 
    project, 
    saveProject, 
    loadProject,
    mergeProject, 
    resetProject, 
    setWorkflowModalOpen,
    uiState
  } = useTripStore();

  const hasAnalysisResult = !!project.analysis.chefPlaner;
  const hasRouteResult = !!project.analysis.routeArchitect;

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

  const handleSaveProject = async () => {
    setIsOpen(false);
    
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

    let fileName = uiState.currentFileName || `${safeName}_log_${new Date().toISOString().slice(0,10)}.json`;

    if (!('showSaveFilePicker' in window)) {
        const currentName = uiState.currentFileName ? uiState.currentFileName.replace(/\.json$/i, '') : fileName;
        const userFileName = window.prompt("Dateiname für Speicherstand:", currentName);
        
        if (!userFileName) return; 
        
        fileName = userFileName;
        if (!fileName.endsWith('.json')) fileName += '.json';
    }

    await saveProject(fileName);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
          try {
              const text = event.target?.result as string;
              const data = JSON.parse(text);
              
              const currentPlacesCount = Object.keys(project.data.places || {}).length;
              
              if (currentPlacesCount > 0) {
                  setPendingLoadData({ file, data });
                  setShowMergeModal(true);
              } else {
                  await loadProject(file);
              }
          } catch (error) {
              console.error("Error reading file:", error);
              alert("Ungültige Projektdatei.");
          }
          if (fileInputRef.current) fileInputRef.current.value = '';
      };
      reader.readAsText(file);
  };

  const executeMerge = () => {
      if (pendingLoadData?.data) mergeProject(pendingLoadData.data);
      setShowMergeModal(false);
      setPendingLoadData(null);
  };

  const executeOverwrite = async () => {
      if (pendingLoadData?.file) await loadProject(pendingLoadData.file);
      setShowMergeModal(false);
      setPendingLoadData(null);
  };

  return (
    <div className="relative">
      
      <input 
        type="file" 
        accept=".json" 
        style={{ display: 'none' }} 
        ref={fileInputRef}
        onChange={handleFileChange}
      />

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
            onClick={() => { setIsOpen(false); onOpenQuickGuide(); }}
            className="w-full text-left px-4 py-2 hover:bg-amber-50 text-slate-700 flex items-center gap-3 text-sm font-medium"
            title={t('welcome.quick_guide_title', { defaultValue: 'Schnellstart-Guide' })}
          >
            <Zap className="w-4 h-4 text-amber-500" /> {t('wizard.toolbar.help_quick', { defaultValue: 'Schnellstart-Guide' })}
          </button>

          <button 
            onClick={() => { setIsOpen(false); onOpenManual(); }}
            className="w-full text-left px-4 py-2 hover:bg-blue-50 text-slate-700 flex items-center gap-3 text-sm font-medium border-b border-slate-100"
            title={t('tooltips.help', { defaultValue: 'Handbuch' })}
          >
            <HelpCircle className="w-4 h-4 text-blue-500" /> {t('wizard.toolbar.help', { defaultValue: 'Handbuch' })}
          </button>

          <button 
            onClick={() => { setViewMode('wizard'); setIsOpen(false); }} 
            className={`w-full text-left px-4 py-2 hover:bg-blue-50 flex items-center gap-3 text-sm font-medium ${viewMode === 'wizard' ? 'text-blue-600 bg-blue-50' : 'text-slate-700'}`}
            title={t('tooltips.menu_items.data')}
          >
            <FileInputIcon className="w-4 h-4" /> {t('wizard.actions_menu.data')}
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
            <Sparkles className="w-4 h-4 text-purple-500" /> {t('wizard.actions_menu.ai_workflows')}
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
            <Printer className="w-4 h-4 text-slate-500" /> {t('wizard.actions_menu.print_report', { defaultValue: 'PDF Report' })}
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
            onClick={() => { setIsOpen(false); fileInputRef.current?.click(); }} 
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
        </div>
      )}
      
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-transparent" onClick={() => setIsOpen(false)} />
      )}

      <MergeProjectModal 
        isOpen={showMergeModal} 
        onClose={() => { setShowMergeModal(false); setPendingLoadData(null); }} 
        onMerge={executeMerge} 
        onOverwrite={executeOverwrite} 
      />

    </div>
  );
};
// 287 Zeilen