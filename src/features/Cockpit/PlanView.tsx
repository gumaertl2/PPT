// 17.03.2026 14:30 - FIX: Enforced strict I18N compliance for 'Reisetag'.
// 17.03.2026 14:15 - HOTFIX: Resolved TS2769 'string | undefined' overload error.
// src/features/Cockpit/PlanView.tsx

import React, { useMemo, useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, CheckCircle2, Map as MapIcon, ExternalLink, 
  PenLine, X, MapPin, Trash2, Clock, Navigation, Quote, ArrowRight, Banknote, Star, BookOpen
} from 'lucide-react';
import type { LanguageCode, Place, CockpitViewMode } from '../../core/types';
import { INTEREST_DATA } from '../../data/staticData';
import { generateGoogleMapsRouteUrl } from './utils';
import { ExpenseEntryButton } from './ExpenseEntryButton';

export const PlanView: React.FC<{ setViewMode?: (mode: CockpitViewMode) => void }> = ({ setViewMode }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const { project, updatePlace, togglePlaceVisited, setProject, uiState, setUIState } = useTripStore();
  const { userInputs, analysis, data } = project;
  const { logistics, travelers } = userInputs;
  const routeAnalysis = analysis.routeArchitect;
  const travelerNames = travelers.travelerNames || '';

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isUpdatingGPS, setIsUpdatingGPS] = useState(false);

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [customLocation, setCustomLocation] = useState<{lat: number, lng: number} | null>(null);
  
  const globalSearchTerm = uiState.searchTerm || '';

  const [pendingExpense, setPendingExpense] = useState<{title: string, location: any} | null>(null);

  const isRoundtripContext = ['roundtrip', 'mobil'].includes(logistics.mode);

  const highlightText = (text: string, highlight: string) => {
      if (!highlight.trim() || !text) return text;
      const regex = new RegExp(`(${highlight})`, 'gi');
      const parts = text.split(regex);
      return (
          <span>
              {parts.map((part, i) => 
                  regex.test(part) ? <mark key={i} className="bg-yellow-200 text-slate-900 rounded-sm px-0.5">{part}</mark> : <span key={i}>{part}</span>
              )}
          </span>
      );
  };

  const resolveLabel = (item: any): string => {
    if (!item || !item.label) return '';
    if (typeof item.label === 'string') return item.label;
    return (item.label as any)[currentLang] || (item.label as any)['de'] || '';
  };

  const getRealDay = (dateStr: string, startStr: string) => {
      if (!startStr) return 1;
      const start = new Date(startStr); start.setHours(0,0,0,0);
      const visit = new Date(dateStr); visit.setHours(0,0,0,0);
      const diff = visit.getTime() - start.getTime();
      return Math.floor(diff / 86400000) + 1;
  };

  const matchedRoute = useMemo(() => {
      if (!isRoundtripContext || !routeAnalysis?.routes) return null;
      const currentStops = logistics.roundtrip.stops || [];
      const currentLocations = currentStops.map(s => s.location).sort().join('|');
      return routeAnalysis.routes.find((p: any) => {
          if (!p.stages) return false;
          const proposalStr = p.stages.map((s: any) => s.location_name).sort().join('|');
          return proposalStr === currentLocations;
      });
  }, [isRoundtripContext, logistics, routeAnalysis]);

  const renderRouteBlock = () => {
    if (!isRoundtripContext) return null;
    const roundtrip = logistics.roundtrip;
    const stops = roundtrip.stops || [];
    const mapsLink = routeAnalysis?.googleMapsLink || generateGoogleMapsRouteUrl([roundtrip.startLocation, ...stops.map(s => s.name || s.location), roundtrip.endLocation].filter(Boolean) as string[], 'driving', logistics.roundtrip.region || (logistics as any).target_countries?.[0] || "") || undefined;

    return (
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
         <div className="flex items-center gap-3 mb-6 border-b border-slate-50 pb-4">
            <div className="p-2.5 bg-blue-100 text-blue-600 rounded-xl"><MapIcon size={24} /></div>
            <div><h2 className="text-xl font-bold text-slate-900">{t('route.route_planning', { defaultValue: 'Routen-Planung' })}</h2><p className="text-sm text-slate-500">{roundtrip.startLocation} ➔ {roundtrip.endLocation}</p></div>
         </div>
         {matchedRoute ? (
             <div className="mb-6 bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                 <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-blue-900">{matchedRoute.title}</h3>
                    <div className="flex gap-2">
                        {matchedRoute.total_km && <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1"><Navigation size={10} /> {matchedRoute.total_km} km</span>}
                        {matchedRoute.total_drive_time && <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded-full flex items-center gap-1"><Clock size={10} /> {matchedRoute.total_drive_time} h</span>}
                    </div>
                 </div>
                 <p className="text-sm text-slate-700 leading-relaxed italic flex gap-2"><Quote size={16} className="text-blue-300 shrink-0 mt-0.5" />{matchedRoute.description}</p>
             </div>
         ) : (
             routeAnalysis?.route_reasoning && <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100 text-sm text-slate-700 leading-relaxed italic">"{routeAnalysis.route_reasoning}"</div>
         )}
         <div className="mb-8 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">{t('route.itinerary_stops', { defaultValue: 'Reiseverlauf & Aufenthalte' })}</h4>
            <div className="flex flex-wrap items-center gap-y-2 text-sm leading-relaxed">
                <span className="font-semibold text-slate-700">{roundtrip.startLocation}</span><ArrowRight size={14} className="mx-2 text-slate-300" />
                {stops.map((stop, idx) => (
                    <React.Fragment key={idx}>
                        <span className="inline-flex items-center gap-1"><span className="font-bold text-slate-900">{stop.name || stop.location}</span>{stop.duration && <span className="text-xs text-blue-600 bg-blue-50 px-1.5 rounded border border-blue-100 font-medium">({stop.duration})</span>}</span>
                        <ArrowRight size={14} className="mx-2 text-slate-300" />
                    </React.Fragment>
                ))}
                <span className="font-semibold text-slate-700">{roundtrip.endLocation}</span>
            </div>
         </div>
         <div className="pt-4 border-t border-slate-50 flex justify-center">
            {mapsLink && (<a href={mapsLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg group"><MapIcon size={18} />{t('actions.openMaps', { defaultValue: 'Route auf Google Maps öffnen' })}<ExternalLink size={14} className="opacity-70 group-hover:translate-x-0.5 transition-transform" /></a>)}
         </div>
      </div>
    );
  };

  const handleFetchGPS = () => {
    setIsFetchingGPS(true);
    if (!navigator.geolocation) { alert(t('finance.error_no_gps', { defaultValue: 'Dein Browser unterstützt kein GPS.' })); setIsFetchingGPS(false); return; }
    navigator.geolocation.getCurrentPosition(
        (pos) => { setCustomLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsFetchingGPS(false); },
        (err) => { console.error(err); alert(t('finance.error_gps_failed', { defaultValue: 'GPS konnte nicht abgerufen werden.' })); setIsFetchingGPS(false); },
        { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSaveCustomEntry = (alsoExpense: boolean = false) => {
      if (!customTitle.trim() && !customNote.trim()) return;
      const defaultTitleText = t('diary.default_title', { defaultValue: 'Mein Erlebnis' });
      const newId = `custom_${crypto.randomUUID()}`;
      const newPlace: Place = {
          id: newId, name: customTitle.trim() || defaultTitleText, category: 'custom_diary',
          visited: true, visitedAt: new Date().toISOString(), userNote: customNote.trim(), location: customLocation || undefined
      };
      
      setProject({ ...project, data: { ...project.data, places: { ...project.data.places, [newId]: newPlace } } });
      
      if (alsoExpense) {
          setPendingExpense({ 
              title: customTitle.trim() || defaultTitleText, 
              location: customLocation 
          });
      }

      setIsAddingCustom(false); setCustomTitle(''); setCustomNote(''); setCustomLocation(null);
  };

  const handleDeleteCustom = (id: string) => {
      if (confirm(t('diary.delete_confirm', { defaultValue: 'Diesen Tagebucheintrag wirklich löschen?' }))) {
          const newPlaces = { ...project.data.places };
          delete newPlaces[id];
          setProject({ ...project, data: { ...project.data, places: newPlaces } });
      }
  };

  const handleUndoCheckin = (id: string) => {
      if (confirm(t('diary.undo_confirm', { defaultValue: 'Willst du diesen Check-in wirklich rückgängig machen?' }))) {
          togglePlaceVisited(id);
      }
  };

  const handleOpenEdit = (place: any) => {
      setEditingEntryId(place.id);
      setEditTitle(place.name || '');
      setEditNote(place.userNote || '');
      if (place.visitedAt) {
          const d = new Date(place.visitedAt);
          const tzOffset = d.getTimezoneOffset() * 60000;
          const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
          setEditDate(localISOTime);
      } else {
          setEditDate('');
      }
      setEditLocation(place.location || null);
  };

  const handleSaveEdit = (id: string) => {
      const updates: Partial<Place> = {};
      if (editTitle.trim()) updates.name = editTitle.trim();
      updates.userNote = editNote;
      if (editDate) {
          updates.visitedAt = new Date(editDate).toISOString();
      }
      updates.location = editLocation || undefined;

      updatePlace(id, updates);
      setEditingEntryId(null);
  };

  const getGoogleMapsUrl = (place: any) => {
      if (place.category === 'custom_diary') {
          if (place.location?.lat && place.location?.lng) {
              return `https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`;
          }
          return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`;
      }
      const query = [place.official_name || place.name, place.address || place.city].filter(Boolean).join(', ');
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const renderVisitedDiary = () => {
    const activeFilters = uiState.categoryFilter || [];
    const sortMode = uiState.sortMode || 'category';

    const allVisited = Object.values(data?.places || {})
        .filter((p: any) => p.visited && p.visitedAt)
        .sort((a: any, b: any) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime());
        
    const sequencedPlaces = allVisited.map((p: any, index) => ({ ...p, _seq: index + 1 }));

    const filteredPlaces = sequencedPlaces.filter((p: any) => {
        if (uiState.visitedFilter === 'unvisited') return false;

        if (globalSearchTerm) {
            const term = globalSearchTerm.toLowerCase();
            const nameMatch = (p.name || '').toLowerCase().includes(term);
            const noteMatch = (p.userNote || '').toLowerCase().includes(term);
            if (!nameMatch && !noteMatch) return false;
        }

        if (activeFilters.length > 0) {
            const originalCat = p.category || 'Sonstiges';

            if (sortMode === 'category') {
                if (!activeFilters.includes(originalCat)) return false;
            } else if (sortMode === 'priority') {
                const pVal = p.isFixed ? 4 : p.userPriority === 1 ? 3 : p.userPriority === 2 ? 2 : p.userPriority === -1 ? 0 : 1;
                if (!activeFilters.includes(String(pVal))) return false;
            } else if (sortMode === 'day') {
                const realDay = getRealDay(p.visitedAt as string, project.userInputs.dates?.start || new Date().toISOString());
                const labelTranslated = `${t('sights.day', {defaultValue: 'Tag'})} ${realDay}`;
                const isSelected = activeFilters.includes(`Tag ${realDay}`) || activeFilters.includes(`Day ${realDay}`) || activeFilters.includes(labelTranslated);
                if (!isSelected) return false;
            } else if (sortMode === 'tour') {
                const tourGuide = (analysis as any)?.tourGuide;
                const tours = (tourGuide?.guide?.tours || []) as any[];
                let inSelectedTour = false;
                tours.forEach((tour: any) => {
                    const title = tour.tour_title || "Tour";
                    if (activeFilters.includes(title) && tour.suggested_order_ids?.includes(p.id)) {
                        inSelectedTour = true;
                    }
                });
                if (activeFilters.includes('tour_special') && originalCat === 'special') {
                    inSelectedTour = true;
                }
                if (!inSelectedTour) return false;
            }
        }

        return true;
    });

    const groupedPlaces = filteredPlaces.reduce((acc: Record<string, any[]>, place: any) => {
        const safeDate = place.visitedAt ? (place.visitedAt as string) : new Date().toISOString();
        const dateKey = new Date(safeDate).toISOString().split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(place);
        return acc;
    }, {});

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-center justify-between mb-6 border-b border-slate-50 pb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl shrink-0"><CheckCircle size={24} /></div>
                    <div><h2 className="text-xl font-bold text-slate-900">{t('diary.title', { defaultValue: 'Live-Reisetagebuch' })}</h2><p className="text-sm text-slate-500">{t('diary.subtitle', { defaultValue: 'Deine besuchten Orte.' })}</p></div>
                </div>
                
                <div className="hidden sm:flex items-center gap-2">
                    <ExpenseEntryButton travelers={travelerNames} mode="standalone" />
                    <button onClick={() => setIsAddingCustom(!isAddingCustom)} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-colors shadow-sm"><PenLine size={14} /> {t('diary.add_custom', { defaultValue: 'Eigener Eintrag' })}</button>
                </div>
            </div>

            <div className="flex sm:hidden gap-2 mb-4">
                <ExpenseEntryButton travelers={travelerNames} mode="standalone" isMobile={true} />
                <button onClick={() => setIsAddingCustom(!isAddingCustom)} className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold shadow-sm"><PenLine size={16} /> {t('diary.add_note', { defaultValue: 'Notiz' })}</button>
            </div>

            {pendingExpense && (
                <div className="hidden">
                    <ExpenseEntryButton 
                        travelers={travelerNames} 
                        mode="standalone" 
                        defaultTitle={pendingExpense.title}
                        defaultLocation={pendingExpense.location}
                        forceOpen={true}
                        onClose={() => setPendingExpense(null)}
                    />
                </div>
            )}

            {isAddingCustom && (
                <div className="mb-6 p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center justify-between mb-3"><h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><PenLine size={16} className="text-indigo-500" /> {t('diary.what_discovered', { defaultValue: 'Was hast du entdeckt?' })}</h4><button onClick={() => setIsAddingCustom(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button></div>
                    <input type="text" placeholder={t('diary.title_placeholder', { defaultValue: 'Titel (z.B. Ein kleines Café am Eck)' })} className="w-full text-sm p-3 mb-3 border border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder:text-slate-300 font-medium text-slate-800 shadow-sm" value={customTitle} onChange={e => setCustomTitle(e.target.value)} autoFocus />
                    <textarea placeholder={t('diary.note_placeholder', { defaultValue: 'Deine Erlebnisse oder Notizen...' })} className="w-full text-sm p-3 mb-3 border border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder:text-slate-300 resize-y min-h-[80px] shadow-sm leading-relaxed" value={customNote} onChange={e => setCustomNote(e.target.value)} />
                    <div className="flex flex-col gap-3">
                        <button onClick={handleFetchGPS} className={`flex items-center gap-2 text-xs font-bold px-3 py-2 rounded-lg transition-colors border shadow-sm w-full justify-center ${customLocation ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}><MapPin size={14} className={isFetchingGPS ? 'animate-bounce text-indigo-500' : ''} /> {isFetchingGPS ? t('finance.gps_fetching', { defaultValue: 'Ortung läuft...' }) : customLocation ? t('finance.gps_saved', { defaultValue: 'Standort gespeichert ✓' }) : t('finance.gps_tag', { defaultValue: 'Aktuellen Standort (GPS) taggen' })}</button>
                        
                        <div className="flex flex-col sm:flex-row gap-2">
                            <button onClick={() => handleSaveCustomEntry(true)} className="flex-1 text-sm bg-emerald-50 text-emerald-700 border border-emerald-200 px-5 py-2.5 rounded-lg font-bold hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center gap-2">
                                <Banknote size={16} /> {t('finance.save_and_expense', { defaultValue: 'Speichern & Kosten erfassen' })}
                            </button>
                            <button onClick={() => handleSaveCustomEntry(false)} className="flex-1 text-sm bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-bold hover:bg-indigo-700 transition-all shadow-md flex items-center justify-center gap-2">
                                <CheckCircle2 size={16} /> {t('actions.save', { defaultValue: 'Speichern' })}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filteredPlaces.length === 0 && !isAddingCustom && (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                    {globalSearchTerm || activeFilters.length > 0 || uiState.visitedFilter === 'unvisited'
                        ? t('diary.no_search_results', { defaultValue: 'Keine Einträge für diesen Filter gefunden.' })
                        : t('diary.empty_state', { defaultValue: 'Noch keine Einträge. Checke bei Orten ein oder erstelle einen eigenen Eintrag!' })
                    }
                </div>
            )}

            <div className="space-y-1 relative">
                {filteredPlaces.length > 0 && <div className="absolute top-8 bottom-4 left-[27px] w-0.5 bg-emerald-100 z-0"></div>}

                {Object.keys(groupedPlaces).sort().map((dateKey) => {
                    const placesForThisDay = groupedPlaces[dateKey];
                    const realDay = getRealDay(dateKey, userInputs.dates?.start || new Date().toISOString());
                    const dateObj = new Date(dateKey);
                    const dateStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long' }).format(dateObj);

                    return (
                        <div key={dateKey} className="relative z-10 pb-4">
                            <div className="flex items-center gap-4 my-6">
                                <div className="h-px bg-emerald-200 flex-1"></div>
                                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm flex items-center gap-2">
                                    {t('diary.real_day', { defaultValue: currentLang === 'en' ? 'Travel Day' : 'Reisetag' })} {realDay} <span className="text-emerald-600/60 font-medium">|</span> {dateStr}
                                </span>
                                <div className="h-px bg-emerald-200 flex-1"></div>
                            </div>

                            {placesForThisDay.map((place: any) => {
                                const safeTimeDate = place.visitedAt ? new Date(place.visitedAt as string) : new Date();
                                const timeStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(safeTimeDate);
                                const isCustomEntry = place.category === 'custom_diary';
                                const categoryLabel = isCustomEntry ? t('diary.custom_entry_label', { defaultValue: 'Eigener Eintrag' }) : (INTEREST_DATA[place.category] ? resolveLabel(INTEREST_DATA[place.category]) : place.category);
                                const rating = place.userRating || 0;

                                return (
                                    <div key={place.id} className="relative pl-14 py-2">
                                        <div className="absolute left-[15px] top-5 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shadow-sm ring-4 ring-white z-10">
                                            {place._seq}
                                        </div>

                                        <div className={`border rounded-xl p-3 hover:shadow-md transition-all ${isCustomEntry ? 'bg-indigo-50/30 border-indigo-100' : 'bg-white border-slate-200 hover:border-emerald-200'}`}>
                                            
                                            <div className="flex justify-between items-start mb-1 gap-2">
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                                    <h4 className={`font-bold text-sm leading-tight ${isCustomEntry ? 'text-indigo-900' : 'text-slate-800'}`}>
                                                        {highlightText(place.name, globalSearchTerm)}
                                                    </h4>
                                                    <div className="flex items-center">
                                                        {[1, 2, 3, 4, 5].map(star => (
                                                            <button 
                                                                key={star} 
                                                                onClick={(e) => { e.stopPropagation(); updatePlace(place.id, { userRating: star === rating ? 0 : star }); }}
                                                                className={`transition-transform hover:scale-110 p-0.5 ${star <= rating ? 'text-amber-400' : 'text-slate-200 hover:text-amber-200'}`}
                                                                title={`${star} Stern${star > 1 ? 'e' : ''}`}
                                                            >
                                                                <Star size={14} className={star <= rating ? "fill-current" : ""} />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-1.5 shrink-0">
                                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isCustomEntry ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}><Clock size={10} /> {timeStr}</span>
                                                    <ExpenseEntryButton placeId={place.id} defaultTitle={place.name} travelers={travelerNames} mode="diary" />
                                                    <button onClick={() => editingEntryId === place.id ? setEditingEntryId(null) : handleOpenEdit(place)} className={`p-1.5 rounded transition-colors shadow-sm border ${editingEntryId === place.id ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200'}`} title={t('diary.edit_note', { defaultValue: 'Eintrag bearbeiten' })}><PenLine size={12} /></button>
                                                    {isCustomEntry ? (
                                                        <button onClick={() => handleDeleteCustom(place.id)} className="p-1.5 rounded bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm border border-slate-200" title={t('diary.delete_entry', { defaultValue: 'Eintrag löschen' })}><Trash2 size={12} /></button>
                                                    ) : (
                                                        <button onClick={() => handleUndoCheckin(place.id)} className="p-1.5 rounded bg-white text-emerald-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm border border-slate-200 group" title={t('diary.undo_checkin', { defaultValue: 'Check-in rückgängig machen' })}><CheckCircle2 size={12} className="group-hover:hidden" /><X size={12} className="hidden group-hover:block" /></button>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            <div className="text-xs flex flex-wrap gap-1 items-center font-medium mb-2">
                                                <span className="text-slate-500 flex items-center gap-1 mr-2">
                                                    {isCustomEntry ? <PenLine size={10} className="text-indigo-400" /> : <MapIcon size={10} className="text-emerald-400" />} {categoryLabel}
                                                </span>
                                                
                                                {(place.location?.lat || place.address) && (
                                                    <a href={getGoogleMapsUrl(place)} target="_blank" rel="noopener noreferrer" className="mr-2 flex items-center gap-0.5 text-blue-500 hover:text-blue-700 transition-colors hover:underline" title={t('sights.open_google_maps', { defaultValue: 'Auf Google Maps öffnen' })}><MapPin size={10}/> Maps</a>
                                                )}
                                                
                                                {setViewMode && place.location && (
                                                    <button onClick={() => { setUIState({ viewMode: 'map', selectedPlaceId: place.id }); setViewMode('sights'); }} className="mr-2 flex items-center gap-0.5 text-indigo-500 hover:text-indigo-700 transition-colors" title={t('diary.jump_to_map_tooltip', { defaultValue: 'Auf unserer Karte zeigen' })}><MapIcon size={10} /> {t('diary.jump_to_map', {defaultValue: 'Zur Karte'})}</button>
                                                )}
                                                {setViewMode && !isCustomEntry && (
                                                    <button onClick={() => { setUIState({ viewMode: 'list', selectedPlaceId: place.id }); setViewMode('sights'); }} className="mr-2 flex items-center gap-0.5 text-indigo-500 hover:text-indigo-700 transition-colors" title={t('diary.jump_to_guide_tooltip', { defaultValue: 'Details im Guide ansehen' })}><BookOpen size={10} /> {t('diary.jump_to_guide', {defaultValue: 'Zum Guide'})}</button>
                                                )}
                                            </div>

                                            {editingEntryId === place.id ? (
                                                <div className="mt-3 p-3 bg-indigo-50/50 border border-indigo-200 rounded-xl animate-in fade-in slide-in-from-top-1">
                                                    <div className="flex flex-col gap-2 mb-2">
                                                        <label className="text-[10px] font-bold text-indigo-400 uppercase">{t('diary.edit_title', {defaultValue: 'Titel'})}</label>
                                                        <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} className="w-full text-sm p-2.5 border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                                                    </div>
                                                    <div className="flex flex-col gap-2 mb-2">
                                                        <label className="text-[10px] font-bold text-indigo-400 uppercase">{t('diary.edit_date', {defaultValue: 'Datum & Uhrzeit'})}</label>
                                                        <input type="datetime-local" value={editDate} onChange={e => setEditDate(e.target.value)} className="w-full text-sm p-2.5 border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white" />
                                                    </div>
                                                    <div className="flex flex-col gap-2 mb-3">
                                                        <label className="text-[10px] font-bold text-indigo-400 uppercase">{t('diary.edit_note', {defaultValue: 'Notiz'})}</label>
                                                        <textarea value={editNote} onChange={e => setEditNote(e.target.value)} className="w-full text-sm p-2.5 border border-indigo-100 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 min-h-[80px] bg-white resize-y" />
                                                    </div>
                                                    <div className="flex flex-col sm:flex-row gap-2">
                                                        <button onClick={() => {
                                                            setIsUpdatingGPS(true);
                                                            if (!navigator.geolocation) { alert(t('finance.error_no_gps', { defaultValue: 'Dein Browser unterstützt kein GPS.' })); setIsUpdatingGPS(false); return; }
                                                            navigator.geolocation.getCurrentPosition(
                                                                (pos) => { setEditLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setIsUpdatingGPS(false); },
                                                                (err) => { console.error(err); alert(t('finance.error_gps_failed', { defaultValue: 'GPS konnte nicht abgerufen werden.' })); setIsUpdatingGPS(false); },
                                                                { enableHighAccuracy: true, timeout: 10000 }
                                                            );
                                                        }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 justify-center flex-1 transition-colors">
                                                            <MapPin size={14} className={isUpdatingGPS ? "animate-bounce text-indigo-500" : ""} /> {editLocation ? t('finance.gps_saved', {defaultValue: 'Standort gespeichert ✓'}) : t('diary.update_gps', {defaultValue: 'GPS-Daten taggen'})}
                                                        </button>
                                                        <div className="flex gap-2 flex-1">
                                                            <button onClick={() => setEditingEntryId(null)} className="flex-1 flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 justify-center transition-colors">
                                                                <X size={14} /> {t('actions.cancel', {defaultValue: 'Abbruch'})}
                                                            </button>
                                                            <button onClick={() => handleSaveEdit(place.id)} className="flex-[2] flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 justify-center transition-colors shadow-sm w-full">
                                                                <CheckCircle2 size={14} /> {t('actions.save', {defaultValue: 'Speichern'})}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : place.userNote ? (
                                                <div className="mt-2 text-xs text-indigo-900 bg-indigo-50/50 border border-indigo-100 rounded-lg p-2.5 italic leading-relaxed shadow-sm cursor-pointer hover:bg-indigo-100/50 transition-colors relative group" onClick={() => handleOpenEdit(place)} title={t('diary.click_to_edit', { defaultValue: 'Klicken zum Bearbeiten' })}>
                                                    <PenLine className="absolute top-2 right-2 w-3 h-3 text-indigo-200 group-hover:text-indigo-400" />
                                                    {place.userNote.split('\n').map((line: string, i: number) => (<React.Fragment key={i}>{highlightText(line, globalSearchTerm)}<br/></React.Fragment>))}
                                                </div>
                                            ) : null}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="pb-24 animate-in fade-in duration-500">
       {renderRouteBlock()}
       {renderVisitedDiary()} 
    </div>
  );
};
// --- END OF FILE 438 Zeilen ---