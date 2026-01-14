// src/features/cockpit/steps/ProfileStep.tsx
// 13.01.2026 17:45 - FIX: Corrected imports (STRATEGY_OPTIONS) and state access (removed phantom 'profile'/'config' objects).

import { useTranslation } from 'react-i18next';
import { useTripStore } from '../../../store/useTripStore';
import { STRATEGY_OPTIONS } from '../../../data/staticData'; // FIX: Renamed from STRATEGY_DEFINITIONS
import { Users, Calendar, Home, MapPin, FileText, Globe, Compass, Plane } from 'lucide-react';

export const ProfileStep = () => {
  const { t } = useTranslation();
  const { 
    project, 
    setTravelers, 
    setDates, 
    setLogistics,
    setRoundtripOptions,
    setNotes,
    setDestination,
    setStrategy,
    setArrival
  } = useTripStore();
  
  // FIX: Access flat properties from userInputs (no 'profile' or 'config' objects)
  // FIX: Map destination from logistics.stationary
  const { travelers, dates, logistics, notes, strategyId, selectedInterests } = project.userInputs;
  const destination = logistics.stationary.destination;
  
  // FIX: Use 'selectedInterests' instead of non-existent 'interests'
  const isRoadtrip = selectedInterests?.includes('logistics_roadtrip') ?? false;

  return (
    <div className="space-y-8 animate-fade-in-up pb-10">
      
      {/* 0. WOHIN & WIE? (Die wichtigste Frage) */}
      <section className="bg-blue-50 p-6 rounded-xl border border-blue-100 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-blue-900">
          <Compass className="w-5 h-5" />
          <h3 className="font-bold text-lg">{t('cockpit.destination_label', 'Reiseziel & Strategie')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Reiseziel */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {t('cockpit.destination_label')}
            </label>
            <input 
              type="text"
              autoFocus
              placeholder={t('cockpit.destination_placeholder')}
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full border-blue-300 rounded-md shadow-sm focus:border-blue-600 focus:ring-blue-600 text-lg p-2"
            />
          </div>

          {/* Strategie Dropdown */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">
              {t('interests.strategy')}
            </label>
            <select
              value={strategyId}
              onChange={(e) => setStrategy(e.target.value)}
              className="w-full border-blue-300 rounded-md shadow-sm focus:border-blue-600 focus:ring-blue-600 text-lg p-2 bg-white"
            >
              {/* FIX: Use STRATEGY_OPTIONS and cast to any if needed for generic iteration */}
              {Object.entries(STRATEGY_OPTIONS).map(([key, def]: [string, any]) => (
                <option key={key} value={key}>
                  {t(def.labelKey)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* 1. WER REIST? */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-blue-900">
          <Users className="w-5 h-5" />
          <h3 className="font-bold text-lg">{t('profile.group_title')}</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('profile.adults')}</label>
            <input 
              type="number" min="1"
              value={travelers.adults}
              onChange={(e) => setTravelers({ adults: parseInt(e.target.value) || 1 })}
              className="w-full border-slate-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('profile.children')}</label>
            <input 
              type="number" min="0"
              value={travelers.children}
              onChange={(e) => setTravelers({ children: parseInt(e.target.value) || 0 })}
              className="w-full border-slate-300 rounded-md shadow-sm"
            />
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('profile.group_type')}</label>
            <select
              value={travelers.groupType}
              onChange={(e) => setTravelers({ groupType: e.target.value as any })}
              className="w-full border-slate-300 rounded-md shadow-sm"
            >
              <option value="couple">Paar</option>
              <option value="family">Familie</option>
              <option value="friends">Freunde</option>
              <option value="solo">Alleinreisend</option>
              <option value="business">Geschäftlich</option>
              <option value="other">Andere</option>
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('profile.nationality')}</label>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={travelers.nationality}
                onChange={(e) => setTravelers({ nationality: e.target.value })}
                className="w-full border-slate-300 rounded-md shadow-sm"
              />
            </div>
          </div>
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{t('profile.origin')}</label>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={travelers.origin}
                onChange={(e) => setTravelers({ origin: e.target.value })}
                className="w-full border-slate-300 rounded-md shadow-sm"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. WANN & WIE HIN? (Update mit Anreise) */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-blue-900">
          <Calendar className="w-5 h-5" />
          <h3 className="font-bold text-lg">{t('profile.dates_title')}</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-600 mb-1">{t('profile.start_date')}</label>
              <input 
                type="date"
                value={dates.start}
                onChange={(e) => setDates({ start: e.target.value })}
                className="w-full border-slate-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-600 mb-1">{t('profile.end_date')}</label>
              <input 
                type="date"
                value={dates.end}
                onChange={(e) => setDates({ end: e.target.value })}
                className="w-full border-slate-300 rounded-md shadow-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">{t('profile.fixed_dates')}</label>
            <textarea 
              rows={3}
              value={dates.fixedDates}
              onChange={(e) => setDates({ fixedDates: e.target.value })}
              className="w-full border-slate-300 rounded-md shadow-sm text-sm"
            />
          </div>
        </div>

        {/* NEU: Anreise-Details */}
        <div className="pt-4 border-t border-slate-100">
           <div className="flex items-center gap-2 mb-3 text-slate-800">
             <Plane className="w-4 h-4" />
             <span className="font-bold text-sm">{t('profile.arrival_title', 'Anreise-Details')}</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Verkehrsmittel</label>
                <select 
                  value={dates.arrival?.type} 
                  onChange={(e) => setArrival({ type: e.target.value as any })}
                  className="w-full border-slate-300 rounded-md shadow-sm text-sm"
                >
                  <option value="car">Auto</option>
                  <option value="train">Bahn</option>
                  <option value="plane">Flugzeug</option>
                  <option value="other">Sonstiges</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Ankunftszeit (ca.)</label>
                <input 
                  type="time" 
                  value={dates.arrival?.time}
                  onChange={(e) => setArrival({ time: e.target.value })}
                  className="w-full border-slate-300 rounded-md shadow-sm text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Details (Flugnr, etc.)</label>
                <input 
                  type="text" 
                  value={dates.arrival?.description}
                  onChange={(e) => setArrival({ description: e.target.value })}
                  className="w-full border-slate-300 rounded-md shadow-sm text-sm"
                />
              </div>
           </div>
        </div>
      </section>

      {/* 3. LOGISTIK */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-blue-900">
          <Home className="w-5 h-5" />
          <h3 className="font-bold text-lg">{t('profile.logistics_title')}</h3>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">{t('profile.accommodation_question')}</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="accStatus"
                  checked={logistics.accommodationStatus === 'needs_suggestions'}
                  onChange={() => setLogistics({ accommodationStatus: 'needs_suggestions' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>{t('profile.accommodation_no')}</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="accStatus"
                  checked={logistics.accommodationStatus === 'booked'}
                  onChange={() => setLogistics({ accommodationStatus: 'booked' })}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span>{t('profile.accommodation_yes')}</span>
              </label>
            </div>
          </div>

          {isRoadtrip && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-fade-in">
              <h4 className="font-bold text-blue-900 mb-3 text-sm uppercase">{t('profile.roundtrip_options')}</h4>
              
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {t('profile.waypoints')}
                </label>
                <input 
                  type="text"
                  placeholder="z.B. Venedig, Florenz, Rom"
                  value={logistics.roundtripOptions?.waypoints || ''}
                  onChange={(e) => setRoundtripOptions({ waypoints: e.target.value })}
                  className="w-full border-blue-200 rounded-md focus:border-blue-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="strictRoute"
                  checked={logistics.roundtripOptions?.strictRoute || false}
                  onChange={(e) => setRoundtripOptions({ strictRoute: e.target.checked })}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="strictRoute" className="text-sm text-slate-700">
                  {t('profile.strict_route')}
                </label>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* 4. SONSTIGES */}
      <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-blue-900">
          <FileText className="w-5 h-5" />
          <h3 className="font-bold text-lg">{t('profile.notes_title')}</h3>
        </div>
        
        <textarea 
          rows={4}
          placeholder={t('profile.notes_placeholder')}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="w-full border-slate-300 rounded-md shadow-sm"
        />
      </section>
    </div>
  );
};
// --- END OF FILE 253 Zeilen ---