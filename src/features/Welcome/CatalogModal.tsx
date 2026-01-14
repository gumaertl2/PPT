// src/features/Welcome/CatalogModal.tsx
// 14.01.2026 18:30 - FIX: Updated resolveLabel to use LocalizedContent type (fixes TS7053 indexing error).

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Printer, 
  Database,
  Info
} from 'lucide-react';
import { 
  STRATEGY_OPTIONS, 
  INTEREST_DATA, 
  VIBE_OPTIONS, 
  BUDGET_OPTIONS, 
  PACE_OPTIONS 
} from '../../data/staticData';
// FIX: Imported LocalizedContent to fix typing in resolveLabel
import type { LanguageCode, LocalizedContent } from '../../core/types';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({ isOpen, onClose }) => {
  // FIX: Removed unused 't'
  const { i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;

  if (!isOpen) return null;

  // --- HELPER: Label Resolution ---
  // FIX: Changed type from hardcoded object to LocalizedContent to support all languages
  const resolveLabel = (label: string | LocalizedContent | undefined): string => {
    if (!label) return '';
    if (typeof label === 'string') return label;
    // Now safe because LocalizedContent has optional keys for all LanguageCodes
    return label[currentLang] || label['de'] || '';
  };

  // --- HELPER: Resolve Text (V30 Logic) ---
  const getTextContent = (item: any): string => {
    if (!item) return "";
    
    // 1. Strategien -> Prompt Instruction (V30: anweisung)
    if (item.promptInstruction && item.promptInstruction[currentLang]) {
      return item.promptInstruction[currentLang];
    }
    
    // 2. Interessen -> Default Preference (V30: praeferenz)
    if (item.defaultUserPreference && item.defaultUserPreference[currentLang]) {
      return item.defaultUserPreference[currentLang];
    }

    // 3. Optionen -> Description
    if (item.description) {
        return resolveLabel(item.description);
    }

    // Fallbacks für alte Datenstrukturen oder fehlende Translations
    if (item.anweisung) return item.anweisung;
    if (item.praeferenz) return item.praeferenz;

    return "---";
  };

  const handlePrint = () => {
    window.print();
  };

  // --- RENDER SECTION HELPERS ---

  const renderSection = (title: string, data: Record<string, any>, icon?: any) => (
    <div className="mb-8 break-inside-avoid">
      <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-100 pb-2 mb-4 uppercase tracking-wider flex items-center gap-2">
        {icon} {title}
      </h3>
      <div className="space-y-4">
        {Object.entries(data).map(([id, item]) => {
          const text = getTextContent(item);
          // FIX: Use resolveLabel instead of direct index access
          const label = resolveLabel(item.label) || id;
          
          return (
            <div key={id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm break-inside-avoid hover:border-blue-200 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-700 text-sm">{label}</h4>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 rounded border border-slate-100 font-mono">
                  {id}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                {text}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white print:block print:relative">
      
      {/* PRINT STYLES */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          .catalog-modal-container { 
            display: block !important; 
            position: absolute !important; 
            top: 0 !important; 
            left: 0 !important; 
            width: 100% !important; 
            height: auto !important; 
            background: white !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
          }
          .catalog-modal-content {
            overflow: visible !important;
            height: auto !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="catalog-modal-container bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0 no-print">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">System Katalog</h2>
              <p className="text-xs text-slate-500">Papatours V40 Knowledge Base</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Katalog drucken"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Drucken</span>
            </button>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENT SCROLL AREA */}
        <div className="catalog-modal-content flex-1 overflow-y-auto p-8 bg-slate-50 custom-scrollbar print:bg-white print:p-0">
          
          {/* INFO BOX (V30 Style) */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-8 rounded-r-md">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-bold mb-1">
                  {currentLang === 'de' ? 'Katalog Übersicht' : 'Catalog Overview'}
                </p>
                <p className="opacity-90 leading-relaxed">
                  {currentLang === 'de' 
                    ? "Hier finden Sie eine Übersicht aller verfügbaren Optionen, Strategien und Interessen, die Papatours für die Generierung Ihrer Reise verwendet. Diese Texte dienen als Basis für die KI-Instruktionen."
                    : "Here you will find an overview of all available options, strategies, and interests that Papatours uses to generate your trip. These texts serve as the basis for AI instructions."}
                </p>
              </div>
            </div>
          </div>

          {/* 1. REISE CHARAKTER (Strategien) */}
          {renderSection(
            currentLang === 'de' ? '1. Reise-Charakter (Strategien)' : '1. Travel Character (Strategies)', 
            STRATEGY_OPTIONS
          )}

          {/* 2. RAHMENBEDINGUNGEN */}
          <div className="mb-8 break-inside-avoid">
             <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-100 pb-2 mb-4 uppercase tracking-wider">
               {currentLang === 'de' ? '2. Rahmenbedingungen' : '2. Conditions'}
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mt-2 mb-1">Pace (Tempo)</h4>
                  {Object.entries(PACE_OPTIONS).map(([id, item]) => (
                     <div key={id} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                        <span className="font-bold text-slate-700 text-sm block">{resolveLabel(item.label)}</span>
                        <span className="text-xs text-slate-500">{resolveLabel(item.description)}</span>
                     </div>
                  ))}
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mt-2 mb-1">Budget</h4>
                  {Object.entries(BUDGET_OPTIONS).map(([id, item]) => (
                     <div key={id} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                        <span className="font-bold text-slate-700 text-sm block">{resolveLabel(item.label)}</span>
                        <span className="text-xs text-slate-500">{resolveLabel(item.description)}</span>
                     </div>
                  ))}
                </div>
             </div>
             
             <div className="mt-6">
                <h4 className="font-bold text-slate-400 text-xs uppercase tracking-widest mb-2">Vibe (Atmosphäre)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {Object.entries(VIBE_OPTIONS).map(([id, item]) => (
                     <div key={id} className="bg-white p-3 rounded border border-slate-200 shadow-sm">
                        <span className="font-bold text-slate-700 text-sm block">{resolveLabel(item.label)}</span>
                        <span className="text-xs text-slate-500">{resolveLabel(item.description)}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* 3. AKTIVITÄTEN (Interessen) */}
          {renderSection(
            currentLang === 'de' ? '3. Aktivitäten (Interessen)' : '3. Activities (Interests)', 
            INTEREST_DATA
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-between items-center text-xs text-slate-400 no-print">
           <span>Sprache: {currentLang.toUpperCase()}</span>
           <span>Papatours V40.6 Data</span>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE 196 Zeilen ---