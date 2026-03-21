// 21.03.2026 19:45 - FIX: Applied strict I18N to manual GPS override buttons (replaced hardcoded "(Ändern)") and fixed Maps tooltips.
// src/features/Cockpit/PlanView.tsx

import React, { useMemo, useState, useEffect } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircle, CheckCircle2, Map as MapIcon, ExternalLink, 
  PenLine, X, MapPin, Trash2, Clock, Navigation, Quote, ArrowRight, Banknote, Star, BookOpen, Plus, Minus, MapPinOff
} from 'lucide-react';
import type { LanguageCode, Place, CockpitViewMode } from '../../core/types';
import { INTEREST_DATA } from '../../data/staticData';
import { generateGoogleMapsRouteUrl } from './utils';
import { ExpenseEntryButton } from './ExpenseEntryButton';
import { LocationPickerModal } from './LocationPickerModal';

export const PlanView: React.FC<{ setViewMode?: (mode: CockpitViewMode) => void }> = ({ setViewMode }) => {
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language.substring(0, 2) as LanguageCode;
  
  const { project, updatePlace, togglePlaceVisited, setProject, uiState, setUIState } = useTripStore();
  const { userInputs, analysis, data } = project;
  const { logistics, travelers } = userInputs;
  const routeAnalysis = analysis.routeArchitect;
  const travelerNames = travelers.travelerNames || '';

  const normalizeLevel = (level: string | undefined): 'kompakt' | 'standard' | 'details' => {
      if (level === 'compact' || level === 'kompakt') return 'kompakt';
      if (level === 'standard') return 'standard';
      return 'details';
  };

  const defaultLevel = normalizeLevel(uiState.detailLevel);
  const VIEW_LEVELS = ['kompakt', 'standard', 'details'];
  
  const [dayDetailLevels, setDayDetailLevels] = useState<Record<string, 'kompakt' | 'standard' | 'details'>>({});

  useEffect(() => {
      setDayDetailLevels({});
  }, [uiState.detailLevel]);

  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editLocation, setEditLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showEditLocationPicker, setShowEditLocationPicker] = useState(false);

  const [isAddingCustom, setIsAddingCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customNote, setCustomNote] = useState('');
  const [isFetchingGPS, setIsFetchingGPS] = useState(false);
  const [gpsError, setGpsError] = useState(false);
  const [customLocation, setCustomLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showCustomLocationPicker, setShowCustomLocationPicker] = useState(false);
  
  const [editingSummaryDate, setEditingSummaryDate] = useState<string | null>(null);
  const [editSummaryText, setEditSummaryText] = useState('');

  const globalSearchTerm = uiState.searchTerm || '';
  const [pendingExpense, setPendingExpense] = useState<{title: string, location: any} | null>(null);
  const isRoundtripContext = ['roundtrip', 'mobil'].includes(logistics.mode);

  const hasAnyExpenses = Object.keys(data?.expenses || {}).length > 0;
  const [showDailyExpenses, setShowDailyExpenses] = useState(true);
  const baseCurrency = data?.currencyConfig?.baseCurrency || 'EUR';

  useEffect(() => {
      if (isAddingCustom && !customLocation && navigator.geolocation) {
          setIsFetchingGPS(true);
          setGpsError(false);
          navigator.geolocation.getCurrentPosition(
              (pos) => {
                  setCustomLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                  setIsFetchingGPS(false);
              },
              (err) => {
                  console.warn("Silent GPS fetch failed:", err);
                  setIsFetchingGPS(false);
                  setGpsError(true);
              },
              { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
          );
      }
  }, [isAddingCustom, customLocation]);

  const expensesSummary = useMemo(() => {
      let before = 0;
      let after = 0;
      let total = 0;
      const byDayKey: Record<string, number> = {};

      if (!hasAnyExpenses) return { before, after, total, byDayKey };

      const startMs = userInputs.dates?.start ? new Date(userInputs.dates.start).getTime() : 0;
      const endMs = userInputs.dates?.end ? new Date(userInputs.dates.end).getTime() + 86399999 : Infinity;

      Object.values(data!.expenses || {}).forEach((exp: any) => {
          const rate = data?.currencyConfig?.rates?.find((r: any) => r.currency === exp.currency)?.rate || 1;
          const isBase = !data?.currencyConfig || exp.currency === baseCurrency;
          const baseAmount = isBase ? exp.amount : (exp.amount / rate);
          
          total += baseAmount;
          
          if (exp.timestamp < startMs) {
              before += baseAmount;
          } else if (exp.timestamp > endMs) {
              after += baseAmount;
          } else {
              const dateKey = new Date(exp.timestamp).toISOString().split('T')[0];
              if (!byDayKey[dateKey]) byDayKey[dateKey] = 0;
              byDayKey[dateKey] += baseAmount;
          }
      });
      return { before, after, total, byDayKey };
  }, [data?.expenses, data?.currencyConfig, userInputs.dates, hasAnyExpenses, baseCurrency]);

  const formatCurrency = (val: number) => {
      return new Intl.NumberFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { style: 'currency', currency: baseCurrency }).format(val);
  };

  useEffect(() => {
    if (uiState.selectedPlaceId) {
      setTimeout(() => {
        const element = document.getElementById(`diary-entry-${uiState.selectedPlaceId}`);
        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 100;
          window.scrollTo({ top: y, behavior: 'smooth' });
          element.classList.add('ring-4', 'ring-emerald-400', 'ring-offset-2', 'transition-all', 'duration-500');
          setTimeout(() => element.classList.remove('ring-4', 'ring-emerald-400', 'ring-offset-2'), 3000);
        }
      }, 150);
    }
  }, [uiState.selectedPlaceId]);

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

  const firstDateMs = useMemo(() => {
      let ms = Infinity;
      if (userInputs.dates?.start) {
          ms = new Date(userInputs.dates.start).setHours(0,0,0,0);
      }
      const placesArr = Object.values(data?.places || {});
      const visits = placesArr.filter((p: any) => p.visited && p.visitedAt).map((p: any) => new Date(p.visitedAt).setHours(0,0,0,0));
      if (visits.length > 0) {
          const earliestVisit = Math.min(...visits);
          if (earliestVisit < ms) ms = earliestVisit;
      }
      if (ms === Infinity) ms = new Date().setHours(0,0,0,0);
      return ms;
  }, [userInputs.dates?.start, data?.places]);

  const getRealDay = (dateStr: string) => {
      const visit = new Date(dateStr);
      visit.setHours(0,0,0,0);
      const diff = visit.getTime() - firstDateMs;
      return Math.floor(diff / 86400000) + 1;
  };

  const handleSaveSummary = (dateKey: string) => {
      const newContent = { ...(project.data.content || {}) };
      if (!newContent.diarySummaries) newContent.diarySummaries = {};
      newContent.diarySummaries[dateKey] = editSummaryText.trim();
      setProject({ ...project, data: { ...project.data, content: newContent } });
      setEditingSummaryDate(null);
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

  const handleSaveCustomEntry = (alsoExpense: boolean = false) => {
      if (!customTitle.trim() && !customNote.trim()) return;
      const defaultTitleText = t('diary.default_title', { defaultValue: 'Mein Erlebnis' });
      const newId = `custom_${crypto.randomUUID()}`;
      
      const entryDate = new Date().toISOString();
      const dateKey = entryDate.split('T')[0];

      const newPlace: Place = {
          id: newId, name: customTitle.trim() || defaultTitleText, category: 'custom_diary',
          visited: true, visitedAt: entryDate, userNote: customNote.trim(), location: customLocation || undefined
      };
      
      setProject({ ...project, data: { ...project.data, places: { ...project.data.places, [newId]: newPlace } } });
      
      if (alsoExpense) {
          setPendingExpense({ title: customTitle.trim() || defaultTitleText, location: customLocation });
      }

      if (customNote.trim()) {
          setDayDetailLevels(prev => ({ ...prev, [dateKey]: 'details' }));
      } else {
          setDayDetailLevels(prev => {
              if (prev[dateKey] === 'kompakt' || (!prev[dateKey] && defaultLevel === 'kompakt')) {
                  return { ...prev, [dateKey]: 'standard' };
              }
              return prev;
          });
      }

      setIsAddingCustom(false); setCustomTitle(''); setCustomNote(''); setCustomLocation(null); setGpsError(false);
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
      
      let dateKeyToExpand = new Date().toISOString().split('T')[0];

      if (editDate) {
          const isoDate = new Date(editDate).toISOString();
          updates.visitedAt = isoDate;
          dateKeyToExpand = isoDate.split('T')[0];
      } else {
          const p = project.data.places[id];
          if (p && p.visitedAt) dateKeyToExpand = p.visitedAt.split('T')[0];
      }
      
      updates.location = editLocation || undefined;

      updatePlace(id, updates);
      setEditingEntryId(null);

      if (editNote.trim()) {
          setDayDetailLevels(prev => ({ ...prev, [dateKeyToExpand]: 'details' }));
      }
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
                const realDay = getRealDay(p.visitedAt as string);
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

    const allDatesSet = new Set<string>();
    const hasFilter = globalSearchTerm || activeFilters.length > 0 || uiState.visitedFilter === 'unvisited';

    if (!hasFilter) {
        if (userInputs.dates?.start && userInputs.dates?.end) {
            let current = new Date(userInputs.dates.start);
            current.setHours(12, 0, 0, 0); 
            const end = new Date(userInputs.dates.end);
            end.setHours(12, 0, 0, 0);
            let safeguard = 0;
            while (current <= end && safeguard < 100) {
                allDatesSet.add(current.toISOString().split('T')[0]);
                current.setDate(current.getDate() + 1);
                safeguard++;
            }
        }
    }
    
    Object.keys(groupedPlaces).forEach(k => allDatesSet.add(k));

    if (globalSearchTerm) {
        const term = globalSearchTerm.toLowerCase();
        Object.entries(project.data.content?.diarySummaries || {}).forEach(([k, text]) => {
            if (typeof text === 'string' && text.toLowerCase().includes(term)) {
                allDatesSet.add(k);
            }
        });
    }

    const allDates = Array.from(allDatesSet).sort();
    const diarySummaries = project.data.content?.diarySummaries || {};

    return (
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-emerald-100 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-slate-50 pb-4 gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-xl shrink-0"><CheckCircle size={24} /></div>
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-slate-900">{t('diary.title', { defaultValue: 'Live-Reisetagebuch' })}</h2>
                        </div>
                        <p className="text-sm text-slate-500">{t('diary.subtitle', { defaultValue: 'Deine besuchten Orte.' })}</p>
                    </div>
                </div>
                
                <div className="hidden sm:flex items-center gap-2">
                    {hasAnyExpenses && (
                        <button onClick={() => setShowDailyExpenses(!showDailyExpenses)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm border ${showDailyExpenses ? 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`} title={t('diary.toggle_expenses', { defaultValue: 'Ausgaben im Tagebuch anzeigen/ausblenden' })}>
                            <Banknote size={14} /> {showDailyExpenses ? t('diary.expenses_on', { defaultValue: 'Ausgaben' }) : t('diary.expenses_off', { defaultValue: 'Ausgaben' })}
                        </button>
                    )}
                    <ExpenseEntryButton travelers={travelerNames} mode="standalone" />
                    <button onClick={() => { setIsAddingCustom(!isAddingCustom); setGpsError(false); setIsFetchingGPS(false); }} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-colors shadow-sm"><PenLine size={14} /> {t('diary.add_custom', { defaultValue: 'Eigener Eintrag' })}</button>
                </div>
            </div>

            <div className="flex sm:hidden gap-2 mb-4 flex-wrap">
                {hasAnyExpenses && (
                    <button onClick={() => setShowDailyExpenses(!showDailyExpenses)} className={`flex justify-center items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold shadow-sm border ${showDailyExpenses ? 'bg-red-50 text-red-700 border-red-100' : 'bg-slate-50 text-slate-500 border-slate-200'}`} title={t('diary.toggle_expenses', { defaultValue: 'Ausgaben im Tagebuch anzeigen/ausblenden' })}>
                        <Banknote size={16} />
                    </button>
                )}
                <ExpenseEntryButton travelers={travelerNames} mode="standalone" isMobile={true} />
                <button onClick={() => { setIsAddingCustom(!isAddingCustom); setGpsError(false); setIsFetchingGPS(false); }} className="flex-1 flex justify-center items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-bold shadow-sm"><PenLine size={16} /> {t('diary.add_note', { defaultValue: 'Notiz' })}</button>
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
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                            <PenLine size={16} className="text-indigo-500" /> {t('diary.what_discovered', { defaultValue: 'Was hast du entdeckt?' })}
                            
                            {/* GPS INDICATOR ALS KLICKBARER BUTTON FÜR DEN PICKER */}
                            <button 
                                onClick={() => setShowCustomLocationPicker(true)}
                                className="ml-1 p-1 rounded hover:bg-indigo-100 transition-colors"
                                title={t('map.picker_title', { defaultValue: 'Ort ändern / wählen' })}
                            >
                                {isFetchingGPS && <MapPin className="w-4 h-4 text-indigo-400 animate-pulse" />}
                                {!isFetchingGPS && customLocation && <MapPin className="w-4 h-4 text-indigo-600" />}
                                {!isFetchingGPS && !customLocation && gpsError && <MapPinOff className="w-4 h-4 text-red-400 opacity-70" />}
                                {!isFetchingGPS && !customLocation && !gpsError && <MapPin className="w-4 h-4 text-slate-400" />}
                            </button>

                        </h4>
                        <button onClick={() => setIsAddingCustom(false)} className="text-slate-400 hover:text-slate-600"><X size={16}/></button>
                    </div>
                    <input type="text" placeholder={t('diary.title_placeholder', { defaultValue: 'Titel (z.B. Ein kleines Café am Eck)' })} className="w-full text-sm p-3 mb-3 border border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder:text-slate-300 font-medium text-slate-800 shadow-sm" value={customTitle} onChange={e => setCustomTitle(e.target.value)} autoFocus />
                    <textarea placeholder={t('diary.note_placeholder', { defaultValue: 'Deine Erlebnisse oder Notizen...' })} className="w-full text-sm p-3 mb-3 border border-indigo-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white placeholder:text-slate-300 resize-y min-h-[80px] shadow-sm leading-relaxed" value={customNote} onChange={e => setCustomNote(e.target.value)} />
                    <div className="flex flex-col gap-3">
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

            {allDates.length === 0 && !isAddingCustom && (
                <div className="text-center py-8 text-slate-400 text-sm italic">
                    {hasFilter
                        ? t('diary.no_search_results', { defaultValue: 'Keine Einträge für diesen Filter gefunden.' })
                        : t('diary.empty_state', { defaultValue: 'Noch keine Einträge. Checke bei Orten ein oder erstelle einen eigenen Eintrag!' })
                    }
                </div>
            )}

            {showDailyExpenses && expensesSummary.before > 0 && (
                <div className="mb-6 bg-white border border-red-100 rounded-xl p-4 flex items-center justify-between shadow-sm animate-in fade-in">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-500 rounded-lg"><Banknote size={18} /></div>
                        <div>
                            <span className="block text-sm font-bold text-slate-800">{t('diary.expenses_before', { defaultValue: 'Vor der Reise' })}</span>
                            <span className="block text-[10px] text-slate-500 uppercase tracking-wider">{t('diary.expenses_advance', { defaultValue: 'Vorabkosten & Buchungen' })}</span>
                        </div>
                    </div>
                    <span className="text-lg font-black text-red-600">{formatCurrency(expensesSummary.before)}</span>
                </div>
            )}

            <div className="space-y-1 relative">
                {allDates.length > 0 && <div className="absolute top-8 bottom-4 left-[27px] w-0.5 bg-emerald-100 z-0"></div>}

                {allDates.map((dateKey) => {
                    const placesForThisDay = groupedPlaces[dateKey] || [];
                    const realDay = getRealDay(dateKey);
                    const dateObj = new Date(dateKey);
                    const dateStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { weekday: 'long', day: '2-digit', month: 'long' }).format(dateObj);

                    const currentDayLevel = dayDetailLevels[dateKey] || defaultLevel;
                    const currentLevelIndex = VIEW_LEVELS.indexOf(currentDayLevel);
                    const canStepDown = currentLevelIndex > 0;
                    const canStepUp = currentLevelIndex < VIEW_LEVELS.length - 1;
                    
                    const handleStepUp = () => {
                      if (canStepUp) setDayDetailLevels(prev => ({ ...prev, [dateKey]: VIEW_LEVELS[currentLevelIndex + 1] as any }));
                    };
                    const handleStepDown = () => {
                      if (canStepDown) setDayDetailLevels(prev => ({ ...prev, [dateKey]: VIEW_LEVELS[currentLevelIndex - 1] as any }));
                    };

                    const showPlaces = currentDayLevel !== 'kompakt';
                    const showUserNotes = currentDayLevel === 'details';

                    return (
                        <div key={dateKey} className="relative z-10 pb-4">
                            <div className="flex items-center gap-4 my-6 flex-wrap">
                                <div className="h-px bg-emerald-200 flex-1 min-w-[20px]"></div>
                                
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm flex items-center gap-2">
                                        {t('diary.real_day', { defaultValue: currentLang === 'en' ? 'Travel Day' : 'Reisetag' })} {realDay} <span className="text-emerald-600/60 font-medium">|</span> {dateStr}
                                        <button onClick={() => {
                                            setEditingSummaryDate(dateKey);
                                            setEditSummaryText(diarySummaries[dateKey] || '');
                                        }} className="ml-2 text-emerald-500 hover:text-emerald-700 transition-colors" title={t('diary.edit_summary', { defaultValue: 'Tageszusammenfassung bearbeiten' })}>
                                            <PenLine size={12} />
                                        </button>
                                    </span>

                                    {showDailyExpenses && expensesSummary.byDayKey[dateKey] > 0 && (
                                        <span className="text-xs font-bold text-red-700 bg-red-50 px-3 py-1 rounded-full border border-red-100 shadow-sm flex items-center gap-1.5" title={t('diary.daily_expenses', { defaultValue: 'Ausgaben an diesem Tag' })}>
                                            <Banknote size={12} /> {formatCurrency(expensesSummary.byDayKey[dateKey])}
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-0.5 bg-white rounded p-0.5 border border-emerald-100 shadow-sm no-print">
                                    <button onClick={handleStepDown} disabled={!canStepDown} className={`p-1 rounded transition-all ${canStepDown ? 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'}`} title={t('diary.less_details', { defaultValue: 'Weniger Details' })}><Minus className="w-3 h-3" /></button>
                                    <div className="flex gap-0.5 px-1 items-center">{VIEW_LEVELS.map((level, idx) => (<div key={level} className={`w-1 h-1 rounded-full ${idx <= currentLevelIndex ? 'bg-emerald-500' : 'bg-slate-200'}`} />))}</div>
                                    <button onClick={handleStepUp} disabled={!canStepUp} className={`p-1 rounded transition-all ${canStepUp ? 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 cursor-not-allowed'}`} title={t('diary.more_details', { defaultValue: 'Mehr Details' })}><Plus className="w-3 h-3" /></button>
                                </div>

                                <div className="h-px bg-emerald-200 flex-1 min-w-[20px]"></div>
                            </div>

                            {/* FREITEXT TAGES-ZUSAMMENFASSUNG */}
                            {editingSummaryDate === dateKey ? (
                                <div className="mb-6 p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl animate-in fade-in slide-in-from-top-1 shadow-sm">
                                    <label className="text-[10px] font-bold text-emerald-600 uppercase mb-2 flex items-center gap-1"><PenLine size={12}/> {t('diary.summary_title', {defaultValue: 'Tageszusammenfassung'})}</label>
                                    <textarea 
                                        value={editSummaryText} 
                                        onChange={e => setEditSummaryText(e.target.value)} 
                                        placeholder={t('diary.summary_placeholder', {defaultValue: 'Wie war dein Tag? Highlights, Wetter, Besonderes...'})}
                                        className="w-full text-sm p-3 border border-emerald-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300 min-h-[80px] bg-white resize-y mb-3 shadow-inner" 
                                        autoFocus
                                    />
                                    <div className="flex gap-2">
                                        <button onClick={() => setEditingSummaryDate(null)} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-xl hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                                            <X size={14} /> {t('actions.cancel', {defaultValue: 'Abbruch'})}
                                        </button>
                                        <button onClick={() => handleSaveSummary(dateKey)} className="flex-[2] flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors shadow-sm">
                                            <CheckCircle2 size={14} /> {t('actions.save', {defaultValue: 'Speichern'})}
                                        </button>
                                    </div>
                                </div>
                            ) : diarySummaries[dateKey] ? (
                                <div className="mb-6 text-sm text-slate-700 bg-white border border-emerald-100 rounded-xl p-4 shadow-sm italic leading-relaxed relative group cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all" onClick={() => {
                                    setEditingSummaryDate(dateKey);
                                    setEditSummaryText(diarySummaries[dateKey]);
                                }} title={t('diary.click_to_edit', { defaultValue: 'Klicken zum Bearbeiten' })}>
                                    <PenLine className="absolute top-3 right-3 w-3 h-3 text-emerald-200 group-hover:text-emerald-500 transition-colors" />
                                    {diarySummaries[dateKey].split('\n').map((line: string, i: number) => (
                                        <React.Fragment key={i}>{highlightText(line, globalSearchTerm)}<br/></React.Fragment>
                                    ))}
                                </div>
                            ) : null}

                            {/* BESUCHTE ORTE DES TAGES */}
                            {showPlaces && placesForThisDay.map((place: any) => {
                                const safeTimeDate = place.visitedAt ? new Date(place.visitedAt as string) : new Date();
                                const timeStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(safeTimeDate);
                                const isCustomEntry = place.category === 'custom_diary';
                                const categoryLabel = isCustomEntry ? t('diary.custom_entry_label', { defaultValue: 'Eigener Eintrag' }) : (INTEREST_DATA[place.category] ? resolveLabel(INTEREST_DATA[place.category]) : place.category);
                                const rating = place.userRating || 0;

                                return (
                                    <div key={place.id} id={`diary-entry-${place.id}`} className="relative pl-14 py-2">
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
                                                        <button onClick={(e) => {
                                                            e.stopPropagation();
                                                            setShowEditLocationPicker(true);
                                                        }} className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold bg-white text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 justify-center flex-1 transition-colors">
                                                            {editLocation ? (
                                                                <><MapPin size={14} className="text-emerald-500" /> {t('finance.gps_saved', {defaultValue: 'Standort gespeichert ✓'})} ({t('actions.change', {defaultValue: 'Ändern'})})</>
                                                            ) : (
                                                                <><MapPin size={14} className="text-slate-400" /> {t('diary.update_gps', {defaultValue: 'GPS-Daten taggen'})}</>
                                                            )}
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
                                            ) : (showUserNotes && place.userNote) ? (
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

            {showDailyExpenses && (expensesSummary.after > 0 || expensesSummary.total > 0) && (
                <div className="mt-8 space-y-3 relative z-10 animate-in fade-in">
                    {expensesSummary.after > 0 && (
                        <div className="bg-white border border-red-100 rounded-xl p-4 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-50 text-red-500 rounded-lg"><Banknote size={18} /></div>
                                <div>
                                    <span className="block text-sm font-bold text-slate-800">{t('diary.expenses_after', { defaultValue: 'Nach der Reise' })}</span>
                                    <span className="block text-[10px] text-slate-500 uppercase tracking-wider">{t('diary.expenses_subsequent', { defaultValue: 'Nachträgliche Kosten' })}</span>
                                </div>
                            </div>
                            <span className="text-lg font-black text-red-600">{formatCurrency(expensesSummary.after)}</span>
                        </div>
                    )}
                    
                    {expensesSummary.total > 0 && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-red-100 text-red-600 rounded-xl"><Banknote size={24} /></div>
                                <div>
                                    <span className="block text-base font-black text-red-900 uppercase tracking-wider">{t('diary.expenses_total', { defaultValue: 'Gesamte Reisekosten' })}</span>
                                    <span className="block text-xs text-red-700/80 font-medium mt-0.5">{t('diary.expenses_total_sub', { defaultValue: 'Alle Ausgaben inkl. Vorabkosten' })}</span>
                                </div>
                            </div>
                            <span className="text-2xl font-black text-red-600">{formatCurrency(expensesSummary.total)}</span>
                        </div>
                    )}
                </div>
            )}

            <LocationPickerModal 
                isOpen={showCustomLocationPicker} 
                onClose={() => setShowCustomLocationPicker(false)} 
                initialLocation={customLocation} 
                onSave={(loc) => setCustomLocation(loc)} 
            />

            <LocationPickerModal 
                isOpen={showEditLocationPicker} 
                onClose={() => setShowEditLocationPicker(false)} 
                initialLocation={editLocation} 
                onSave={(loc) => setEditLocation(loc)} 
            />

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
// --- END OF FILE 707 Zeilen ---