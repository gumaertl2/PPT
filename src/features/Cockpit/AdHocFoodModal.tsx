// 04.02.2026 21:30 - FIX: STRICT COUNTRY SELECTION & LINT.
// - Replaced text input with <select> dropdown.
// - Removed unused 'Star' import.
// src/features/Cockpit/AdHocFoodModal.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { MapPin, ChefHat, X, Globe, Navigation, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
// FIX: Import Config to get available keys
import { countryGuideConfig } from '../../data/countries';

interface AdHocFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdHocFoodModal: React.FC<AdHocFoodModalProps> = ({ isOpen, onClose }) => {
  const { triggerAiTask, addNotification, dismissNotification, project } = useTripStore();
  const { t } = useTranslation();
  
  const [location, setLocation] = useState('');
  const [country, setCountry] = useState('');
  const [radius, setRadius] = useState(20);
  const [mode, setMode] = useState<'standard' | 'stars'>('standard');

  // 1. Extract Available Countries from Config (Sorted)
  const availableCountries = useMemo(() => {
      return Object.keys(countryGuideConfig).sort();
  }, []);

  // Pre-fill
  useEffect(() => {
    if (isOpen) {
      const logistics = project.userInputs?.logistics;
      
      // Location
      if (logistics?.mode === 'stationaer' && logistics.stationary?.destination) {
        setLocation(logistics.stationary.destination);
      } else if (logistics?.mode === 'roundtrip' && logistics.roundtrip?.startLocation) {
        setLocation(logistics.roundtrip.startLocation);
      } else {
        setLocation('');
      }

      // Country (Auto-Select if matches)
      const targetCountry = (logistics as any)?.target_countries?.[0]; 
      if (targetCountry && countryGuideConfig[targetCountry]) {
          setCountry(targetCountry); // Only set if strictly valid
      } else {
          setCountry(''); 
      }
    }
  }, [isOpen, project]);

  if (!isOpen) return null;

  const handleSearch = async () => {
    if (!location.trim()) return;

    // Format: ADHOC_SEARCH|LOC:München|COUNTRY:Deutschland|RAD:20|MODE:stars
    const feedbackString = `ADHOC_SEARCH|LOC:${location}|COUNTRY:${country}|RAD:${radius}|MODE:${mode}`;

    onClose();

    const loadingId = addNotification({
        type: 'loading',
        message: `${t('adhoc_food.title')}: ${t('status.analyzing')}`,
        autoClose: false
    });

    try {
        await triggerAiTask('foodScout', feedbackString);

        dismissNotification(loadingId);
        addNotification({
            type: 'success',
            message: t('status.success'),
            autoClose: 3000
        });

    } catch (error) {
        console.error("Ad-Hoc Search Failed:", error);
        dismissNotification(loadingId);
        addNotification({
            type: 'error',
            message: t('status.error'),
            autoClose: 5000
        });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 transform transition-all scale-100">
        
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <ChefHat className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white leading-none">{t('adhoc_food.title')}</h3>
              <p className="text-emerald-100 text-xs mt-1">{t('adhoc_food.subtitle')}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          
          {/* 1. Location Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              {t('adhoc_food.label_location')}
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('adhoc_food.placeholder_location')}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-800 dark:text-slate-200 placeholder:text-slate-400 font-medium"
              autoFocus
            />
          </div>

          {/* 2. Country Select (FIX: Dropdown from Config) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              {t('adhoc_food.label_country')}
            </label>
            <div className="relative">
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-800 dark:text-slate-200 font-medium appearance-none cursor-pointer"
                >
                  <option value="" disabled>-- {t('sights.select')} --</option>
                  {availableCountries.map((c) => (
                      <option key={c} value={c}>
                          {c}
                      </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <p className="text-[10px] text-slate-400 px-1">
                {t('adhoc_food.hint_country')}
            </p>
          </div>

          {/* 3. Radius Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-emerald-600" />
                {t('adhoc_food.label_radius')}
              </label>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-md border border-emerald-100 dark:border-emerald-800">
                {radius} km
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1">
              <span>{t('adhoc_food.walk')}</span>
              <span>{t('adhoc_food.drive')}</span>
            </div>
          </div>

          {/* 4. Mode Selection */}
          <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded-xl flex border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setMode('standard')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                mode === 'standard'
                  ? 'bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-400 shadow-sm border border-slate-100 dark:border-slate-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t('adhoc_food.mode_standard_title')} 💎
            </button>
            <button
              onClick={() => setMode('stars')}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-lg transition-all ${
                mode === 'stars'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-sm border border-slate-100 dark:border-slate-600'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {t('adhoc_food.mode_stars_title')} ⭐️
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            {t('adhoc_food.btn_cancel')}
          </button>
          <button
            onClick={handleSearch}
            disabled={!location.trim() || !country}
            className={`px-6 py-2 text-sm font-bold text-white rounded-lg shadow-md transition-all flex items-center gap-2 ${
                (!location.trim() || !country)
                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed' 
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 hover:shadow-lg transform hover:-translate-y-0.5'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            {t('adhoc_food.btn_search')}
          </button>
        </div>
      </div>
    </div>
  );
};
// --- END OF FILE 145 Zeilen ---