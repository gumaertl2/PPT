// 04.04.2026 19:30 - FIX: Made resolveHotelName bulletproof against object-based names, nulls, and name_official edge cases to prevent empty inputs. Fixed i18n default values.
// 04.04.2026 18:30 - UX: Restored the full "Deep Input" UI design.
// src/features/Cockpit/steps/LogisticsStep.tsx

import React, { useEffect, useState } from 'react';
import { useTripStore } from '../../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  Car,
  Compass,
  X,
  Hotel
} from 'lucide-react';
import { LOGISTIC_OPTIONS } from '../../../data/staticData';
import { 
  DEFAULT_MOBILE_MAX_DRIVE_TIME_LEG,
  DEFAULT_MOBILE_TOTAL_DRIVE_FACTOR,
  DEFAULT_MOBILE_TOTAL_DRIVE_OFFSET,
  DEFAULT_MOBILE_HOTEL_CHANGE_DIVISOR,
  DEFAULT_STATIONARY_MAX_DRIVE_TIME_DAY
} from '../../../data/constants';
import type { LanguageCode, Place } from '../../../core/types';

export const LogisticsStep = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
   
  const { 
    project, 
    setProject, 
    setLogisticMode, 
    updateStationary,
    updateRoundtrip,
    setRoundtripOptions,
    addRouteStop,
    removeRouteStop,
    updateRouteStop,
    setDates,
    setArrival,
    setDeparture,
    addNotification
  } = useTripStore();

  const { userInputs } = project;
  const { logistics, dates } = userInputs;

  const [highlightedField, setHighlightedField] = useState<'start' | 'end' | null>(null);

  // --- CUSTOM HOTEL MODAL STATE ---
  const [customHotelTarget, setCustomHotelTarget] = useState<{type: 'stationary' | 'roundtrip', stopId?: string} | null>(null);
  const [customHotelName, setCustomHotelName] = useState('');
  const [customHotelAddress, setCustomHotelAddress] = useState('');
  const [customHotelLink, setCustomHotelLink] = useState('');

  // UX-Klassen (Deep Input Design)
  const LABEL_CLASS = "text-[10px] font-black text-blue-800/80 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5";
  const INPUT_CLASS = "w-full text-sm bg-white border border-slate-300 shadow-inner rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-blue-400 transition-all placeholder:text-slate-300";
  const INPUT_XS_CLASS = "w-full text-xs bg-white border border-slate-300 shadow-inner rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 hover:border-blue-400 transition-all placeholder:text-slate-300";

  const triggerHighlight = (field: 'start' | 'end') => {
    setHighlightedField(field);
    setTimeout(() => setHighlightedField(null), 3000);
  };

  const resolveLabel = (item: any): string => {
    if (!item || !item.label) return '';
    if (typeof item.label === 'string') return item.label;
    return (item.label as any)[currentLang] || (item.label as any)['de'] || '';
  };

  // FIX: Bulletproof Fallback Logic to absolutely guarantee a visible string.
  const resolveHotelName = (val: string | undefined | null): string => {
    if (!val) return '';
    const place = project.data?.places?.[val];
    if (place) {
        let n = place.name || place.official_name || place.name_official;
        if (typeof n === 'object' && n !== null) {
            n = (n as any)[currentLang] || (n as any)['de'] || Object.values(n)[0];
        }
        return (n as string) || val;
    }
    return val;
  };

  useEffect(() => {
    if (!dates.flexible && dates.start && dates.end) {
      const start = new Date(dates.start);
      const end = new Date(dates.end);
      
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (diffDays > 0 && dates.duration !== diffDays) {
        setDates({ duration: diffDays });
      }
    }
  }, [dates.start, dates.end, dates.flexible, dates.duration, setDates]);

  useEffect(() => {
    if (logistics.mode === 'mobil' && dates.duration) {
      const days = dates.duration;
      
      const calcTotalDriveHours = Math.max(0, (days - DEFAULT_MOBILE_TOTAL_DRIVE_OFFSET) * DEFAULT_MOBILE_TOTAL_DRIVE_FACTOR);
      const calcTotalDriveMins = calcTotalDriveHours * 60;

      const calcHotelChanges = Math.floor(days / DEFAULT_MOBILE_HOTEL_CHANGE_DIVISOR);
      const defaultLegMins = DEFAULT_MOBILE_MAX_DRIVE_TIME_LEG * 60;

      updateRoundtrip({
        constraints: {
          maxDriveTimeLeg: logistics.roundtrip.constraints?.maxDriveTimeLeg || defaultLegMins,
          maxDriveTimeTotal: calcTotalDriveMins,
          maxHotelChanges: calcHotelChanges
        }
      });
    }

    if (logistics.mode === 'stationaer') {
      const currentVal = logistics.stationary.constraints?.maxDriveTimeDay;
      if (!currentVal) {
        updateStationary({
          constraints: {
            maxDriveTimeDay: DEFAULT_STATIONARY_MAX_DRIVE_TIME_DAY * 60
          }
        });
      }
    }
  }, [dates.duration, logistics.mode]);

  const ARRIVAL_OPTIONS = [
    { value: 'suggestion', label: t('cockpit.arrival_options.suggestion', { defaultValue: 'KI Vorschlag' }) },
    { value: 'flight', label: t('cockpit.arrival_options.flight', { defaultValue: 'Flugzeug' }) },
    { value: 'train', label: t('cockpit.arrival_options.train', { defaultValue: 'Bahn' }) },
    { value: 'car', label: t('cockpit.arrival_options.car', { defaultValue: 'Auto' }) },
    { value: 'camper', label: t('cockpit.arrival_options.camper', { defaultValue: 'Wohnmobil' }) },
    { value: 'other', label: t('cockpit.arrival_options.other', { defaultValue: 'Sonstiges' }) }
  ];

  const handleStartDateChange = (value: string) => {
    if (value && dates.end && value > dates.end) {
      setDates({ start: value, end: value });
      triggerHighlight('end');
      addNotification({
         type: 'info',
         message: t('cockpit.dates_auto_corrected', { defaultValue: 'Enddatum wurde automatisch angepasst.' })
      });
    } else {
      setDates({ start: value });
    }
  };

  const handleEndDateChange = (value: string) => {
    if (value && dates.start && value < dates.start) {
      setDates({ end: dates.start });
      triggerHighlight('end');
      addNotification({
         type: 'info',
         message: t('cockpit.dates_auto_corrected', { defaultValue: 'Enddatum wurde automatisch angepasst.' })
      });
    } else {
      setDates({ end: value });
    }
  };

  // --- MANUAL HOTEL LOGIC (Pre-Fill & Save) ---
  const openHotelModal = (type: 'stationary' | 'roundtrip', stopId?: string) => {
      let existingHotelRef = '';
      if (type === 'stationary') {
          existingHotelRef = logistics.stationary.hotel || '';
      } else if (type === 'roundtrip' && stopId) {
          const stop = logistics.roundtrip.stops.find(s => s.id === stopId);
          existingHotelRef = stop?.hotel || '';
      }

      if (existingHotelRef) {
          const place = project.data.places?.[existingHotelRef];
          if (place) {
              setCustomHotelName(resolveHotelName(existingHotelRef));
              setCustomHotelAddress(place.address || place.city || '');
              setCustomHotelLink(place.source_url || place.bookingUrl || place.website || '');
          } else {
              setCustomHotelName(existingHotelRef);
              setCustomHotelAddress('');
              setCustomHotelLink('');
          }
      } else {
          setCustomHotelName('');
          setCustomHotelAddress('');
          setCustomHotelLink('');
      }

      setCustomHotelTarget({ type, stopId });
  };

  const handleSaveCustomHotel = () => {
      if (!customHotelName.trim()) {
          addNotification({ type: 'error', message: t('cockpit.custom_hotel.error_name', { defaultValue: 'Please enter at least a name.' }) });
          return;
      }

      let existingHotelId = '';
      if (customHotelTarget?.type === 'stationary') {
          existingHotelId = logistics.stationary.hotel || '';
      } else if (customHotelTarget?.type === 'roundtrip' && customHotelTarget.stopId) {
          const stop = logistics.roundtrip.stops.find(s => s.id === customHotelTarget?.stopId);
          existingHotelId = stop?.hotel || '';
      }

      const state = useTripStore.getState();
      const currentProject = state.project;
      const existingPlace = existingHotelId ? currentProject.data.places[existingHotelId] : null;
      
      const targetId = existingPlace ? existingPlace.id : `custom-hotel-${Date.now()}`;
      
      const newPlace: Place = {
          ...(existingPlace || {}),
          id: targetId,
          name: customHotelName,
          address: customHotelAddress,
          city: customHotelAddress.split(',').pop()?.trim() || (existingPlace?.city || ''), 
          category: 'hotel',
          userSelection: { ...existingPlace?.userSelection, customCategory: 'hotel' },
          userPriority: 1, 
          source_url: customHotelLink,
          isFixed: true, 
          coordinatesValidated: false 
      };

      const updatedPlaces = { ...currentProject.data.places, [targetId]: newPlace };
      let updatedLogistics = { ...currentProject.userInputs.logistics };
      
      if (customHotelTarget?.type === 'stationary') {
          updatedLogistics.stationary = { ...updatedLogistics.stationary, hotel: targetId };
      } else if (customHotelTarget?.type === 'roundtrip' && customHotelTarget.stopId) {
          updatedLogistics.roundtrip = {
              ...updatedLogistics.roundtrip,
              stops: updatedLogistics.roundtrip.stops.map((s: any) => 
                  s.id === customHotelTarget.stopId ? { ...s, hotel: targetId } : s
              )
          };
      }

      state.setProject({ 
          ...currentProject, 
          data: { ...currentProject.data, places: updatedPlaces },
          userInputs: { ...currentProject.userInputs, logistics: updatedLogistics }
      });

      setCustomHotelTarget(null);
      setCustomHotelName('');
      setCustomHotelAddress('');
      setCustomHotelLink('');
      
      addNotification({ type: 'success', message: t('cockpit.custom_hotel.success_msg', { defaultValue: 'Hotel successfully applied.' }) });
  };

  const isStrictRoute = logistics.roundtripOptions?.strictRoute === true;

  return (
    <div className="space-y-6 animate-fade-in relative">

      {/* --- CUSTOM HOTEL MODAL --- */}
      {customHotelTarget && (
         <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                 <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Hotel className="w-5 h-5 text-blue-600" />
                        {t('cockpit.custom_hotel.title', { defaultValue: 'Hotel Details' })}
                    </h3>
                    <button onClick={() => setCustomHotelTarget(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                 </div>
                 <div className="p-6 space-y-4">
                    <p className="text-xs text-slate-500 mb-4">{t('cockpit.custom_hotel.desc', { defaultValue: 'Check or enter your hotel here.' })}</p>
                    
                    <div>
                        <label className={LABEL_CLASS}>{t('cockpit.custom_hotel.name_label', { defaultValue: 'Accommodation Name *' })}</label>
                        <input 
                            type="text" 
                            className={INPUT_CLASS} 
                            placeholder={t('cockpit.custom_hotel.name_placeholder', { defaultValue: 'e.g. The Ritz' })}
                            value={customHotelName}
                            onChange={(e) => setCustomHotelName(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('cockpit.custom_hotel.address_label', { defaultValue: 'Address / City *' })}</label>
                        <input 
                            type="text" 
                            className={INPUT_CLASS} 
                            placeholder={t('cockpit.custom_hotel.address_placeholder', { defaultValue: 'Street, ZIP, City' })}
                            value={customHotelAddress}
                            onChange={(e) => setCustomHotelAddress(e.target.value)}
                        />
                        <p className="text-[9px] text-slate-400 mt-1">{t('cockpit.custom_hotel.address_hint', { defaultValue: 'Important for GPS location.' })}</p>
                    </div>
                    <div>
                        <label className={LABEL_CLASS}>{t('cockpit.custom_hotel.link_label', { defaultValue: 'Website or Booking Link' })}</label>
                        <input 
                            type="text" 
                            className={INPUT_CLASS} 
                            placeholder={t('cockpit.custom_hotel.link_placeholder', { defaultValue: 'https://...' })}
                            value={customHotelLink}
                            onChange={(e) => setCustomHotelLink(e.target.value)}
                        />
                    </div>
                 </div>
                 <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button onClick={() => setCustomHotelTarget(null)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-xl">{t('actions.cancel', { defaultValue: 'Cancel' })}</button>
                    <button onClick={handleSaveCustomHotel} className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md">{t('cockpit.custom_hotel.save_btn', { defaultValue: 'Save & Apply' })}</button>
                 </div>
             </div>
         </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* ZEITRAUM */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase">
            <Calendar className="w-3 h-3 text-blue-500" /> {t('cockpit.dates_section', { defaultValue: 'Reisezeitraum' })}
          </h3>
          
          <div className="flex-1 flex flex-col gap-4">
             <div className="flex gap-4 border-b border-slate-100 pb-3">
               <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="dateMode"
                    checked={!dates.flexible}
                    onChange={() => setDates({ flexible: false })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-xs font-bold ${!dates.flexible ? 'text-blue-600' : 'text-slate-500'}`}>{t('cockpit.dates_fix', { defaultValue: 'Fixes Datum' })}</span>
               </label>
               <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="dateMode"
                    checked={dates.flexible}
                    onChange={() => setDates({ flexible: true })}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className={`text-xs font-bold ${dates.flexible ? 'text-blue-600' : 'text-slate-500'}`}>{t('cockpit.dates_flex', { defaultValue: 'Flexibel' })}</span>
               </label>
             </div>

            {dates.flexible ? (
               <div className="animate-fade-in">
                  <label className={LABEL_CLASS}>{t('cockpit.duration_label', { defaultValue: 'Dauer (Tage)' })}</label>
                  <input
                    type="number"
                    className={INPUT_CLASS}
                    value={dates.duration || 7}
                    onChange={(e) => setDates({ duration: parseInt(e.target.value) })}
                  />
                  <p className="text-[10px] text-slate-400 mt-2">{t('cockpit.ai_hint', { defaultValue: 'KI schlägt Zeitraum vor.' })}</p>
               </div>
            ) : (
                <div className="grid grid-cols-2 gap-3 animate-fade-in">
                  <div>
                      <label className={LABEL_CLASS}>{t('cockpit.date_from', { defaultValue: 'Von' })}</label>
                      <input
                        type="date"
                        className={`${INPUT_XS_CLASS} ${highlightedField === 'start' ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50' : ''}`}
                        value={dates.start}
                        onChange={(e) => handleStartDateChange(e.target.value)}
                      />
                  </div>
                  <div>
                      <label className={LABEL_CLASS}>{t('cockpit.date_to', { defaultValue: 'Bis' })}</label>
                      <input
                        type="date"
                        className={`${INPUT_XS_CLASS} ${highlightedField === 'end' ? 'ring-2 ring-amber-400 border-amber-400 bg-amber-50' : ''}`}
                        value={dates.end}
                        min={dates.start} 
                        onChange={(e) => handleEndDateChange(e.target.value)}
                      />
                  </div>
                </div>
            )}
          </div>
        </div>

        {/* ANREISE & LOGISTIK */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-slate-700 mb-3 flex items-center gap-2 uppercase">
            <Car className="w-3 h-3 text-blue-500" /> {t('cockpit.arrival_section', { defaultValue: 'Anreise & Logistik' })}
          </h3>

          <div className="space-y-3">
            <div>
                <select
                className={`${INPUT_XS_CLASS} cursor-pointer`}
                value={dates.arrival.type}
                onChange={(e) => setArrival({ type: e.target.value as any })}
                >
                {ARRIVAL_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
                </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                    <label className={LABEL_CLASS}>{t('cockpit.arrival_time', { defaultValue: 'Ankunft (Uhr)' })}</label>
                    <div className="relative">
                        <Clock className="w-3 h-3 absolute left-2.5 top-2.5 text-blue-400 pointer-events-none" />
                        <input 
                            type="time" 
                            className={`${INPUT_XS_CLASS} pl-8`}
                            value={dates.arrival.time || ''}
                            onChange={(e) => setArrival({ time: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                      <label className={LABEL_CLASS}>{t('cockpit.departure_time', { defaultValue: 'Abreise (Uhr)' })}</label>
                      <div className="relative">
                        <Clock className="w-3 h-3 absolute left-2.5 top-2.5 text-blue-400 pointer-events-none" />
                        <input 
                            type="time" 
                            className={`${INPUT_XS_CLASS} pl-8`}
                            value={dates.departure?.time || ''}
                            onChange={(e) => setDeparture({ time: e.target.value })}
                        />
                    </div>
                </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
             <label className={LABEL_CLASS}>{t('cockpit.local_mobility', { defaultValue: 'Mobilität vor Ort' })}</label>
             <select
                className={`${INPUT_XS_CLASS} bg-blue-50/30 cursor-pointer`}
                value={logistics.localMobility || 'car'}
                onChange={(e) => setProject({
                    ...project,
                    userInputs: {
                        ...userInputs,
                        logistics: { ...logistics, localMobility: e.target.value as any }
                    }
                })}
             >
                <option value="car">{t('cockpit.mobility.car', { defaultValue: 'Mietwagen / Auto' })}</option>
                <option value="camper">{t('cockpit.mobility.camper', { defaultValue: 'Camper / Wohnmobil' })}</option>
                <option value="public_transport">{t('cockpit.mobility.public', { defaultValue: 'ÖPNV (Bus/Bahn)' })}</option>
                <option value="bicycle">{t('cockpit.mobility.bicycle', { defaultValue: 'Fahrrad' })}</option>
                <option value="walk">{t('cockpit.mobility.walk', { defaultValue: 'Zu Fuß' })}</option>
                <option value="mix">{t('cockpit.mobility.mix', { defaultValue: 'Mix (Taxi/Uber/ÖPNV)' })}</option>
             </select>
          </div>
        </div>
      </div>

      {/* LOGISTIK MODUS */}
      <div className="bg-slate-200/60 p-1 rounded-xl flex shadow-inner">
        {Object.values(LOGISTIC_OPTIONS).map((option) => {
          const isActive = logistics.mode === option.id;
          return (
            <button
              key={option.id}
              onClick={() => setLogisticMode(option.id as 'stationaer' | 'mobil')}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                isActive 
                  ? 'bg-white text-blue-600 shadow-md ring-1 ring-black/5' 
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
              }`}
            >
              {resolveLabel(option)}
            </button>
          );
        })}
      </div>

      {/* ORTE & ROUTE */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        
        {logistics.mode === 'stationaer' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL_CLASS}>{t('cockpit.region_label', { defaultValue: 'Region' })}</label>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder={t('cockpit.region_placeholder', { defaultValue: 'z.B. Tirol, Österreich' })}
                value={logistics.stationary.region}
                onChange={(e) => updateStationary({ region: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL_CLASS}>{t('cockpit.destination_label', { defaultValue: 'Ziel' })}</label>
              <input
                type="text"
                className={INPUT_CLASS}
                placeholder={t('cockpit.destination_placeholder', { defaultValue: 'z.B. Innsbruck' })}
                value={logistics.stationary.destination}
                onChange={(e) => updateStationary({ destination: e.target.value })}
              />
            </div>
            
            <div>
               <label className={LABEL_CLASS}>
                 <Compass className="w-3.5 h-3.5"/> {t('cockpit.constraints_drive_day', { defaultValue: 'Max. Fahrzeit Ausflüge (h)' })}
               </label>
               <input 
                  type="number"
                  placeholder="3"
                  className={INPUT_XS_CLASS}
                  value={logistics.stationary.constraints?.maxDriveTimeDay ? logistics.stationary.constraints.maxDriveTimeDay / 60 : ''}
                  onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      updateStationary({ 
                          constraints: { maxDriveTimeDay: isNaN(val) ? undefined : val * 60 } 
                      });
                  }}
               />
               <span className="text-[9px] text-slate-400 mt-1 block">{t('cockpit.constraints_drive_day_hint', { defaultValue: 'Hin & Zurück (Tageslimit)' })}</span>
            </div>

            <div>
              <label className={`${LABEL_CLASS} justify-between`}>
                  <span>{t('cockpit.hotel_label', { defaultValue: 'Hotel' })}</span>
                  <span className="text-[9px] text-slate-400 font-medium normal-case bg-slate-100 px-1.5 py-0.5 rounded">(Optional)</span>
              </label>
              <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    className={INPUT_CLASS}
                    placeholder={t('cockpit.hotel_placeholder', { defaultValue: 'Name oder Link (z.B. Booking.com)' })}
                    value={resolveHotelName(logistics.stationary.hotel)}
                    onChange={(e) => updateStationary({ hotel: e.target.value })}
                  />
                  <button 
                     onClick={() => openHotelModal('stationary')}
                     className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 px-3 py-2.5 rounded-lg flex items-center gap-1 text-xs font-bold transition-all shadow-sm shrink-0"
                     title={t('cockpit.custom_hotel.btn_tooltip', { defaultValue: 'Exaktes Hotel samt Adresse ansehen/anlegen' })}
                  >
                     <Plus className="w-4 h-4" /> {t('cockpit.custom_hotel.btn_manual', { defaultValue: 'Manuell' })}
                  </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={LABEL_CLASS}>{t('cockpit.roundtrip_region', { defaultValue: 'Region' })}</label>
                <input
                  type="text"
                  placeholder={t('cockpit.roundtrip_region_placeholder', { defaultValue: 'z.B. Schottland' })}
                  className={INPUT_CLASS}
                  value={logistics.roundtrip.region}
                  onChange={(e) => updateRoundtrip({ region: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>{t('cockpit.roundtrip_start', { defaultValue: 'Start' })}</label>
                <input
                  type="text"
                  placeholder={t('cockpit.roundtrip_start_placeholder', { defaultValue: 'z.B. Edinburgh' })}
                  className={INPUT_CLASS}
                  value={logistics.roundtrip.startLocation}
                  onChange={(e) => updateRoundtrip({ startLocation: e.target.value })}
                />
              </div>
              <div>
                <label className={LABEL_CLASS}>{t('cockpit.roundtrip_end', { defaultValue: 'Ende' })}</label>
                <input
                  type="text"
                  placeholder={t('cockpit.roundtrip_end_placeholder', { defaultValue: 'z.B. Glasgow' })}
                  className={INPUT_CLASS}
                  value={logistics.roundtrip.endLocation}
                  onChange={(e) => updateRoundtrip({ endLocation: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
              
              <div>
                 <label className={LABEL_CLASS}>{t('cockpit.constraints_drive_leg', { defaultValue: 'Max Fahrzeit (Etappe)' })}</label>
                 <input 
                    type="number"
                    placeholder="h"
                    className={INPUT_XS_CLASS}
                    value={logistics.roundtrip.constraints?.maxDriveTimeLeg ? logistics.roundtrip.constraints.maxDriveTimeLeg / 60 : ''}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateRoundtrip({ 
                            constraints: { ...logistics.roundtrip.constraints, maxDriveTimeLeg: isNaN(val) ? undefined : val * 60 } 
                        });
                    }}
                 />
              </div>

              <div>
                 <label className={LABEL_CLASS}>{t('cockpit.constraints_drive_total', { defaultValue: 'Max Fahrzeit (Gesamt)' })}</label>
                 <input 
                    type="number"
                    placeholder="h"
                    className={`${INPUT_XS_CLASS} text-blue-700 font-bold`}
                    value={logistics.roundtrip.constraints?.maxDriveTimeTotal ? logistics.roundtrip.constraints.maxDriveTimeTotal / 60 : ''}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        updateRoundtrip({ 
                            constraints: { ...logistics.roundtrip.constraints, maxDriveTimeTotal: isNaN(val) ? undefined : val * 60 } 
                        });
                    }}
                 />
                 <span className="text-[9px] text-slate-400 mt-1 block">{t('cockpit.auto_calc_total', { defaultValue: 'Auto-calc: (Tage-2)*3h' })}</span>
              </div>

              <div>
                 <label className={LABEL_CLASS}>{t('cockpit.constraints_hotel_changes', { defaultValue: 'Max Hotelwechsel' })}</label>
                 <input 
                    type="number"
                    placeholder="#"
                    className={`${INPUT_XS_CLASS} text-blue-700 font-bold`}
                    value={logistics.roundtrip.constraints?.maxHotelChanges || ''}
                    onChange={(e) => updateRoundtrip({ 
                        constraints: { ...logistics.roundtrip.constraints, maxHotelChanges: parseInt(e.target.value) } 
                    })}
                 />
                 <span className="text-[9px] text-slate-400 mt-1 block">{t('cockpit.auto_calc_hotels', { defaultValue: 'Auto-calc: Tage/4' })}</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wide">{t('cockpit.stops_label', { defaultValue: 'Stationen' })}</label>
                
                <div className="flex bg-slate-100 rounded-lg p-0.5 shadow-inner">
                   <button 
                     onClick={() => setRoundtripOptions({ strictRoute: true })}
                     className={`text-[10px] px-3 py-1 font-bold rounded-md transition-all ${
                       isStrictRoute ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'
                     }`}
                   >
                     {t('cockpit.mode_fix', { defaultValue: 'Fix' })}
                   </button>
                   <button 
                     onClick={() => setRoundtripOptions({ strictRoute: false })}
                     className={`text-[10px] px-3 py-1 font-bold rounded-md transition-all ${
                       !isStrictRoute ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'
                     }`}
                   >
                     {t('cockpit.mode_inspiration', { defaultValue: 'Inspiration' })}
                   </button>
                </div>
              </div>

              <div className="space-y-2">
                {logistics.roundtrip.stops.map((stop, index) => (
                  <div key={stop.id} className="flex gap-2 items-center bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                    <span className="text-xs font-black text-slate-400 w-5 text-center">{index + 1}.</span>
                    <input
                      type="text"
                      placeholder={t('cockpit.destination_label', { defaultValue: 'Ziel' })}
                      className={`${INPUT_XS_CLASS} w-1/4`}
                      value={stop.location}
                      onChange={(e) => updateRouteStop(stop.id, { location: e.target.value })}
                    />
                    
                    <div className="flex flex-1 gap-1">
                        <input
                            type="text"
                            placeholder={t('cockpit.hotel_placeholder', { defaultValue: 'Name oder Link (Booking)' })}
                            className={`${INPUT_XS_CLASS} flex-1`}
                            value={resolveHotelName(stop.hotel)}
                            onChange={(e) => updateRouteStop(stop.id, { hotel: e.target.value })}
                        />
                        <button 
                            onClick={() => openHotelModal('roundtrip', stop.id)}
                            className="bg-white border border-slate-300 text-blue-600 hover:bg-blue-50 hover:border-blue-300 px-2 rounded-lg font-bold text-xs shadow-inner transition-colors flex items-center justify-center shrink-0"
                            title={t('cockpit.custom_hotel.btn_tooltip', { defaultValue: 'Exaktes Hotel samt Adresse ansehen/anlegen' })}
                        >
                            + 🏨
                        </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                        <input
                            type="number"
                            placeholder="-"
                            className={`${INPUT_XS_CLASS} w-12 text-center`}
                            value={stop.duration || ''}
                            onChange={(e) => updateRouteStop(stop.id, { duration: parseInt(e.target.value) })}
                        />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{t('cockpit.nights', { defaultValue: 'Nächte' })}</span>
                    </div>
                    <button onClick={() => removeRouteStop(stop.id)} className="text-slate-300 hover:text-red-500 p-1 shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addRouteStop}
                  className="w-full py-2.5 border-2 border-dashed border-slate-200 text-slate-500 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus className="w-4 h-4" /> {t('cockpit.add_stop', { defaultValue: 'Station hinzufügen' })}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
// --- END OF FILE 650 Zeilen ---