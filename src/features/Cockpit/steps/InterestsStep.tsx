// 18.01.2026 12:50 - THINKING-FIX: Verified 365 lines. Resolved lang ReferenceError. Full Triple-Editor logic.
// src/features/cockpit/steps/InterestsStep.tsx
// 14.01.2026 12:15 - FIX: Removed unused 'isAppendix' parameter to fix lint error.
// 18.01.2026 14:10 - FIX: ReferenceError 'lang' fixed to 'currentLang'. Full strategy integration.

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

  // --- LOCAL STATE FOR EDITOR ---
  const [editingInterestId, setEditingInterestId] = useState<string | null>(null);
  const [tempPref, setTempPref] = useState(''); 
  const [tempSearch, setTempSearch] = useState(''); 
  const [tempWriting, setTempWriting] = useState(''); 

  // --- HELPER ---

  const renderIcon = (id: string, className: string) => {
    const rawName = ICONS[id];
    const iconName = rawName 
      ? (rawName.charAt(0).toUpperCase() + rawName.slice(1)) 
      : 'HelpCircle';
    
    const LucideIcon = (Icons as any)[iconName];
    if (!LucideIcon) return <Icons.Circle className={className} />;
    return <LucideIcon className={className} />;
  };

  const openEditor = (e: React.MouseEvent, interestId: string) => {
    e.stopPropagation(); 
    
    const storedPref = customPreferences[interestId];
    const defaultPref = INTEREST_DATA[interestId]?.defaultUserPreference?.[currentLang] || '';
    
    const storedSearch = customSearchStrategies[interestId];
    const defaultSearch = INTEREST_DATA[interestId]?.searchStrategy?.[currentLang] || '';
    
    const storedWriting = customWritingGuidelines[interestId];
    const defaultWriting = INTEREST_DATA[interestId]?.writingGuideline?.[currentLang] || '';
    
    setTempPref(storedPref !== undefined ? storedPref : defaultPref);
    setTempSearch(storedSearch !== undefined ? storedSearch : defaultSearch);
    setTempWriting(storedWriting !== undefined ? storedWriting : defaultWriting);
    
    setEditingInterestId(interestId);
  };

  const saveText = () => {
    if (editingInterestId) {
      // 1. Vorliebe speichern (Standard)
      setCustomPreference(editingInterestId, tempPref);
      
      // 2. Such-Strategie & Redaktion in die neuen Store-Felder
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

  // --- FILTER LOGIC ---
  const activeInterestIds = useMemo(() => {
    return INTEREST_DISPLAY_ORDER.filter(id => 
      !APPENDIX_ONLY_INTERESTS.includes(id) && 
      id !== 'ReisetypStrategie' &&
      !INTEREST_DATA[id]?.isSystem 
    );
  }, []);

  const appendixInterestIds = useMemo(() => {
    return APPENDIX_ONLY_INTERESTS.filter(id => !INTEREST_DATA[id]?.isSystem);
  }, []);

  const renderTile = (id: string) => {
    const isSelected = selectedInterests.includes(id);
    const hasCustomPref = !!customPreferences[id];
    const hasCustomSearch = !!customSearchStrategies[id];
    const hasCustomWriting = !!customWritingGuidelines[id];
    const isModified = hasCustomPref || hasCustomSearch || hasCustomWriting;
    
    // Tooltip Content: defaultUserPreference
    const tooltipText = INTEREST_DATA[id]?.defaultUserPreference?.[currentLang];

    return (
      <div 
        key={id}
        onClick={() => toggleInterest(id)}
        // HIER: Native Tooltips (title)
        title={tooltipText}
        className={`
          relative p-3 rounded-xl border transition-all cursor-pointer group
          ${isSelected 
            ? 'bg-blue-50 border-blue-500 shadow-sm ring-1 ring-blue-200' 
            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
          }
        `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`
              p-2 rounded-lg transition-colors
              ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-blue-50 group-hover:text-blue-500'}
            `}>
              {renderIcon(id, "w-5 h-5")}
            </div>
            
            <div className="flex flex-col">
              <span className={`text-sm font-medium ${isSelected ? 'text-blue-800' : 'text-slate-700'}`}>
                {INTEREST_DATA[id].label[currentLang]}
              </span>
              {isModified && (
                <span className="text-[10px] text-blue-600 flex items-center gap-1">
                  <Edit3 className="w-3 h-3" /> {t('profile.manual_edit')}
                </span>
              )}
            </div>
          </div>
          
          <button
            onClick={(e) => openEditor(e, id)}
            className={`
              p-1.5 rounded-full hover:bg-slate-200 transition-colors
              ${isModified ? 'text-amber-500 bg-amber-50' : 'text-slate-300'}
            `}
            title={t('actions.edit')}
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {isModified && (
          <div className="absolute top-[-4px] right-[-4px] w-2.5 h-2.5 bg-amber-500 rounded-full border border-white" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-8 animate-fade-in relative">
      
      {/* 1. AKTIVE INTERESSEN */}
      <section>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
            {t('interests.dayplan_activities')}
          </h3>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
            {selectedInterests.filter(id => activeInterestIds.includes(id)).length} {t('interests.selected')}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {activeInterestIds.map(id => renderTile(id))}
        </div>
      </section>

      {/* 2. ZUSATZ-INFOS (ANHANG) */}
      <section className="pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3 px-1">
           <Info className="w-3 h-3 text-slate-400" />
           <h3 className="text-xs font-bold text-slate-500 uppercase">
             {t('interests.appendix_infos')}
           </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {appendixInterestIds.map(id => renderTile(id))}
        </div>
      </section>

      {/* 3. QUALITÄTS-FILTER (SEARCH SETTINGS) */}
      {searchSettings && (
        <section className="bg-slate-50 border border-slate-200 rounded-xl p-5 mt-6">
          <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2 uppercase tracking-wide">
            <Settings2 className="w-4 h-4 text-blue-600" />
            {t('interests.searchSettings.title')}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Anzahl */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                <ListOrdered className="w-3 h-3" /> {t('interests.searchSettings.count')}
              </label>
              <input 
                type="number"
                min={10}
                max={200}
                value={searchSettings.sightsCount}
                onChange={(e) => updateSearchSettings({ sightsCount: parseInt(e.target.value) })}
                className="w-full text-lg font-bold text-slate-700 border-0 border-b-2 border-slate-200 focus:border-blue-500 focus:ring-0 px-0 py-1 bg-transparent"
              />
            </div>

            {/* Rating */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500" /> {t('interests.searchSettings.rating')}
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={searchSettings.minRating}
                  onChange={(e) => updateSearchSettings({ minRating: parseFloat(e.target.value) })}
                  className="w-full text-lg font-bold text-slate-700 border-0 border-b-2 border-slate-200 focus:border-blue-500 focus:ring-0 px-0 py-1 bg-transparent"
                />
                <span className="text-sm text-slate-400">Stars</span>
              </div>
            </div>

            {/* Dauer */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-blue-500" /> {t('interests.searchSettings.duration')}
              </label>
              <div className="flex items-center gap-2">
                <input 
                  type="number"
                  min={15}
                  step={15}
                  value={searchSettings.minDuration}
                  onChange={(e) => updateSearchSettings({ minDuration: parseInt(e.target.value) })}
                  className="w-full text-lg font-bold text-slate-700 border-0 border-b-2 border-slate-200 focus:border-blue-500 focus:ring-0 px-0 py-1 bg-transparent"
                />
                <span className="text-sm text-slate-400">Min</span>
              </div>
            </div>

          </div>
        </section>
      )}

      {/* --- TRIPLE EDITOR MODAL --- */}
      {editingInterestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
            
            <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50 flex-shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                {renderIcon(editingInterestId, "w-4 h-4 text-blue-600")}
                {INTEREST_DATA[editingInterestId].label[currentLang]} <span className="text-slate-400 font-normal text-sm">{t('interests.modal_title')}</span>
              </h3>
              <button onClick={() => setEditingInterestId(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              
              {/* Ebene 1: Vorliebe */}
              <div>
                <label className="text-xs font-bold text-slate-700 uppercase block mb-2 flex items-center gap-2">
                  <MessageSquare className="w-3 h-3 text-blue-500" />
                  <span>{t('interests.pref_label')}</span>
                </label>
                <textarea
                  className="w-full h-24 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm p-3 bg-white shadow-sm"
                  value={tempPref}
                  onChange={(e) => setTempPref(e.target.value)}
                  placeholder={t('interests.pref_placeholder')}
                />
              </div>

              {/* Ebene 2: Such-Strategie */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <label className="text-xs font-bold text-slate-600 uppercase block mb-2 flex items-center gap-2">
                  <Search className="w-3 h-3 text-slate-400" />
                  <span>{currentLang === 'de' ? 'Such-Strategie' : 'Search Strategy'}</span>
                </label>
                <textarea
                  className="w-full h-28 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm p-3 text-slate-600 bg-white"
                  value={tempSearch}
                  onChange={(e) => setTempSearch(e.target.value)}
                />
              </div>

              {/* Ebene 3: Redaktions-Anweisung */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                <label className="text-xs font-bold text-slate-600 uppercase block mb-2 flex items-center gap-2">
                  <PenTool className="w-3 h-3 text-slate-400" />
                  <span>{currentLang === 'de' ? 'Redaktions-Anweisung' : 'Editorial Instruction'}</span>
                </label>
                <textarea
                  className="w-full h-32 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm p-3 text-slate-600 bg-white"
                  value={tempWriting}
                  onChange={(e) => setTempWriting(e.target.value)}
                />
              </div>

            </div>

            <div className="px-5 py-3 bg-slate-50 flex justify-end gap-3 border-t border-slate-100 flex-shrink-0">
              <button 
                onClick={() => setEditingInterestId(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg text-sm font-medium"
              >
                {t('actions.cancel')}
              </button>
              <button 
                onClick={saveText}
                className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm"
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