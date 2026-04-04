// 04.04.2026 22:00 - UX/FIX: Refactored target stop matching logic to bi-directional includes() for flawless label detection, matching the main store perfectly.
// src/features/Cockpit/SightCard/SightCardMeta.tsx

import React from 'react';
import { Sun, CloudRain, ExternalLink, Check, BookOpen, Globe, Search, Map as MapIcon, Sparkles, MapPin, Target } from 'lucide-react';
import { VALID_POI_CATEGORIES, INTEREST_DATA } from '../../../data/interests';
import { useTripStore } from '../../../store/useTripStore';
import { calculateDistance } from '../../../core/utils/geo';

interface SightCardMetaProps {
  data: any;
  customCategory: string;
  customDuration: number;
  isSpecial: boolean;
  specialType: string;
  isHotel: boolean;
  priceEstimate: string | null;
  bookingUrl: string | null;
  sourceUrl: string | null;
  websiteUrl: string | null;
  isSelected: boolean;
  onCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDurationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHotelSelect: (e: React.MouseEvent) => void;
  onShowMap: (e: React.MouseEvent) => void;
  ensureAbsoluteUrl: (url: string | undefined) => string | undefined;
  t: any;
  i18n?: any; 
}

export const SightCardMeta: React.FC<SightCardMetaProps> = ({
  data,
  customCategory,
  customDuration,
  isSpecial,
  specialType,
  isHotel,
  bookingUrl,
  sourceUrl,
  websiteUrl,
  isSelected,
  onCategoryChange,
  onDurationChange,
  onHotelSelect,
  onShowMap,
  ensureAbsoluteUrl,
  t,
  i18n
}) => {
  const { project } = useTripStore();
  
  const currentLang = i18n?.language?.substring(0, 2) || 'de';

  const isFood = (customCategory && ['food', 'restaurant'].includes(customCategory.toLowerCase())) || 
                 (data.category && ['food', 'restaurant'].includes(data.category.toLowerCase()));

  const getGoogleSearchQuery = () => {
    const name = data.name || data.official_name || data.name_official || '';
    const city = data.city || (data.address ? data.address.split(',').pop()?.trim() : '') || '';
    
    const { logistics } = project.userInputs;
    const tripRegion = logistics.mode === 'stationaer' ? logistics.stationary.region : logistics.roundtrip.region;
    const tripCountry = logistics.target_countries?.[0] || '';
    
    const regionStr = tripRegion && !city.includes(tripRegion) ? tripRegion : '';
    const countryStr = tripCountry && !city.includes(tripCountry) ? tripCountry : '';
    
    const awardContext = data.awards && data.awards.length > 0 ? data.awards[0] : '';
    const context = awardContext || (isFood ? 'Restaurant' : '');

    return `${name} ${city} ${regionStr} ${countryStr} ${context}`.replace(/\s+/g, ' ').trim();
  };

  const getSmartGuideLink = () => {
      if (data.guide_link) return data.guide_link;
      if (data.awards && data.awards.length > 0) return `https://www.google.com/search?q=${encodeURIComponent(getGoogleSearchQuery())}`;
      return !isHotel ? sourceUrl : null;
  };

  const getGoogleMapsUrl = () => {
      const query = [data.official_name || data.name, data.address || data.city].filter(Boolean).join(', ');
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  const guideLink = getSmartGuideLink();

  const resolveHotelLocation = (hotelRef: string | undefined) => {
      if (!hotelRef) return null;
      const allPlaces = project.data?.places || {};
      const place = allPlaces[hotelRef];
      if (place && place.location?.lat) return { lat: place.location.lat, lng: place.location.lng };
      const matched = Object.values(allPlaces).find((p: any) => p.name?.toLowerCase() === hotelRef.toLowerCase() || p.official_name?.toLowerCase() === hotelRef.toLowerCase());
      if (matched && matched.location?.lat) return { lat: matched.location.lat, lng: matched.location.lng };
      return null;
  };

  // --- HOTEL SPECIFIC LOGIC ---
  let assignedBadge = null;
  let bookingSearchUrl = null;
  let computedDistanceToHotel = null;

  if (isHotel) {
      let assignedStopIndex = -1;
      let assignedStopName = '';
      let isActuallySelected = false;

      const logistics = project.userInputs.logistics;
      if (logistics.mode === 'mobil' && logistics.roundtrip?.stops) {
          
          logistics.roundtrip.stops.forEach((stop: any, idx: number) => {
              if (stop.hotel === data.id) {
                  assignedStopIndex = idx + 1;
                  assignedStopName = stop.location || '';
                  isActuallySelected = true;
              }
          });

          if (!isActuallySelected) {
              const hCity = (data.city || '').toLowerCase();
              const hAddr = (data.address || '').toLowerCase();
              const hName = (data.name || '').toLowerCase();
              const hReasoning = (data.location_match || '').toLowerCase();
              
              logistics.roundtrip.stops.forEach((stop: any, idx: number) => {
                  const sLoc = (stop.location || '').replace(/Region\s+/i, '').trim().toLowerCase();
                  if (sLoc && sLoc.length > 2) {
                      const match1 = hCity.includes(sLoc) || (hCity.length > 2 && sLoc.includes(hCity));
                      const match2 = hAddr.includes(sLoc) || (hAddr.length > 2 && sLoc.includes(hAddr));
                      const match3 = hName.includes(sLoc) || (hName.length > 2 && sLoc.includes(hName));
                      const match4 = hReasoning.includes(sLoc);

                      if (match1 || match2 || match3 || match4) {
                          if (assignedStopIndex === -1) {
                              assignedStopIndex = idx + 1;
                              assignedStopName = stop.location || '';
                          }
                      }
                  }
              });
          }
      }

      // --- BADGE RENDER ---
      if (assignedStopIndex !== -1 && assignedStopName) {
          if (isActuallySelected) {
              assignedBadge = (
                  <div className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 mb-2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">
                      ✅ {t('sights.hotel_selected_stop', { assignedStopIndex, assignedStopName, defaultValue: `Ausgewählt für Station ${assignedStopIndex} (${assignedStopName})` })}
                  </div>
              );
          } else {
              assignedBadge = (
                  <div className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 mb-2 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-sm">
                      <Target className="w-3.5 h-3.5" /> {t('sights.hotel_option_stop', { assignedStopIndex, assignedStopName, defaultValue: `Option für Station ${assignedStopIndex} (${assignedStopName})` })}
                  </div>
              );
          }
      } else if (logistics.mode === 'stationaer') {
         if (logistics.stationary?.hotel === data.id) {
              assignedBadge = <div className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 mb-2 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-sm">✅ {t('sights.hotel_assigned_stationary', { defaultValue: `Ausgewählte Unterkunft` })}</div>;
         } else {
              assignedBadge = <div className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 mb-2 rounded-md text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-sm"><Target className="w-3.5 h-3.5" /> {t('sights.hotel_option_stationary', { defaultValue: `Option für den Aufenthalt` })}</div>;
         }
      } else if (data.city) {
          assignedBadge = <div className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 mb-2 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200 shadow-sm">📍 {t('sights.hotel_location', { defaultValue: 'Standort:' })} {data.city}</div>;
      }

      // --- BOOKING.COM URL WITH DATES ---
      let checkinDate: Date | null = null;
      let checkoutDate: Date | null = null;

      if (logistics.mode === 'mobil' && logistics.roundtrip?.stops) {
          let dayOffset = 0;
          const startDate = project.userInputs.dates?.start ? new Date(project.userInputs.dates.start) : null;

          logistics.roundtrip.stops.forEach((stop: any, idx: number) => {
              if ((idx + 1) === assignedStopIndex && startDate) {
                  checkinDate = new Date(startDate);
                  checkinDate.setDate(checkinDate.getDate() + dayOffset);
                  checkoutDate = new Date(checkinDate);
                  checkoutDate.setDate(checkoutDate.getDate() + (stop.duration || 1));
              }
              dayOffset += (stop.duration || 1);
          });
      } else if (logistics.mode === 'stationaer') {
          if (project.userInputs.dates?.start && project.userInputs.dates?.end) {
              checkinDate = new Date(project.userInputs.dates.start);
              checkoutDate = new Date(project.userInputs.dates.end);
          }
      }

      const bQuery = encodeURIComponent((data.official_name || data.name || '') + ' ' + (data.city || ''));
      let bUrl = `https://www.booking.com/searchresults.html?ss=${bQuery}`;
      if (checkinDate && checkoutDate) {
          bUrl += `&checkin_year=${checkinDate.getFullYear()}&checkin_month=${checkinDate.getMonth()+1}&checkin_monthday=${checkinDate.getDate()}`;
          bUrl += `&checkout_year=${checkoutDate.getFullYear()}&checkout_month=${checkoutDate.getMonth()+1}&checkout_monthday=${checkoutDate.getDate()}`;
      }
      bookingSearchUrl = bUrl;

  } else {
      let targetHotelLoc: {lat: number, lng: number} | null = null;
      const logistics = project.userInputs.logistics;
      const itinerary = project.itinerary;

      if (logistics.mode === 'stationaer') {
          targetHotelLoc = resolveHotelLocation(logistics.stationary?.hotel);
      } else if (logistics.mode === 'mobil') {
          let assignedDay = -1;
          if (itinerary?.days) {
              itinerary.days.forEach((day: any, idx: number) => {
                  if ((day.activities || day.aktivitaeten || []).some((a: any) => (a.id || a.original_sight_id) === data.id)) {
                      assignedDay = idx;
                  }
              });
          }
          if (assignedDay >= 0 && logistics.roundtrip.stops && logistics.roundtrip.stops.length > 0) {
              let dayCounter = 0;
              for (const stop of logistics.roundtrip.stops) {
                  const nights = stop.duration || 1;
                  if (assignedDay >= dayCounter && assignedDay < dayCounter + nights) {
                      targetHotelLoc = resolveHotelLocation(stop.hotel);
                      break;
                  }
                  dayCounter += nights;
              }
          }
          if (!targetHotelLoc && logistics.roundtrip.stops && logistics.roundtrip.stops.length > 0) {
              let minDist = Infinity;
              logistics.roundtrip.stops.forEach((s: any) => {
                  const loc = resolveHotelLocation(s.hotel);
                  if (loc) {
                      const dist = calculateDistance(data.location.lat, data.location.lng, loc.lat, loc.lng);
                      if (dist < minDist) {
                          minDist = dist;
                          targetHotelLoc = loc;
                      }
                  }
              });
          }
      }

      if (!targetHotelLoc) {
          targetHotelLoc = resolveHotelLocation(logistics.stationary?.hotel);
          if (!targetHotelLoc) {
              const anyHotel = Object.values(project.data?.places || {}).find((p: any) => {
                  const cat = p.userSelection?.customCategory || p.category || '';
                  return cat.toLowerCase() === 'hotel' || cat.toLowerCase() === 'accommodation';
              });
              if (anyHotel && anyHotel.location?.lat) {
                  targetHotelLoc = { lat: anyHotel.location.lat, lng: anyHotel.location.lng };
              }
          }
      }

      if (targetHotelLoc && data.location?.lat && data.location?.lng) {
          computedDistanceToHotel = calculateDistance(data.location.lat, data.location.lng, targetHotelLoc.lat, targetHotelLoc.lng);
      }
  }

  const renderSpecialBadge = () => {
      if (specialType === 'wildcard') {
          return <div className="flex items-center gap-1 font-bold text-purple-600"><Sparkles className="w-3.5 h-3.5" /><span>Wildcard</span></div>;
      }
      if (specialType === 'sunny') {
          return <div className="flex items-center gap-1 font-bold text-amber-600"><Sun className="w-3.5 h-3.5" /><span>{t('sights.sunny_day', { defaultValue: 'Sonnentag' })}</span></div>;
      }
      return <div className="flex items-center gap-1 font-bold text-blue-600"><CloudRain className="w-3.5 h-3.5" /><span>{t('sights.rainy_day', { defaultValue: 'Regentag' })}</span></div>;
  };

  const renderCategory = () => {
      if (isSpecial) return renderSpecialBadge();
      if (isHotel) return <div className="flex items-center gap-1 text-emerald-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span><span>Hotel</span></div>;
      if (isFood) return <div className="flex items-center gap-1 text-orange-700 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span><span>Restaurant</span></div>;
      return (
        <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
            <select 
                value={customCategory} 
                onChange={(e) => { e.stopPropagation(); onCategoryChange(e); }}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent border-none p-0 text-xs font-medium text-gray-600 focus:ring-0 cursor-pointer hover:text-indigo-600 truncate max-w-[120px]"
            >
                {VALID_POI_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{(INTEREST_DATA as any)[cat]?.label?.[currentLang] || cat}</option>
                ))}
                <option value="custom">{t('categories.other', { defaultValue: 'Sonstiges' })}</option>
            </select>
        </div>
      );
  };

  const bestWebLink = websiteUrl || sourceUrl || (!isHotel ? bookingUrl : null);

  return (
    <>
      {assignedBadge}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-1">
          {renderCategory()}
          
          <div className="flex items-center gap-1" title={t('sights.duration_hint', { defaultValue: 'Dauer in Minuten' })}>
             <span className="text-gray-400">|</span><span className="text-gray-400">⏱</span>
             <input 
                type="number" 
                min="0" 
                step="5" 
                value={customDuration || 0} 
                onChange={(e) => { e.stopPropagation(); onDurationChange(e); }} 
                onClick={(e) => e.stopPropagation()} 
                className="w-10 bg-transparent border-b border-gray-300 p-0 text-center text-xs focus:border-indigo-500 focus:ring-0" 
             />
             <span className="text-[10px] font-medium">Min</span>
          </div>
          
          {computedDistanceToHotel !== null && (
              <div className="flex items-center gap-0.5 text-slate-400" title={t('sights.distance_to_hotel', { defaultValue: 'Entfernung zur Unterkunft' })}>
                  <span className="text-gray-400 mr-0.5">|</span>
                  <MapPin className="w-3 h-3" />
                  <span className="text-[10px] font-medium">{computedDistanceToHotel < 1 ? (computedDistanceToHotel * 1000).toFixed(0) + ' m' : computedDistanceToHotel.toFixed(1) + ' km'}</span>
              </div>
          )}
          
          <div className="flex-1"></div>

          <button onClick={onShowMap} className="text-gray-400 hover:text-indigo-600 transition-colors mr-1" title={t('sights.show_on_our_map', { defaultValue: 'Auf unserer Karte zeigen' })}>
            <MapIcon className="w-3.5 h-3.5" />
          </button>
          
          <a href={getGoogleMapsUrl()} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700 transition-colors mr-1" title={t('sights.open_google_maps', { defaultValue: 'Auf Google Maps öffnen' })}>
            <MapPin className="w-3.5 h-3.5" />
          </a>

          {isHotel && (
            <div className="flex items-center gap-1 mr-1">
               <button onClick={onHotelSelect} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all shadow-sm ${isSelected ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'}`}>
                  {isSelected ? (<><Check className="w-3 h-3" /> {t('sights.selected', { defaultValue: 'Ausgewählt' })}</>) : (t('sights.select', { defaultValue: 'Wählen' }))}
              </button>
            </div>
          )}

          {isHotel && bookingSearchUrl && (
               <a href={bookingSearchUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded shadow-sm transition-colors mr-1" title={t('sights.booking_search', { defaultValue: 'Preise & Verfügbarkeit prüfen' })}>
                   Booking.com <ExternalLink className="w-3 h-3" />
               </a>
          )}
          
          {bestWebLink && (
               <a href={ensureAbsoluteUrl(bestWebLink)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-white hover:bg-slate-50 border border-slate-200 px-2 py-0.5 rounded shadow-sm transition-colors mr-1" title={t('sights.website', { defaultValue: 'Zur Website' })}>
                  <Globe className="w-3 h-3" /> Website
               </a>
          )}
          
          {guideLink && !isHotel && (
              <a href={ensureAbsoluteUrl(guideLink)} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-700 transition-colors mr-1" title={data.awards && data.awards.length > 0 ? t('sights.search_guide', { award: data.awards[0], defaultValue: 'Suche im Guide' }) : t('sights.open_guide', { defaultValue: 'Zum Guide Eintrag' })}>
                  <BookOpen className="w-3.5 h-3.5" />
              </a>
          )}
          
          <a href={`https://www.google.com/search?q=${encodeURIComponent(getGoogleSearchQuery())}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors ml-1" title={t('sights.web_search', { query: getGoogleSearchQuery(), defaultValue: 'Web-Suche' })}><Search className="w-3.5 h-3.5" /></a>
      </div>
    </>
  );
};
// --- END OF FILE 295 Zeilen ---