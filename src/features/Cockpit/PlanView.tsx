// 22.02.2026 16:45 - UX: Added confirmation prompt before undoing a check-in and implemented 5-star Emotion Rating per diary entry.
// 22.02.2026 12:30 - I18N: Replaced all hardcoded German texts in Route and Diary sections with translation keys.
// 21.02.2026 18:30 - FEAT: Added "Save & Expense" bridge to the Diary form. Automatically triggers the expense modal.
// src/features/Cockpit/PlanView.tsx

import React, { useMemo, useState } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, CheckCircle2, Map as MapIcon, ExternalLink, 
  PenLine, X, MapPin, Trash2, Clock, Navigation, Quote, ArrowRight, Banknote, Star
} from 'lucide-react';
import type { LanguageCode, Place } from '../../core/types';
import { INTEREST_DATA } from '../../data/staticData';
import { generateGoogleMapsRouteUrl } from './utils';
import { ExpenseEntryButton } from './ExpenseEntryButton';

export const PlanView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const { project, updatePlace, togglePlaceVisited, setProject } = useTripStore();
  const { userInputs, analysis, data } = project;
  const { logistics, travelers } = userInputs;
  const routeAnalysis = analysis.routeArchitect;
  const travelerNames = travelers.travelerNames || '';

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [customLocation, setCustomLocation] = useState<{lat: number, lng: number} | null>(null);

  const [pendingExpense, setPendingExpense] = useState<{title: string, location: any} | null>(null);

  const isRoundtripContext = ['roundtrip', 'mobil'].includes(logistics.mode);

  const resolveLabel = (item: any): string => {
    if (!item || !item.label) return '';
    if (typeof item.label === 'string') return item.label;
    return (item.label as any)[currentLang] || (item.label as any)['de'] || '';
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

  // FIX: Safety prompt for normal check-ins
  const handleUndoCheckin = (id: string) => {
      if (confirm(t('diary.undo_confirm', { defaultValue: 'Willst du diesen Check-in wirklich rückgängig machen?' }))) {
          togglePlaceVisited(id);
      }
  };

  const renderVisitedDiary = () => {
    const visitedPlaces = Object.values(data?.places || {})
        .filter((p: any) => p.visited && p.visitedAt)
        .sort((a: any, b: any) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime());

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

            {visitedPlaces.length === 0 && !isAddingCustom && (<div className="text-center py-8 text-slate-400 text-sm italic">{t('diary.empty_state', { defaultValue: 'Noch keine Einträge. Checke bei Orten ein oder erstelle einen eigenen Eintrag!' })}</div>)}

            <div className="space-y-1">
                {visitedPlaces.map((place: any) => {
                    const dateObj = new Date(place.visitedAt);
                    const dateStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(dateObj);
                    const timeStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(dateObj);
                    const isCustomEntry = place.category === 'custom_diary';
                    const categoryLabel = isCustomEntry ? t('diary.custom_entry_label', { defaultValue: 'Eigener Eintrag' }) : (INTEREST_DATA[place.category] ? resolveLabel(INTEREST_DATA[place.category]) : place.category);
                    
                    const rating = place.userRating || 0;

                    return (
                        <div key={place.id} className="relative pl-6 ml-3 py-2 border-l-2 border-emerald-200">
                            <div className="absolute -left-[9px] top-6 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                            <div className={`border rounded-xl p-3 hover:shadow-md transition-all ${isCustomEntry ? 'bg-indigo-50/30 border-indigo-100' : 'bg-emerald-50/30 border-emerald-100 hover:bg-emerald-50'}`}>
                                
                                <div className="flex justify-between items-start mb-1 gap-2">
                                    <h4 className={`font-bold text-sm leading-tight ${isCustomEntry ? 'text-indigo-900' : 'text-slate-800'}`}>{place.name}</h4>
                                    
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${isCustomEntry ? 'bg-indigo-100 text-indigo-700' : 'bg-emerald-100 text-emerald-700'}`}><Clock size={10} /> {dateStr}, {timeStr}</span>
                                        <ExpenseEntryButton placeId={place.id} defaultTitle={place.name} travelers={travelerNames} mode="diary" />
                                        <button onClick={() => setEditingNoteId(editingNoteId === place.id ? null : place.id)} className={`p-1.5 rounded transition-colors shadow-sm border ${editingNoteId === place.id ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border-slate-200'}`} title={t('diary.edit_note', { defaultValue: 'Notiz bearbeiten' })}><PenLine size={12} /></button>
                                        {isCustomEntry ? (
                                            <button onClick={() => handleDeleteCustom(place.id)} className="p-1.5 rounded bg-white text-slate-400 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm border border-slate-200" title={t('diary.delete_entry', { defaultValue: 'Eintrag löschen' })}><Trash2 size={12} /></button>
                                        ) : (
                                            <button onClick={() => handleUndoCheckin(place.id)} className="p-1.5 rounded bg-white text-emerald-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors shadow-sm border border-slate-200 group" title={t('diary.undo_checkin', { defaultValue: 'Check-in rückgängig machen' })}><CheckCircle2 size={12} className="group-hover:hidden" /><X size={12} className="hidden group-hover:block" /></button>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="text-xs text-slate-500 flex gap-1 items-center font-medium mb-2">
                                    {isCustomEntry ? <PenLine size={10} className="text-indigo-400" /> : <MapIcon size={10} className="text-emerald-400" />} {categoryLabel}
                                    {place.location?.lat && (<a href={`https://www.google.com/maps/search/?api=1&query=${place.location.lat},${place.location.lng}`} target="_blank" rel="noopener noreferrer" className="ml-2 flex items-center gap-0.5 text-blue-500 hover:underline" title={t('sights.open_map', { defaultValue: 'Auf Karte öffnen' })}><MapPin size={10}/> GPS</a>)}
                                </div>

                                {/* FEAT: 5-Star Emotion Rating */}
                                <div className="flex items-center gap-1 mb-2">
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

                                {editingNoteId === place.id ? (
                                    <div className="mt-2 animate-in fade-in slide-in-from-top-1"><textarea value={place.userNote || ''} onChange={(e) => updatePlace(place.id, { userNote: e.target.value })} placeholder={t('diary.personal_note_placeholder', { defaultValue: 'Meine persönliche Notiz...' })} className="w-full text-xs text-indigo-900 bg-indigo-50/50 border border-indigo-200 rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white resize-y min-h-[60px]" autoFocus /></div>
                                ) : place.userNote ? (
                                    <div className="mt-2 text-xs text-indigo-900 bg-white/60 border border-indigo-100 rounded-lg p-2.5 italic leading-relaxed shadow-sm cursor-pointer hover:bg-indigo-50/30 transition-colors relative group" onClick={() => setEditingNoteId(place.id)} title={t('diary.click_to_edit', { defaultValue: 'Klicken zum Bearbeiten' })}>
                                        <PenLine className="absolute top-2 right-2 w-3 h-3 text-indigo-200 group-hover:text-indigo-400" />
                                        {place.userNote.split('\n').map((line: string, i: number) => (<React.Fragment key={i}>{line}<br/></React.Fragment>))}
                                    </div>
                                ) : null}
                            </div>
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
// --- END OF FILE 279 Zeilen ---