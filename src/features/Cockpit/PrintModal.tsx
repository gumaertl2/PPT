// 06.02.2026 22:15 - FIX: Pass required 'layout' and 'showImages' to onConfirm (TS2345).
// 23.01.2026 17:35 - i18n: Replaced hardcoded strings using useTranslation (137 lines base).
// src/features/Cockpit/PrintModal.tsx

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  X, 
  Printer, 
  FileText, 
  Layout, 
  Map, 
  Info, 
  Settings2,
  CheckCircle2
} from 'lucide-react';
import type { PrintConfig, DetailLevel } from '../../core/types';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (config: PrintConfig) => void;
}

const PrintModal: React.FC<PrintModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const { t } = useTranslation();
  const [detailLevel, setDetailLevel] = useState<DetailLevel>('standard');
  const [sections, setSections] = useState({
    briefing: true,
    analysis: true,
    tours: true,
    categories: true,
    infos: true
  });

  if (!isOpen) return null;

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
              <Printer size={22} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">{t('print.title')}</h3>
              <p className="text-xs text-slate-500 font-medium italic">{t('print.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          
          {/* DETAIL-STUFEN (3 Schalter) */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Settings2 size={14} /> {t('print.detail_level')}
            </label>
            <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-2xl border border-slate-200/50">
              {(['compact', 'standard', 'details'] as DetailLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setDetailLevel(level)}
                  className={`py-2.5 text-xs font-bold rounded-xl transition-all ${
                    detailLevel === level 
                      ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200' 
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t(`sights.${level}`)}
                </button>
              ))}
            </div>
          </div>

          {/* SEKTIONEN AUSWAHL */}
          <div className="space-y-3">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Layout size={14} /> {t('print.sections_label')}
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { id: 'briefing', label: t('print.sections.briefing'), icon: <FileText size={16} /> },
                { id: 'analysis', label: t('print.sections.analysis'), icon: <CheckCircle2 size={16} /> },
                { id: 'tours', label: t('print.sections.tours'), icon: <Map size={16} /> },
                { id: 'categories', label: t('print.sections.categories'), icon: <Layout size={16} /> },
                { id: 'infos', label: t('print.sections.infos'), icon: <Info size={16} /> },
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id as keyof typeof sections)}
                  className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${
                    sections[section.id as keyof typeof sections]
                      ? 'bg-blue-50/50 border-blue-100 text-blue-900'
                      : 'bg-white border-slate-100 text-slate-400 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={sections[section.id as keyof typeof sections] ? 'text-blue-600' : ''}>
                      {section.icon}
                    </span>
                    <span className="text-sm font-bold">{section.label}</span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    sections[section.id as keyof typeof sections]
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-200'
                  }`}>
                    {sections[section.id as keyof typeof sections] && <X size={12} className="text-white rotate-45" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-8 py-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[10px] text-slate-400 font-medium max-w-[200px]">
            {t('print.footer_tip')}
          </p>
          {/* FIX: Ensure config object matches PrintConfig interface by providing missing fields */}
          <button 
            onClick={() => onConfirm({ 
              detailLevel, 
              sections,
              layout: 'standard', // Added missing property
              showImages: true    // Added missing property
            })}
            className="px-8 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-blue-600 transition-all active:scale-95 shadow-xl shadow-slate-200 flex items-center gap-2"
          >
            <Printer size={18} /> {t('print.btn_start')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;

// --- END OF FILE 145 Zeilen ---