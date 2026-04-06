// 06.04.2026 12:00 - UX: Replaced gear buttons with sleek pen icon (✏️ Edit3) for better affordance. Unified text wording to "Anpassen" via i18n and removed 'X' from modal header.
// 22.03.2026 09:00 - UX: Applied "Deep Input" UX logic.
// src/features/Cockpit/steps/TravelerStep.tsx

import React, { useState } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  Users, 
  Home, 
  Baby, 
  Map, 
  Sparkles, 
  Wallet, 
  Gauge, 
  Edit3, 
  Flag,
  Heart,
  Briefcase,
  Coffee
} from 'lucide-react';
import { 
  STRATEGY_OPTIONS, 
  VIBE_OPTIONS, 
  BUDGET_OPTIONS, 
  PACE_OPTIONS 
} from '../../../data/staticData';
import type { LanguageCode } from '../../../core/types';

export const TravelerStep = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const { 
    project, 
    setTravelers, 
    setConfig, 
    setCustomPreference 
  } = useTripStore();

  const { userInputs } = project;
  const { travelers, pace, budget, vibe, strategyId, customPreferences } = userInputs;

  const LABEL_CLASS = "text-[10px] font-black text-blue-800/80 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5";
  const INPUT_CLASS = "w-full text-sm bg-white border border-slate-300 shadow-inner rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-blue-400 transition-all placeholder:text-slate-300";

  const [editConfig, setEditConfig] = useState<{
    key: 'strategyId' | 'vibe' | 'budget' | 'pace';
    title: string;
    optionId: string;
    optionLabel: string;
    currentText: string;
  } | null>(null);

  const getSpecificKey = (key: string, optionId: string) => `saved_${key}_${optionId}`;
  const getGlobalKey = (key: string) => `cat_${key}`;

  const openEditor = (
    e: React.MouseEvent, 
    key: 'strategyId' | 'vibe' | 'budget' | 'pace',
    optionId: string,
    label: string,
    defaultText: string
  ) => {
    e.stopPropagation(); 
    
    const specificKey = getSpecificKey(key, optionId);
    const specificText = customPreferences[specificKey];

    const storedText = specificText !== undefined ? specificText : defaultText;

    setEditConfig({
      key,
      title: label,
      optionId,
      optionLabel: label,
      currentText: storedText
    });
  };

  const handleSave = () => {
    if (editConfig) {
      const { key, optionId, currentText } = editConfig;
      
      const specificKey = getSpecificKey(key, optionId);
      setCustomPreference(specificKey, currentText);

      const currentSelection = userInputs[key]; 
      if (currentSelection === optionId) {
         setCustomPreference(getGlobalKey(key), currentText);
      }

      setEditConfig(null);
    }
  };

  const handleSelectOption = (
    key: 'strategyId' | 'vibe' | 'budget' | 'pace',
    optionId: string
  ) => {
    setConfig(key, optionId);

    const specificKey = getSpecificKey(key, optionId);
    const savedTextForNewOption = customPreferences[specificKey];

    if (savedTextForNewOption) {
      setCustomPreference(getGlobalKey(key), savedTextForNewOption);
    } else {
      setCustomPreference(getGlobalKey(key), ''); 
    }
  };

  const getCategoryColors = (key: 'strategyId' | 'vibe' | 'budget' | 'pace') => {
    switch(key) {
      case 'vibe': return { activeBorder: 'border-amber-500', activeBg: 'bg-amber-50', activeText: 'text-amber-700', ring: 'ring-amber-500' };
      case 'budget': return { activeBorder: 'border-green-600', activeBg: 'bg-green-50', activeText: 'text-green-800', ring: 'ring-green-600' };
      case 'pace': return { activeBorder: 'border-purple-500', activeBg: 'bg-purple-50', activeText: 'text-purple-800', ring: 'ring-purple-500' };
      default: return { activeBorder: 'border-blue-500', activeBg: 'bg-blue-50', activeText: 'text-blue-700', ring: 'ring-blue-500' };
    }
  };

  const renderOptionGrid = (
    key: 'strategyId' | 'vibe' | 'budget' | 'pace',
    options: Record<string, any>,
    currentValue: string,
    title: string,
    Icon: any,
    iconColor: string
  ) => {
    const colors = getCategoryColors(key);

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm mb-4">
        <h3 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2 tracking-wide mb-1">
          <Icon className={`w-4 h-4 ${iconColor}`} /> {title}
        </h3>
        {/* Unified helper text */}
        <p className="text-[10px] text-slate-500 mb-4 ml-6Leading-relaxed">{t('wizard.customizer.hint_text', { defaultValue: 'Wähle eine Vorgabe oder passe den Text zu 100 % an deine Wünsche an.' })}</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Object.values(options).map((opt: any) => {
            const isActive = currentValue === opt.id;
            
            const textForEditor = opt.promptInstruction?.[currentLang] || opt.description?.[currentLang] || '';
            const specificKey = getSpecificKey(key, opt.id);
            const hasSavedTextForThisOption = !!customPreferences[specificKey];

            return (
              <div
                key={opt.id}
                onClick={() => handleSelectOption(key, opt.id)}
                className={`relative p-3.5 rounded-xl border cursor-pointer transition-all group flex flex-col justify-center min-h-[56px] gap-2 ${
                  isActive 
                    ? `${colors.activeBorder} ${colors.activeBg} shadow-md ring-1 ${colors.ring}` 
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50 hover:shadow-sm'
                }`}
                title={textForEditor}
              >
                <div className="flex items-center justify-between w-full gap-2">
                  <span className={`text-sm font-bold ${isActive ? colors.activeText : 'text-slate-700'}`}>
                    {opt.label[currentLang]}
                  </span>
                  
                  {/* Sleek Pen Icon Button */}
                  <button
                    onClick={(e) => openEditor(e, key, opt.id, opt.label[currentLang], textForEditor)}
                    className={`p-1.5 rounded-md border transition-colors z-10
                      ${hasSavedTextForThisOption
                        ? 'text-amber-700 bg-amber-100 border-amber-200 shadow-inner' 
                        : 'text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200 hover:text-slate-700' 
                      }
                    `}
                    title={hasSavedTextForThisOption ? t('wizard.customizer.tooltip_customized') : t('wizard.customizer.tooltip_customize')}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const groupTypes = [
      { id: 'couple', icon: Heart, label: t('profile.group_couple') },
      { id: 'family', icon: Users, label: t('profile.group_family') },
      { id: 'friends', icon: Coffee, label: t('profile.group_friends') },
      { id: 'other', icon: Briefcase, label: t('profile.group_other') }
  ];

  return (
    <div className="space-y-6 animate-fade-in relative">
      
      {/* 1. REISENDE & HEIMATORT */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Linke Spalte: Zahlen */}
        <div>
           <h3 className="text-xs font-bold text-slate-700 uppercase mb-4 flex items-center gap-2 tracking-wide">
             <Users className="w-4 h-4 text-blue-500" /> {t('cockpit.travelers_label', { defaultValue: 'Reisende' })}
           </h3>
           
           <div className="flex gap-4 mb-5">
             <div className="flex-1">
               <label className={LABEL_CLASS}>{t('profile.adults')}</label>
               <input 
                 type="number" 
                 min="1"
                 className={INPUT_CLASS}
                 value={travelers.adults}
                 onChange={(e) => setTravelers({ adults: parseInt(e.target.value) || 1 })}
               />
             </div>
             <div className="flex-1">
               <label className={LABEL_CLASS}>{t('profile.children')}</label>
               <input 
                 type="number" 
                 min="0"
                 className={INPUT_CLASS}
                 value={travelers.children}
                 onChange={(e) => setTravelers({ children: parseInt(e.target.value) || 0 })}
               />
             </div>
           </div>
           
           {/* REISENDE NAMEN (Reisekasse) */}
           <div className="mt-4 animate-fade-in">
              <label className={LABEL_CLASS}>
                 {t('profile.traveler_names', { defaultValue: 'Namen der Reisenden' })}
              </label>
              <input 
                type="text" 
                placeholder="z.B. Anna, Ben, Charlie"
                className={INPUT_CLASS}
                value={travelers.travelerNames || ''}
                onChange={(e) => setTravelers({ travelerNames: e.target.value })}
              />
              <p className="text-[9px] text-slate-400 mt-1.5 font-medium px-1">Tipp: Namen durch Komma trennen, um Ausgaben später in der Reisekasse aufteilen zu können.</p>
           </div>
           
           {travelers.children > 0 && (
             <div className="mt-4 animate-fade-in">
               <label className={LABEL_CLASS}>
                 <Baby className="w-3.5 h-3.5 text-blue-400" /> {t('profile.age_children')}
               </label>
               <input 
                 type="text" 
                 placeholder="z.B. 4, 7, 12"
                 className={INPUT_CLASS}
                 value={travelers.ages || ''}
                 onChange={(e) => setTravelers({ ages: e.target.value })}
               />
             </div>
           )}
        </div>

        {/* Rechte Spalte: Gruppe & Heimat */}
        <div>
           {/* GRUPPEN-TYP */}
           <div className="mb-6">
               <label className={LABEL_CLASS}>{t('profile.group_title')}</label>
               <div className="flex flex-wrap gap-2">
                   {groupTypes.map(type => (
                       <button
                           key={type.id}
                           onClick={() => setTravelers({ groupType: type.id as any })}
                           className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold border transition-all ${
                               travelers.groupType === type.id 
                               ? 'bg-blue-600 border-blue-600 text-white shadow-md ring-2 ring-blue-200' 
                               : 'bg-white border-slate-200 text-slate-600 hover:bg-blue-50 hover:border-blue-200'
                           }`}
                       >
                           <type.icon className="w-3.5 h-3.5" />
                           {type.label}
                       </button>
                   ))}
               </div>
           </div>

           <div className="flex gap-4">
              <div className="flex-1">
                <label className={LABEL_CLASS}>
                   <Home className="w-3.5 h-3.5 text-blue-400" /> {t('profile.origin')}
                </label>
                <input 
                  type="text"
                  placeholder="z.B. Berlin"
                  className={INPUT_CLASS}
                  value={travelers.origin}
                  onChange={(e) => setTravelers({ origin: e.target.value })}
                />
              </div>
              <div className="flex-1">
                <label className={LABEL_CLASS}>
                   <Flag className="w-3.5 h-3.5 text-blue-400" /> {t('profile.nationality')}
                </label>
                <input 
                  type="text"
                  placeholder="z.B. Deutsch"
                  className={INPUT_CLASS}
                  value={travelers.nationality || ''}
                  onChange={(e) => setTravelers({ nationality: e.target.value })}
                />
              </div>
           </div>
           <p className="text-[10px] text-slate-400 mt-2 font-medium px-1">
             {t('profile.origin_hint')}
           </p>
        </div>
      </div>

      {/* 2. OPTIONEN */}
      {renderOptionGrid('strategyId', STRATEGY_OPTIONS, strategyId, t('profile.options_strategy'), Map, "text-blue-500")}
      {renderOptionGrid('vibe', VIBE_OPTIONS, vibe, t('profile.options_vibe'), Sparkles, "text-amber-500")}
      {renderOptionGrid('budget', BUDGET_OPTIONS, budget, t('profile.options_budget'), Wallet, "text-green-600")}
      {renderOptionGrid('pace', PACE_OPTIONS, pace, t('profile.options_pace'), Gauge, "text-purple-500")}

      {/* --- EDITOR MODAL --- */}
      {editConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up flex flex-col">
            
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span className={
                    editConfig.key === 'vibe' ? 'text-amber-500' :
                    editConfig.key === 'budget' ? 'text-green-600' :
                    editConfig.key === 'pace' ? 'text-purple-500' : 'text-blue-600'
                }>
                    {editConfig.optionLabel}
                </span> 
                <span className="text-slate-400 font-normal text-sm ml-1 px-2 py-0.5 border border-slate-200 bg-white rounded-md">
                   {t('wizard.customizer.modal_title', { defaultValue: 'Passe den Text gerne individuell an' })}
                </span>
              </h3>
              {/* REMOVED 'X' from header as per UX suggestion */}
            </div>
            
            <div className="p-6">
              <label className="text-[10px] font-black text-blue-800 uppercase tracking-wide block mb-2">{t('profile.prompt_meaning')}</label>
              <textarea 
                className="w-full h-40 p-4 text-sm bg-white border border-slate-300 shadow-inner rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 leading-relaxed resize-y"
                value={editConfig.currentText}
                onChange={(e) => setEditConfig({...editConfig, currentText: e.target.value})}
              />
              <p className="text-[10px] text-slate-400 mt-3">{t('profile.prompt_hint')}</p>
            </div>

            <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setEditConfig(null)} className="px-5 py-2.5 text-slate-600 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl text-sm font-bold shadow-sm transition-colors">{t('actions.cancel')}</button>
              <button onClick={handleSave} className="px-5 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl text-sm font-bold shadow-md transition-colors">{t('actions.save')}</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
// --- END OF FILE 371 Zeilen ---