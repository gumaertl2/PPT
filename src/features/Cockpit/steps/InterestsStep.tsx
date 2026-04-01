// 22.03.2026 09:00 - UX: Applied "Deep Input" UX logic (inner shadow, focus rings, strong labels) to cure lack of affordance.
// src/features/Cockpit/steps/InterestsStep.tsx

import React, { useState, useMemo } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import * as Icons from 'lucide-react'; 
import { 
  Edit3, 
  Info, 
  X, 
  Settings2, 
  ListOrdered, 
  Star, 
  Clock,
  Search,
  PenTool,
  MessageSquare
} from 'lucide-react';
import { 
  INTEREST_DATA, 
  INTEREST_DISPLAY_ORDER, 
  APPENDIX_ONLY_INTERESTS, 
  ICONS 
} from '../../../data/staticData';
import type { LanguageCode } from '../../../core/types';

export const InterestsStep = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  // Store Access
  const { 
    project, 
    toggleInterest, 
    setCustomPreference,
    updateProjectInput,
    updateSearchSettings 
  } = useTripStore();

  const { userInputs } = project;
  const { 
    selectedInterests, 
    customPreferences, 
    customSearchStrategies = {}, 
    customWritingGuidelines = {},
    searchSettings 
  } = userInputs;

  // UX-Klassen
  const LABEL_CLASS = "text-[10px] font-black text-blue-800/80 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5";
  const INPUT_CLASS = "w-full text-lg font-black text-slate-800 bg-white border border-slate-300 shadow-inner rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-blue-400 transition-all";

  // --- LOCAL STATE FOR EDITOR ---
  const [editingInterestId, setEditingInterestId] = useState<string | null>(null);
  const [tempPref, setTempPref] = useState(''); 
  const [tempSearch, setTempSearch] = useState(''); 
  const [tempWriting, setTempWriting] = useState(''); 

  // --- HELPER ---

  const renderIcon = (id: string, className: string) => {
    const rawName = ICONS[id];
    if (!rawName) return <Icons.HelpCircle className={className} />;

    const iconName = rawName
      .split('-')
      .map((part: string) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join('');
    
    const LucideIcon = (Icons as any)[iconName];
    if (!LucideIcon) return <Icons.Circle className={className} />;
    return <LucideIcon className={className} />;
  };

  const openEditor = (e: React.MouseEvent, interestId: string) => {
    e.stopPropagation(); 
    
    const data = INTEREST_DATA[interestId];
    if (!data) return;

    const storedPref = customPreferences[interestId];
    const defaultPref = (data.defaultUserPreference as any)?.[currentLang] || '';
    
    const storedSearch = customSearchStrategies[interestId];
    const defaultSearch = (data.searchStrategy as any)?.[currentLang] || '';
    
    const storedWriting = customWritingGuidelines[interestId];
    const defaultWriting = (data.writingGuideline as any)?.[currentLang] || '';
    
    setTempPref(storedPref !== undefined ? storedPref : defaultPref);
    setTempSearch(storedSearch !== undefined ? storedSearch : defaultSearch);
    setTempWriting(storedWriting !== undefined ? storedWriting : defaultWriting);
    
    setEditingInterestId(interestId);
  };

  const saveText = () => {
    if (editingInterestId) {
      setCustomPreference(editingInterestId, tempPref);
      
      updateProjectInput('customSearchStrategies', { 
        ...customSearchStrategies, 
        [editingInterestId]: tempSearch 
      });
      updateProjectInput('customWritingGuidelines', { 
        ...customWritingGuidelines, 
        [editingInterestId]: tempWriting 
      });
      
      if (!selectedInterests.includes(editingInterestId)) {
        toggleInterest(editingInterestId);
      }
      setEditingInterestId(null);
    }
  };

  const activeInterestIds = useMemo(() => {
    return INTEREST_DISPLAY_ORDER.filter(id => 
      INTEREST_DATA[id] &&
      !APPENDIX_ONLY_INTERESTS.includes(id) && 
      id !== 'ReisetypStrategie' &&
      !INTEREST_DATA[id].isSystem 
    );
  }, []);

  const appendixInterestIds = useMemo(() => {
    return APPENDIX_ONLY_INTERESTS.filter(id => 
        INTEREST_DATA[id] &&
        !INTEREST_DATA[id].isSystem
    );
  }, []);

  const renderTile = (id: string) => {
    const data = INTEREST_DATA[id];
    if (!data) return null; 

    const isSelected = selectedInterests.includes(id);
    const hasCustomPref = !!customPreferences[id];
    const hasCustomSearch = !!customSearchStrategies[id];
    const hasCustomWriting = !!customWritingGuidelines[id];
    const isModified = hasCustomPref || hasCustomSearch || hasCustomWriting;
    
    const tooltipText = (data.defaultUserPreference as any)?.[currentLang];
    const label = (data.label as any)?.[currentLang] || id;

    return (
      <div 
        key={id}
        onClick={() => toggleInterest(id)}
        title={tooltipText}
        className={`
          relative p-3.5 rounded-xl border transition-all cursor-pointer group flex items-center justify-between
          ${isSelected 
            ? 'bg-blue-50 border-blue-500 shadow-md ring-2 ring-blue-100' 
            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm hover:bg-slate-50'
          }
        `}
      >
        <div className="flex items-center gap-3">
          <div className={`
            p-2 rounded-lg transition-colors
            ${isSelected ? 'bg-blue-600 text-white shadow-sm' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'}
          `}>
            {renderIcon(id, "w-5 h-5")}
          </div>
          
          <div className="flex flex-col">
            <span className={`text-sm font-bold ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
              {label}
            </span>
            {isModified && (
              <span className="text-[10px] font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                <Edit3 className="w-3 h-3" /> {t('profile.manual_edit')}
              </span>
            )}
          </div>
        </div>
        
        <button
          onClick={(e) => openEditor(e, id)}
          className={`
            p-2 rounded-full transition-colors
            ${isModified ? 'text-amber-600 bg-amber-100 hover:bg-amber-200' : 'text-slate-300 hover:bg-slate-200 hover:text-slate-600'}
          `}
          title={t('actions.edit')}
        >
          <Info className="w-4 h-4" />
        </button>

        {isModified && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full border-2 border-white shadow-sm" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      
      {/* 1. AKTIVE INTERESSEN */}
      <section>
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-2">
            {t('interests.dayplan_activities')}
          </h3>
          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md shadow-sm border border-blue-200">
            {selectedInterests.filter(id => activeInterestIds.includes(id)).length} {t('interests.selected')}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeInterestIds.map(id => renderTile(id))}
        </div>
      </section>

      {/* 2. ZUSATZ-INFOS (ANHANG) */}
      <section className="pt-6 border-t border-slate-200">
        <div className="flex items-center gap-2 mb-4 px-1">
           <Info className="w-4 h-4 text-slate-400" />
           <h3 className="text-xs font-black text-slate-700 uppercase tracking-wide">
             {t('interests.appendix_infos')}
           </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {appendixInterestIds.map(id => renderTile(id))}
        </div>
      </section>

      {/* 3. QUALITÄTS-FILTER (SEARCH SETTINGS) */}
      {searchSettings && (
        <section className="bg-white border border-slate-200 rounded-xl p-6 mt-6 shadow-sm">
          <h3 className="text-sm font-black text-slate-800 mb-5 flex items-center gap-2 uppercase tracking-wide">
            <Settings2 className="w-5 h-5 text-blue-600" />
            {t('interests.searchSettings.title')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className={LABEL_CLASS}>
                <ListOrdered className="w-3.5 h-3.5 text-blue-500" /> {t('interests.searchSettings.count')}
              </label>
              <input 
                type="number"
                min={10}
                max={200}
                value={searchSettings.sightsCount}
                onChange={(e) => updateSearchSettings({ sightsCount: parseInt(e.target.value) })}
                className={INPUT_CLASS}
              />
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className={LABEL_CLASS}>
                <Star className="w-3.5 h-3.5 text-amber-500" /> {t('interests.searchSettings.rating')}
              </label>
              <div className="relative">
                <input 
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={searchSettings.minRating}
                  onChange={(e) => updateSearchSettings({ minRating: parseFloat(e.target.value) })}
                  className={`${INPUT_CLASS} pr-12`}
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">Stars</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
              <label className={LABEL_CLASS}>
                <Clock className="w-3.5 h-3.5 text-blue-500" /> {t('interests.searchSettings.duration')}
              </label>
              <div className="relative">
                <input 
                  type="number"
                  min={15}
                  step={15}
                  value={searchSettings.minDuration}
                  onChange={(e) => updateSearchSettings({ minDuration: parseInt(e.target.value) })}
                  className={`${INPUT_CLASS} pr-10`}
                />
                <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 pointer-events-none">Min</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- TRIPLE EDITOR MODAL --- */}
      {editingInterestId && INTEREST_DATA[editingInterestId] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                <div className="bg-blue-100 text-blue-600 p-1.5 rounded-lg shadow-sm">
                   {renderIcon(editingInterestId, "w-5 h-5")}
                </div>
                {(INTEREST_DATA[editingInterestId].label as any)[currentLang]} 
                <span className="text-slate-400 font-normal text-sm ml-1">{t('interests.modal_title')}</span>
              </h3>
              <button onClick={() => setEditingInterestId(null)} className="text-slate-400 hover:text-slate-700 bg-slate-200/50 p-2 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              <div>
                <label className="text-[10px] font-black text-blue-800 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{t('interests.pref_label')}</span>
                </label>
                <textarea
                  className="w-full h-24 bg-white border border-slate-300 shadow-inner rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 text-sm p-4 transition-all resize-y"
                  value={tempPref}
                  onChange={(e) => setTempPref(e.target.value)}
                  placeholder={t('interests.pref_placeholder')}
                />
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentLang === 'de' ? 'Such-Strategie' : 'Search Strategy'}</span>
                </label>
                <textarea
                  className="w-full h-28 bg-white border border-slate-300 shadow-inner rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/40 focus:border-slate-500 text-sm p-4 transition-all resize-y text-slate-600"
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                />
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 shadow-sm">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-wide block mb-2 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-slate-400" />
                  <span>{currentLang === 'de' ? 'Redaktions-Anweisung' : 'Editorial Instruction'}</span>
                </label>
                <textarea
                  className="w-full h-32 bg-white border border-slate-300 shadow-inner rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-500/40 focus:border-slate-500 text-sm p-4 transition-all resize-y text-slate-600"
                  value={tempWriting}
                  onChange={(e) => setTempWriting(e.target.value)}
                />
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100 flex-shrink-0">
              <button 
                onClick={() => setEditingInterestId(null)}
                className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-sm font-bold shadow-sm transition-colors"
              >
                {t('actions.cancel')}
              </button>
              <button 
                onClick={saveText}
                className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm font-bold shadow-md transition-colors"
              >
                {t('actions.save')}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
// --- END OF FILE 365 Zeilen ---