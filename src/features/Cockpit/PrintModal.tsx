// 18.03.2026 20:00 - UX: Removed inline i18n fallbacks to enforce clean architecture. Relies purely on de.json and en.json translation files.
// 18.03.2026 19:30 - UX: Modal scroll layout.
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
  CheckCircle2,
  CalendarDays,
  Book,
  MapPin 
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
    briefing: false,
    analysis: false,
    days: false,
    tours: false,
    categories: false,
    infos: false,
    diaryMap: false,
    diary: false 
  });

  if (!isOpen) return null;

  const toggleSection = (key: keyof typeof sections) => {
    setSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const isAnySectionSelected = Object.values(sections).some(Boolean);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
              <Printer size={20} />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{t('print.title')}</h3>
              <p className="text-[10px] text-slate-500 font-medium italic">{t('print.subtitle')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* SCROLLBARER BODY */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* DETAIL-STUFEN */}
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Settings2 size={12} /> {t('print.detail_level')}
            </label>
            <div className="grid grid-cols-3 p-1 bg-slate-100 rounded-xl border border-slate-200/50">
              {(['compact', 'standard', 'details'] as DetailLevel[]).map((level) => (
                <button
                  key={level}
                  onClick={() => setDetailLevel(level)}
                  className={`py-2 text-[11px] font-bold rounded-lg transition-all ${
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
          <div className="space-y-2.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
              <Layout size={12} /> {t('print.sections_label')}
            </label>
            <div className="grid grid-cols-1 gap-1.5">
              {[
                { id: 'briefing', label: t('print.sections.briefing'), icon: <FileText size={16} /> },
                { id: 'analysis', label: t('print.sections.analysis'), icon: <CheckCircle2 size={16} /> },
                { id: 'days', label: t('print.sections.days'), icon: <CalendarDays size={16} /> },
                { id: 'tours', label: t('print.sections.tours'), icon: <Map size={16} /> },
                { id: 'categories', label: t('print.sections.categories'), icon: <Layout size={16} /> },
                { id: 'infos', label: t('print.sections.infos'), icon: <Info size={16} /> },
                { id: 'diaryMap', label: t('print.sections.diaryMap'), icon: <MapPin size={16} /> }, 
                { id: 'diary', label: t('print.sections.diaryText'), icon: <Book size={16} /> }, 
              ].map((section) => (
                <button
                  key={section.id}
                  onClick={() => toggleSection(section.id as keyof typeof sections)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    sections[section.id as keyof typeof sections]
                      ? 'bg-blue-50/50 border-blue-100 text-blue-900'
                      : 'bg-white border-slate-100 text-slate-400 opacity-60 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={sections[section.id as keyof typeof sections] ? 'text-blue-600' : ''}>
                      {section.icon}
                    </span>
                    <span className="text-[13px] font-bold">{section.label}</span>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                    sections[section.id as keyof typeof sections]
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-200'
                  }`}>
                    {sections[section.id as keyof typeof sections] && <X size={10} className="text-white rotate-45" />}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="px-6 py-5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400 font-medium max-w-[200px] leading-tight">
            {t('print.footer_tip')}
          </p>
          <button 
            disabled={!isAnySectionSelected}
            onClick={() => onConfirm({ 
              detailLevel, 
              sections,
              layout: 'standard', 
              showImages: true    
            })}
            className={`px-6 py-2.5 text-sm font-bold rounded-xl transition-all shadow flex items-center gap-2 ${
              isAnySectionSelected 
                ? 'bg-slate-900 text-white hover:bg-blue-600 active:scale-95 shadow-slate-200' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
            }`}
          >
            <Printer size={16} /> {t('print.btn_start')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrintModal;
// --- END OF FILE 164 Zeilen ---