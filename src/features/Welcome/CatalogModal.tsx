// 20.02.2026 22:45 - FIX: Rebuilt Print CSS to kill transforms, fixed heights, and flex-containers to allow proper multi-page pagination.
// 20.02.2026 22:30 - FIX: Aligned text to left, removed 'Expert Mode' text, applied full promptInstructions.
// src/features/Welcome/CatalogModal.tsx

import React from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Printer, 
  Database,
  Info,
  Lightbulb
} from 'lucide-react';
import { 
  STRATEGY_OPTIONS, 
  INTEREST_DATA, 
  VIBE_OPTIONS, 
  BUDGET_OPTIONS, 
  PACE_OPTIONS 
} from '../../data/staticData';
import { APPENDIX_ONLY_INTERESTS } from '../../data/constants';
import type { LanguageCode, LocalizedContent } from '../../core/types';

interface CatalogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CatalogModal: React.FC<CatalogModalProps> = ({ isOpen, onClose }) => {
  const { i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;

  if (!isOpen) return null;

  // --- HELPER: Label Resolution ---
  const resolveLabel = (label: string | LocalizedContent | undefined): string => {
    if (!label) return '';
    if (typeof label === 'string') return label;
    return label[currentLang] || label['de'] || '';
  };

  // --- HELPER: Resolve Text ---
  const getTextContent = (item: any): string => {
    if (!item) return "";
    
    // 1. Strategien / Pace / Budget / Vibe -> Prompt Instruction 
    if (item.promptInstruction && item.promptInstruction[currentLang]) {
      return item.promptInstruction[currentLang];
    }
    
    // 2. Interessen -> Default Preference 
    if (item.defaultUserPreference && item.defaultUserPreference[currentLang]) {
      return item.defaultUserPreference[currentLang];
    }

    // 3. Fallback Optionen -> Description
    if (item.description) {
        return resolveLabel(item.description);
    }

    if (item.anweisung) return item.anweisung;
    if (item.praeferenz) return item.praeferenz;

    return "---";
  };

  const handlePrint = () => {
    window.print();
  };

  // --- DATA SPLITTING ---
  const activityInterests = Object.fromEntries(
      Object.entries(INTEREST_DATA).filter(([id]) => !APPENDIX_ONLY_INTERESTS.includes(id))
  );
  
  const knowledgeInterests = Object.fromEntries(
      Object.entries(INTEREST_DATA).filter(([id]) => APPENDIX_ONLY_INTERESTS.includes(id))
  );

  // --- RENDER SECTION HELPERS ---
  const renderSection = (title: string, data: Record<string, any>, icon?: any) => (
    <div className="mb-8 break-inside-avoid">
      <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-100 pb-2 mb-4 uppercase tracking-wider flex items-center gap-2">
        {icon} {title}
      </h3>
      <div className="space-y-4">
        {Object.entries(data).map(([id, item]) => {
          const text = getTextContent(item);
          const label = resolveLabel(item.label) || id;
          
          return (
            <div key={id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm break-inside-avoid hover:border-blue-300 transition-colors group">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">{label}</h4>
                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 rounded border border-slate-100 font-mono shrink-0">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200 catalog-print-wrapper">
      
      {/* BULLETPROOF PRINT STYLES */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .catalog-print-wrapper, .catalog-print-wrapper * {
            visibility: visible;
          }
          .catalog-print-wrapper {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: block !important;
            transform: none !important; /* Kills animations preventing pagination */
          }
          .catalog-modal-container { 
            position: relative !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important; 
            max-height: none !important;
            box-shadow: none !important;
            border: none !important;
            overflow: visible !important;
            display: block !important; /* Removes flexbox height constraints */
            transform: none !important;
          }
          .catalog-modal-content {
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            display: block !important;
            padding: 0 !important;
          }
          .no-print, .no-print * { 
            display: none !important; 
            visibility: hidden !important; 
          }
          .break-inside-avoid {
             page-break-inside: avoid;
             break-inside: avoid;
          }
        }
      `}</style>

      <div className="catalog-modal-container bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 text-left">
        
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
        <div className="catalog-modal-content flex-1 overflow-y-auto p-8 bg-slate-50/50 custom-scrollbar print:bg-white print:p-0">
          
          {/* INFO BOX */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-5 mb-10 rounded-r-xl shadow-sm break-inside-avoid">
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-blue-600 mt-1 shrink-0" />
              <div className="text-sm text-blue-900 space-y-3">
                <p className="font-extrabold text-base mb-2">
                  {currentLang === 'de' ? 'Kurzanleitung: So steuern Sie die KI' : 'Quick Guide: How to control the AI'}
                </p>
                {currentLang === 'de' ? (
                  <ul className="space-y-2.5 leading-relaxed">
                    <li><strong className="text-blue-950">1. Reise-Charakter (Strategie):</strong> Sie ist die oberste Direktive und überstimmt im Zweifel andere Angaben. Definiert den Fokus der gesamten Reise.</li>
                    <li><strong className="text-blue-950">2. Rahmenbedingungen:</strong> Definieren Sie das Reisetempo (Pace), das Preisniveau (Budget) und die emotionale Stimmung (Vibe).</li>
                    <li><strong className="text-blue-950">3. Aktivitäten (Tagesplan):</strong> Wählen Sie Themen, für die die KI konkrete <em>physische Orte</em> (Museen, Parks, Sport) zum Besuchen vorschlagen soll.</li>
                    <li><strong className="text-blue-950">4. Info-Kapitel (Wissen):</strong> Wählen Sie Themen, zu denen die KI zusätzliche Hintergrundinformationen für den <em>A-Z Reiseführer</em> recherchieren soll.</li>
                  </ul>
                ) : (
                  <ul className="space-y-2.5 leading-relaxed">
                    <li><strong className="text-blue-950">1. Travel Character (Strategy):</strong> The prime directive that overrides other settings. Defines the focus of the trip.</li>
                    <li><strong className="text-blue-950">2. Conditions:</strong> Define the pace, budget level, and emotional vibe.</li>
                    <li><strong className="text-blue-950">3. Activities (Day Plan):</strong> Topics for which the AI should suggest concrete <em>physical places</em> to visit.</li>
                    <li><strong className="text-blue-950">4. Info Chapters (Knowledge):</strong> Topics for background research and general <em>travel guide texts</em>.</li>
                  </ul>
                )}
                
                <div className="pt-3 mt-3 border-t border-blue-200/60 flex gap-2 items-start opacity-90">
                    <Lightbulb className="w-4 h-4 shrink-0 mt-0.5 text-blue-600" />
                    <p className="italic text-xs">
                      {currentLang === 'de' 
                        ? 'Tipp: Sie können diese internen Vorgaben bei der Planung jederzeit mit eigenen Worten an Ihre individuellen Wünsche anpassen!'
                        : 'Tip: You can customize these internal instructions with your own words to your individual needs at any time during planning!'}
                    </p>
                </div>
              </div>
            </div>
          </div>

          {/* 1. REISE CHARAKTER (Strategien) */}
          {renderSection(
            currentLang === 'de' ? '1. Reise-Charakter (Strategien)' : '1. Travel Character (Strategies)', 
            STRATEGY_OPTIONS
          )}

          {/* 2. RAHMENBEDINGUNGEN */}
          <div className="mb-10 break-inside-avoid">
             <h3 className="text-lg font-bold text-slate-800 border-b-2 border-slate-100 pb-2 mb-4 uppercase tracking-wider">
               {currentLang === 'de' ? '2. Rahmenbedingungen' : '2. Conditions'}
             </h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4 break-inside-avoid">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mt-2 mb-1">Pace (Reisetempo)</h4>
                  {Object.entries(PACE_OPTIONS).map(([id, item]) => (
                     <div key={id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm break-inside-avoid hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800 text-sm block">{resolveLabel(item.label)}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 rounded border border-slate-100 font-mono shrink-0">{id}</span>
                        </div>
                        <span className="text-xs text-slate-600 leading-relaxed block whitespace-pre-line">{getTextContent(item)}</span>
                     </div>
                  ))}
                </div>

                <div className="space-y-4 break-inside-avoid">
                  <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mt-2 mb-1">Budget (Preisniveau)</h4>
                  {Object.entries(BUDGET_OPTIONS).map(([id, item]) => (
                     <div key={id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm break-inside-avoid hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800 text-sm block">{resolveLabel(item.label)}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 rounded border border-slate-100 font-mono shrink-0">{id}</span>
                        </div>
                        <span className="text-xs text-slate-600 leading-relaxed block whitespace-pre-line">{getTextContent(item)}</span>
                     </div>
                  ))}
                </div>
             </div>
             
             <div className="mt-6 break-inside-avoid">
                <h4 className="font-bold text-slate-500 text-xs uppercase tracking-widest mb-3">Vibe (Atmosphäre)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {Object.entries(VIBE_OPTIONS).map(([id, item]) => (
                     <div key={id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm break-inside-avoid hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                            <span className="font-bold text-slate-800 text-sm block">{resolveLabel(item.label)}</span>
                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 rounded border border-slate-100 font-mono shrink-0">{id}</span>
                        </div>
                        <span className="text-xs text-slate-600 leading-relaxed block whitespace-pre-line">{getTextContent(item)}</span>
                     </div>
                   ))}
                </div>
             </div>
          </div>

          {/* 3. AKTIVITÄTEN (Physische Orte) */}
          {renderSection(
            currentLang === 'de' ? '3. Aktivitäten (Physische Orte)' : '3. Activities (Physical Places)', 
            activityInterests
          )}

          {/* 4. INFO-KAPITEL (Wissen & Texte) */}
          {renderSection(
            currentLang === 'de' ? '4. Info-Kapitel (A-Z Wissen)' : '4. Info Chapters (Knowledge Base)', 
            knowledgeInterests
          )}

        </div>

        {/* FOOTER */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 shrink-0 flex justify-between items-center text-xs text-slate-400 font-mono no-print">
           <span>LANG: {currentLang.toUpperCase()}</span>
           <span>PAPATOURS V40 ENGINE</span>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE 272 Zeilen ---