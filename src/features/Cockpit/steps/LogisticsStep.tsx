// src/features/cockpit/steps/LogisticsStep.tsx
// 08.01.2026 14:58
/**
 * src/features/cockpit/steps/LogisticsStep.tsx
 * SCHRITT 1: REISE-COCKPIT
 * UPDATE: 
 * - Zeiten & Anreise nach oben verschoben.
 * - Auto-Fill der Constraints basierend auf Reisedauer (Smart Defaults).
 * - Neues Feld für stationäre Ausflugs-Fahrzeit.
 */

import React, { useEffect } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Car,
  Compass
} from 'lucide-react';
import { LOGISTIC_OPTIONS } from '../../../data/staticData';
import { 
  DEFAULT_MOBILE_MAX_DRIVE_TIME_LEG,
  DEFAULT_MOBILE_TOTAL_DRIVE_FACTOR,
  DEFAULT_MOBILE_TOTAL_DRIVE_OFFSET,
  DEFAULT_MOBILE_HOTEL_CHANGE_DIVISOR,
  DEFAULT_STATIONARY_MAX_DRIVE_TIME_DAY
} from '../../../data/constants';
import type { LanguageCode } from '../../../core/types';

export const LogisticsStep = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  // Store Access
  const { 
    project, 
    setLogisticMode, 
    updateStationary,
    updateRoundtrip,
    addRouteStop,
    removeRouteStop,
    updateRouteStop,
    setDates,
    setArrival,
    setDeparture
  } = useTripStore();

  const { userInputs } = project;
  const { logistics, dates } = userInputs;

  // --- SMART DEFAULTS LOGIC ---
  useEffect(() => {
    // 1. MOBIL: Automatische Berechnung basierend auf Dauer
    if (logistics.mode === 'mobil' && dates.duration) {
      const days = dates.duration;
      
      // Formel: (Tage - 2) * 3h
      // Math.max(0, ...), damit bei Kurztrips nichts Negatives rauskommt
      const calcTotalDriveHours = Math.max(0, (days - DEFAULT_MOBILE_TOTAL_DRIVE_OFFSET) * DEFAULT_MOBILE_TOTAL_DRIVE_FACTOR);
      const calcTotalDriveMins = calcTotalDriveHours * 60;

      // Formel: Tage / 4
      const calcHotelChanges = Math.floor(days / DEFAULT_MOBILE_HOTEL_CHANGE_DIVISOR);

      // Default Leg: 6h
      const defaultLegMins = DEFAULT_MOBILE_MAX_DRIVE_TIME_LEG * 60;

      updateRoundtrip({
        constraints: {
          // Behalte manuellen Wert oder setze Default
          maxDriveTimePerLeg: logistics.roundtrip.constraints?.maxDriveTimePerLeg || defaultLegMins,
          // Diese Werte hängen direkt an der Dauer -> Aktualisieren (User kann danach überschreiben)
          // Wir aktualisieren sie immer, wenn sich die Dauer ändert, um Inkonsistenzen zu vermeiden.
          maxTotalDriveTime: calcTotalDriveMins,
          maxHotelChanges: calcHotelChanges
        }
      });
    }

    // 2. STATIONÄR: Default initialisieren, falls leer
    if (logistics.mode === 'stationaer') {
      const currentVal = logistics.stationary.constraints?.maxDriveTimeDay;
      if (!currentVal) {
        updateStationary({
          constraints: {
            maxDriveTimeDay: DEFAULT_STATIONARY_MAX_DRIVE_TIME_DAY * 60 // 3h in Minuten
          }
        });
      }
    }
  }, [dates.duration, logistics.mode]); 
  // Dependency: Wenn Dauer oder Modus sich ändert, neu berechnen.


  // Optionen für Dropdown
  const ARRIVAL_OPTIONS = [
    { value: 'suggestion', label: t('cockpit.arrival_options.suggestion') },
    { value: 'flight', label: t('cockpit.arrival_options.flight') },
    { value: 'train', label: t('cockpit.arrival_options.train') },
    { value: 'car', label: t('cockpit.arrival_options.car') },
    { value: 'camper', label: t('cockpit.arrival_options.camper') },
    { value: 'other', label: t('cockpit.arrival_options.other') }
  ];

  const handleEndDateChange = (value: string) => {
    if (dates.start && value < dates.start) {
      alert("End date cannot be before start date.");
      return;
    }
    setDates({ end: value });
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* -----------------------------------------------------------
          1. ZEITEN & ANREISE (JETZT OBEN)
         ----------------------------------------------------------- */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* ZEITRAUM */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase">
            <Calendar className="w-3 h-3 text-blue-500" /> {t('cockpit.dates_section')}
          </h3>
          
          <div className="flex-1 flex flex-col gap-4">
             {/* Radio Switch */}
             <div className="flex gap-4 border-b border-slate-100 pb-3">
               <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="dateMode"
                    checked={!dates.flexible}
                    onChange={() => setDates({ flexible: false })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-xs font-bold ${!dates.flexible ? 'text-blue-600' : 'text-slate-500'}`}>{t('cockpit.dates_fix')}</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="dateMode"
                    checked={dates.flexible}
                    onChange={() => setDates({ flexible: true })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-xs font-bold ${dates.flexible ? 'text-blue-600' : 'text-slate-500'}`}>{t('cockpit.dates_flex')}</span>
               </label>
             </div>

            {/* Inputs */}
            {dates.flexible ? (
               <div className="animate-fade-in">
                  <label className="text-xs font-bold text-slate-500 block mb-1">{t('cockpit.duration_label')}</label>
                  <input
                    type="number"
                    className="w-full text-sm border-slate-300 rounded-md"
                    value={dates.duration || 7}
                    onChange={(e) => setDates({ duration: parseInt(e.target.value) })}
                  />
                  <p className="text-[10px] text-slate-400 mt-2">{t('cockpit.ai_hint')}</p>
               </div>
            ) : (
                <div className="grid grid-cols-2 gap-2 animate-fade-in">
                  <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{t('cockpit.date_from')}</label>
                      <input
                      type="date"
                      className="w-full text-xs border-slate-300 rounded-md"
                      value={dates.start}
                      onChange={(e) => setDates({ start: e.target.value })}
                      />
                  </div>
                  <div>
                      <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{t('cockpit.date_to')}</label>
                      <input
                      type="date"
                      className="w-full text-xs border-slate-300 rounded-md"
                      value={dates.end}
                      min={dates.start} 
                      onChange={(e) => handleEndDateChange(e.target.value)}
                      />
                  </div>
                </div>
            )}
          </div>
        </div>

        {/* ANREISE & ZEITEN */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase">
            <Car className="w-3 h-3 text-blue-500" /> {t('cockpit.arrival_section')}
          </h3>

          <div className="space-y-3">
            <div>
                <select
                className="w-full text-xs border-slate-300 rounded-md"
                value={dates.arrival.type}
                onChange={(e) => setArrival({ type: e.target.value as any })}
                >
                {ARRIVAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="relative">
                    <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{t('cockpit.arrival_time')}</label>
                    <div className="relative">
                        <Clock className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                        <input 
                            type="time" 
                            className="w-full pl-6 text-xs border-slate-300 rounded-md"
                            value={dates.arrival.time || ''}
                            onChange={(e) => setArrival({ time: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                     <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">{t('cockpit.departure_time')}</label>
                     <div className="relative">
                        <Clock className="w-3 h-3 absolute left-2 top-2 text-slate-400" />
                        <input 
                            type="time" 
                            className="w-full pl-6 text-xs border-slate-300 rounded-md"
                            value={dates.departure?.time || ''}
                            onChange={(e) => setDeparture({ time: e.target.value })}
                        />
                    </div>
                </div>
            </div>
          </div>
        </div>
      </div>

      
      {/* -----------------------------------------------------------
          2. LOGISTIK-MODUS (Tabs)
         ----------------------------------------------------------- */}
      <div className="bg-slate-100 p-1 rounded-lg flex shadow-inner">
        {Object.values(LOGISTIC_OPTIONS).map((option) => {
          const isActive = logistics.mode === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setLogisticMode(option.id as 'stationaer' | 'mobil')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                isActive 
                  ? 'bg-white text-blue-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {option.label[currentLang]}
            </button>
          );
        })}
      </div>


      {/* -----------------------------------------------------------
          3. ORTE & ROUTE & CONSTRAINTS
         ----------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        
        {logistics.mode === 'stationaer' ? (
          /* STATIONÄR */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('cockpit.region_label')}</label>
              <input
                type="text"
                className="w-full text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('cockpit.region_placeholder')}
                value={logistics.stationary.region}
                onChange={(e) => updateStationary({ region: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('cockpit.destination_label')}</label>
              <input
                type="text"
                className="w-full text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('cockpit.destination_placeholder')}
                value={logistics.stationary.destination}
                onChange={(e) => updateStationary({ destination: e.target.value })}
              />
            </div>
            
            {/* NEW: Max Drive Time for Stationary */}
            <div>
               <label className="text-[10px] text-slate-500 block font-bold mb-1 flex items-center gap-1">
                 <Compass className="w-3 h-3"/> Max. Fahrzeit Ausflüge (h)
               </label>
               <input 
                  type="number"
                  placeholder="3"
                  className="w-full text-xs border-slate-300 rounded"
                  value={logistics.stationary.constraints?.maxDriveTimeDay ? logistics.stationary.constraints.maxDriveTimeDay / 60 : ''}
                  onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateStationary({ 
                          constraints: { maxDriveTimeDay: isNaN(val) ? undefined : val * 60 } 
                      });
                  }}
               />
               <span className="text-[9px] text-slate-400">Hin & Zurück (Tageslimit)</span>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('cockpit.hotel_label')}</label>
              <input
                type="text"
                className="w-full text-sm border-slate-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder={t('cockpit.hotel_placeholder')}
                value={logistics.stationary.hotel || ''}
                onChange={(e) => updateStationary({ hotel: e.target.value })}
              />
            </div>
          </div>
        ) : (
          /* RUNDREISE (MOBIL) */
          <div className="space-y-6">
            
            {/* Basis-Daten */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('cockpit.roundtrip_region')}</label>
                <input
                  type="text"
                  placeholder={t('cockpit.roundtrip_region_placeholder')}
                  className="w-full text-sm border-slate-300 rounded-md"
                  value={logistics.roundtrip.region}
                  onChange={(e) => updateRoundtrip({ region: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('cockpit.roundtrip_start')}</label>
                <input
                  type="text"
                  placeholder={t('cockpit.roundtrip_start_placeholder')}
                  className="w-full text-sm border-slate-300 rounded-md"
                  value={logistics.roundtrip.startLocation}
                  onChange={(e) => updateRoundtrip({ startLocation: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">{t('cockpit.roundtrip_end')}</label>
                <input
                  type="text"
                  placeholder={t('cockpit.roundtrip_end_placeholder')}
                  className="w-full text-sm border-slate-300 rounded-md"
                  value={logistics.roundtrip.endLocation}
                  onChange={(e) => updateRoundtrip({ endLocation: e.target.value })}
                />
              </div>
            </div>

            {/* Logistik Constraints (Automatisch befüllt) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
              
              {/* Max Fahrzeit / Etappe */}
              <div>
                 <label className="text-[10px] text-slate-500 block font-bold mb-1">{t('cockpit.constraints_drive_leg')}</label>
                 <input 
                    type="number"
                    placeholder="h"
                    className="w-full text-xs border-slate-300 rounded"
                    value={logistics.roundtrip.constraints?.maxDriveTimePerLeg ? logistics.roundtrip.constraints.maxDriveTimePerLeg / 60 : ''}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateRoundtrip({ 
                            constraints: { ...logistics.roundtrip.constraints, maxDriveTimePerLeg: isNaN(val) ? undefined : val * 60 } 
                        });
                    }}
                 />
              </div>

              {/* Max Fahrzeit GESAMT */}
              <div>
                 <label className="text-[10px] text-slate-500 block font-bold mb-1">{t('cockpit.constraints_drive_total')}</label>
                 <input 
                    type="number"
                    placeholder="h"
                    className="w-full text-xs border-slate-300 rounded font-medium text-blue-600"
                    value={logistics.roundtrip.constraints?.maxTotalDriveTime ? logistics.roundtrip.constraints.maxTotalDriveTime / 60 : ''}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateRoundtrip({ 
                            constraints: { ...logistics.roundtrip.constraints, maxTotalDriveTime: isNaN(val) ? undefined : val * 60 } 
                        });
                    }}
                 />
                 <span className="text-[9px] text-slate-400">Auto-calc: (Tage-2)*3h</span>
              </div>

              {/* Hotelwechsel */}
              <div>
                 <label className="text-[10px] text-slate-500 block font-bold mb-1">{t('cockpit.constraints_hotel_changes')}</label>
                 <input 
                    type="number"
                    placeholder="#"
                    className="w-full text-xs border-slate-300 rounded font-medium text-blue-600"
                    value={logistics.roundtrip.constraints?.maxHotelChanges || ''}
                    onChange={(e) => updateRoundtrip({ 
                        constraints: { ...logistics.roundtrip.constraints, maxHotelChanges: parseInt(e.target.value) } 
                    })}
                 />
                 <span className="text-[9px] text-slate-400">Auto-calc: Tage/4</span>
              </div>
            </div>

            {/* Stationen Liste */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-500 uppercase">{t('cockpit.stops_label')}</label>
                
                {/* Mode Toggle */}
                <div className="flex bg-slate-100 rounded p-0.5">
                   <button 
                     onClick={() => updateRoundtrip({ tripMode: 'fix' })}
                     className={`text-[10px] px-2 py-0.5 rounded ${logistics.roundtrip.tripMode === 'fix' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                   >
                     {t('cockpit.mode_fix')}
                   </button>
                   <button 
                     onClick={() => updateRoundtrip({ tripMode: 'inspiration' })}
                     className={`text-[10px] px-2 py-0.5 rounded ${logistics.roundtrip.tripMode === 'inspiration' ? 'bg-white shadow text-blue-600' : 'text-slate-400'}`}
                   >
                     {t('cockpit.mode_inspiration')}
                   </button>
                </div>
              </div>

              <div className="space-y-2">
                {logistics.roundtrip.stops.map((stop, index) => (
                  <div key={stop.id} className="flex gap-2 items-center bg-slate-50 p-2 rounded border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 w-4">{index + 1}.</span>
                    <input
                      type="text"
                      placeholder={t('cockpit.destination_label')}
                      className="flex-1 text-xs border-slate-300 rounded"
                      value={stop.location}
                      onChange={(e) => updateRouteStop(stop.id, { location: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder={t('cockpit.hotel_label')}
                      className="flex-1 text-xs border-slate-300 rounded"
                      value={stop.hotel || ''}
                      onChange={(e) => updateRouteStop(stop.id, { hotel: e.target.value })}
                    />
                     <div className="flex items-center gap-1">
                        <input
                            type="number"
                            placeholder="-"
                            className="w-10 text-xs border-slate-300 rounded text-center"
                            value={stop.duration || ''}
                            onChange={(e) => updateRouteStop(stop.id, { duration: parseInt(e.target.value) })}
                        />
                        <span className="text-[10px] text-slate-500">{t('cockpit.nights')}</span>
                    </div>
                    <button onClick={() => removeRouteStop(stop.id)} className="text-slate-300 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addRouteStop}
                  className="w-full py-1.5 border border-dashed border-slate-300 text-slate-500 text-xs rounded hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center gap-1"
                >
                  <Plus className="w-3 h-3" /> {t('cockpit.add_stop')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};