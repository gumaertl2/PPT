// 05.04.2026 19:30 - ARCHITECTURE: Extracted massive Popup UI block into its own component. Contains all fully restored priority and fix-date logic.
// src/features/Cockpit/Map/MapMarkerPopup.tsx

import React from 'react';
import { Popup } from 'react-leaflet';
import { ExternalLink, CalendarClock, Clock } from 'lucide-react';
import { useTripStore } from '../../../store/useTripStore';
import { DAY_COLORS } from './MapConstants';

interface MapMarkerPopupProps {
    place: any;
    isHotel: boolean;
    markerColor: string;
    badgeNumber: number | undefined;
    scheduledDay: number | undefined;
    isFixed: boolean;
    userPrio: number;
    t: any;
    currentLang: string;
    tripStart: string;
    tripEnd: string;
    forceDiaryMode?: boolean;
    isFullscreen: boolean;
    setIsFullscreen: (v: boolean) => void;
    setViewMode?: (mode: any) => void;
    highlightedPlaceId: string | null;
    triggerHighlight: (id: string) => void;
}

export const MapMarkerPopup: React.FC<MapMarkerPopupProps> = ({
    place, isHotel, markerColor, badgeNumber, scheduledDay, isFixed, userPrio, t, currentLang, tripStart, tripEnd, forceDiaryMode, isFullscreen, setIsFullscreen, setViewMode, highlightedPlaceId, triggerHighlight
}) => {
    const { uiState, setUIState, updatePlace, addNotification } = useTripStore();

    return (
        <Popup className="print:hidden">
            <div className="min-w-[220px] font-sans p-1">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded" style={{ backgroundColor: markerColor }} />
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                            {place.category === 'special' ? (place.details?.specialType === 'sunny' ? (currentLang === 'en' ? 'Sunny Day ☀️' : 'Sonnentag ☀️') : (currentLang === 'en' ? 'Rainy Day 🌧️' : 'Regentag 🌧️')) : (place.category || (currentLang === 'en' ? 'Place' : 'Ort'))}
                        </span>
                    </div>
                    
                    {(uiState.visitedFilter === 'visited' || forceDiaryMode) && badgeNumber ? (
                        <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm bg-emerald-500">✅ {currentLang === 'en' ? 'Stop' : 'Station'} {badgeNumber}</span>
                    ) : scheduledDay ? (
                        <span className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded shadow-sm" style={{ backgroundColor: DAY_COLORS[(scheduledDay - 1) % DAY_COLORS.length] }}>📅 {t('sights.day', { defaultValue: currentLang === 'en' ? 'Day' : 'Tag' })} {scheduledDay}</span>
                    ) : null}

                    {isHotel && <span className="text-[10px] font-bold bg-slate-900 text-white px-1.5 py-0.5 rounded">🏨 {t('interests.hotel', { defaultValue: currentLang === 'en' ? 'Accommodation' : 'Unterkunft' })}</span>}
                </div>
                
                <h3 className="font-bold text-slate-900 text-sm mb-1 mt-1">{place.name}</h3>
                {place.address && <p className="text-xs text-slate-600 mb-2 leading-snug flex gap-1">📍 <span className="opacity-80">{place.address}</span></p>}

                {/* Priority Controls (Hidden for Hotels to avoid auto-ignore logic conflicts) */}
                {!isHotel && (
                    <div className="flex justify-between gap-1 mt-3 mb-2 border-t border-slate-100 pt-2 no-print">
                        <button onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: isFixed && userPrio === 1 ? 0 : 1, isFixed: !(isFixed && userPrio === 1) }); }} className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${isFixed && userPrio === 1 ? 'bg-purple-600 text-white border-purple-700' : 'bg-slate-50 text-slate-600 hover:bg-purple-50 hover:text-purple-700 border-slate-200'}`}>Fix</button>
                        <button onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: !isFixed && userPrio === 1 ? 0 : 1, isFixed: false }); }} className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${!isFixed && userPrio === 1 ? 'bg-green-600 text-white border-green-700' : 'bg-slate-50 text-slate-600 hover:bg-green-50 hover:text-green-700 border-slate-200'}`}>Prio 1</button>
                        <button onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: userPrio === 2 ? 0 : 2, isFixed: false }); }} className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${userPrio === 2 ? 'bg-blue-500 text-white border-blue-600' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border-slate-200'}`}>Prio 2</button>
                        <button onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userPriority: userPrio === -1 ? 0 : -1, isFixed: false }); }} className={`flex-1 py-1 rounded text-[9px] font-bold transition-colors border shadow-sm ${userPrio === -1 ? 'bg-gray-800 text-white border-gray-900' : 'bg-slate-50 text-slate-400 hover:bg-gray-100 border-slate-200'}`}>Ignore</button>
                    </div>
                )}

                {/* Fixed Date Setting */}
                {!isHotel && isFixed && (
                    <div className="flex flex-col gap-1 bg-purple-50 px-2 py-1.5 rounded-md text-xs mt-1 mb-2 border border-purple-100 no-print animate-in slide-in-from-top-1">
                        <span className="font-bold text-purple-800 flex items-center gap-1"><CalendarClock className="w-3.5 h-3.5" /> {currentLang === 'en' ? 'Fixed Appointment' : 'Fixtermin'}</span>
                        <div className="flex gap-1 items-center">
                            <input 
                            type="date" 
                            value={place.fixedDate || ''} 
                            min={tripStart} 
                            max={tripEnd} 
                            onChange={(e) => {
                                let val = e.target.value;
                                let corrected = false;
                                if (val && tripStart && val < tripStart) { val = tripStart; corrected = true; }
                                if (val && tripEnd && val > tripEnd) { val = tripEnd; corrected = true; }
                                updatePlace(place.id, { fixedDate: val });
                                if (corrected) {
                                    triggerHighlight(place.id);
                                    addNotification({
                                        type: 'info',
                                        message: t('dates.auto_corrected', { defaultValue: 'Datum wurde automatisch auf den Reisezeitraum angepasst.' })
                                    });
                                }
                            }} 
                            className={`bg-white rounded px-1 py-0.5 text-[10px] w-full outline-none transition-all duration-500 ${highlightedPlaceId === place.id ? 'border border-amber-400 ring-2 ring-amber-400 bg-amber-100 text-amber-900 font-bold' : 'border border-purple-200 focus:ring-1 focus:ring-purple-500'}`} 
                            title="Datum" 
                            />
                            <input type="time" value={place.fixedTime || ''} onChange={(e) => updatePlace(place.id, { fixedTime: e.target.value })} className="bg-white border border-purple-200 rounded px-1 py-0.5 text-[10px] focus:ring-1 focus:ring-purple-500 outline-none" title="Uhrzeit" />
                            <div className="flex items-center gap-0.5 bg-white border border-purple-200 rounded px-1 py-0.5 focus-within:ring-1 focus-within:ring-purple-500"><Clock className="w-2.5 h-2.5 text-purple-400" /><input type="number" placeholder="Min" value={place.visitDuration || ''} onChange={(e) => updatePlace(place.id, { visitDuration: parseInt(e.target.value) || 0 })} className="w-8 bg-transparent border-none p-0 text-center text-[10px] text-purple-900 focus:ring-0 placeholder:text-purple-300 outline-none" title="Dauer in Minuten" /></div>
                        </div>
                    </div>
                )}

                <button 
                    onClick={() => {
                        if (isFullscreen) setIsFullscreen(false);
                        setUIState({ selectedPlaceId: place.id });
                        
                        if (isHotel && (window as any).__openHotelModal) {
                            (window as any).__openHotelModal(place.id);
                        } else if (uiState.visitedFilter === 'visited') {
                            if (setViewMode) setViewMode('plan');
                        } else {
                            let targetSortMode = uiState.sortMode || 'category';
                            let targetFilter = uiState.categoryFilter || [];
                            if ((targetSortMode as string) === 'day') {
                                const dayNum = scheduledDay;
                                const isVisibleInCurrentView = dayNum && (targetFilter.length === 0 || targetFilter.some(f => f.includes(String(dayNum))));
                                if (!isVisibleInCurrentView) { targetSortMode = 'category' as any; targetFilter = []; }
                            }
                            setUIState({ viewMode: 'list', sortMode: targetSortMode, categoryFilter: targetFilter });
                        }
                    }}
                    className={`w-full mt-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-colors shadow-sm ${isHotel ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-900 text-white hover:bg-black'}`}
                >
                    <ExternalLink size={12} /> 
                    {isHotel 
                        ? t('cockpit.hotel_manager.open_modal_map_btn', { defaultValue: 'Im Hotel-Manager öffnen' }) 
                        : ((uiState.visitedFilter === 'visited' || forceDiaryMode) 
                            ? t('map.show_in_diary', { defaultValue: currentLang === 'en' ? 'Show in Diary' : 'Im Tagebuch zeigen' }) 
                            : t('map.show_in_guide', { defaultValue: currentLang === 'en' ? 'Show in Guide' : 'Im Reiseführer zeigen' }))
                    }
                </button>
            </div>
        </Popup>
    );
};
// --- END OF FILE 108 Zeilen ---