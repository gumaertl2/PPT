// 27.01.2026 18:15 - FIX: Removed GPS Logic (Cleanup).
// Location: src/features/Cockpit/AdHocFoodModal.tsx
// Pure text-based location search.

import React, { useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { MapPin, ChefHat, Star, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AdHocFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdHocFoodModal: React.FC<AdHocFoodModalProps> = ({ isOpen, onClose }) => {
  const { triggerAiTask } = useTripStore();
  const { t } = useTranslation();
  
  // State
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState(10);
  const [mode, setMode] = useState<'standard' | 'stars'>('standard');

  if (!isOpen) return null;

  const handleSearch = () => {
    // Command String for Preparer
    // Format: ADHOC_SEARCH|LOC:Name|RAD:10|MODE:stars
    const locString = location || 'Umgebung';
    const feedbackString = `ADHOC_SEARCH|LOC:${locString}|RAD:${radius}|MODE:${mode}`;

    // Trigger Task
    triggerAiTask('foodScout', feedbackString);

    // Close & Reset
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-lg border border-slate-200 dark:border-slate-700 flex flex-col max-h-[90vh] scale-100 animate-in zoom-in-95 duration-200">
        
        {/* HEADER */}
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10 rounded-t-2xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ChefHat className="w-6 h-6 text-emerald-600" />
              {t('adhoc_food.title')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {t('adhoc_food.subtitle')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 space-y-6 overflow-y-auto">
          
          {/* 1. LOCATION */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('adhoc_food.label_location')}
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={t('adhoc_food.placeholder_location')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* 2. RADIUS */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('adhoc_food.label_radius')}</label>
              <span className="text-sm font-bold text-emerald-600">{radius} km</span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
            <div className="flex justify-between text-xs text-slate-400">
              <span>{t('adhoc_food.walk')}</span>
              <span>{t('adhoc_food.drive')}</span>
            </div>
          </div>

          {/* 3. MODE */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('adhoc_food.label_mode')}
            </label>
            <div className="grid grid-cols-2 gap-4">
              {/* Option Standard */}
              <button
                onClick={() => setMode('standard')}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                  mode === 'standard'
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 ring-1 ring-emerald-500'
                    : 'border-slate-200 dark:border-slate-700 hover:border-emerald-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ChefHat className={`w-5 h-5 ${mode === 'standard' ? 'text-emerald-600' : 'text-slate-400'}`} />
                  <span className={`font-semibold ${mode === 'standard' ? 'text-emerald-900 dark:text-emerald-400' : 'text-slate-600'}`}>
                    {t('adhoc_food.mode_standard_title')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('adhoc_food.mode_standard_desc')}
                </p>
                {mode === 'standard' && (
                  <div className="absolute top-3 right-3 w-3 h-3 bg-emerald-500 rounded-full" />
                )}
              </button>

              {/* Option Stars */}
              <button
                onClick={() => setMode('stars')}
                className={`p-4 rounded-xl border-2 text-left transition-all relative ${
                  mode === 'stars'
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-400'
                    : 'border-slate-200 dark:border-slate-700 hover:border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star className={`w-5 h-5 ${mode === 'stars' ? 'text-amber-500 fill-amber-500' : 'text-slate-400'}`} />
                  <span className={`font-semibold ${mode === 'stars' ? 'text-amber-900 dark:text-amber-400' : 'text-slate-600'}`}>
                    {t('adhoc_food.mode_stars_title')}
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t('adhoc_food.mode_stars_desc')}
                </p>
                {mode === 'stars' && (
                  <div className="absolute top-3 right-3 w-3 h-3 bg-amber-400 rounded-full" />
                )}
              </button>
            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            {t('adhoc_food.btn_cancel')}
          </button>
          <button
            onClick={handleSearch}
            disabled={!location}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
          >
            {t('adhoc_food.btn_search')}
          </button>
        </div>

      </div>
    </div>
  );
};
// --- END OF FILE 115 Zeilen ---