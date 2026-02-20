// 21.02.2026 00:30 - UX: Cleaned up Meta Bar. Removed Live-Check and Price to avoid redundancy, as they are now elegantly displayed in SightCardBody.
// 09.02.2026 18:05 - FEAT: Traffic Light UI for Live Check.
// 11.02.2026 19:15 - FIX: Smart Links (Search & Guide) with Award Context.
// src/features/Cockpit/SightCard/SightCardMeta.tsx

import React from 'react';
import { Sun, CloudRain, ExternalLink, Check, BookOpen, Globe, Search, Map as MapIcon, Sparkles } from 'lucide-react';
import { VALID_POI_CATEGORIES, INTEREST_DATA } from '../../../data/interests';

interface SightCardMetaProps {
  data: any;
  customCategory: string;
  customDuration: number;
  isSpecial: boolean;
  specialType: string;
  isHotel: boolean;
  priceEstimate: string | null; // Kept in interface for backwards compatibility, but not rendered here anymore
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
  t
}) => {

  // FIX: Smart Search Query now includes Awards context
  const getGoogleSearchQuery = () => {
    const name = data.name || data.official_name || data.name_official || '';
    const city = data.city || (data.address ? data.address.split(',').pop()?.trim() : '') || '';
    
    // Check for Awards (e.g. "Michelin", "Gault&Millau")
    const awardContext = data.awards && data.awards.length > 0 ? data.awards[0] : '';
    const context = awardContext || 'Restaurant';

    return `${name} ${city} ${context}`.trim();
  };

  // FIX: Smart Guide Link Fallback
  // If no explicit guide_link exists, generate a Google Search specific to the award/guide.
  const getSmartGuideLink = () => {
      if (data.guide_link) return data.guide_link;
      
      // Fallback: Build a search URL specific to the awards
      if (data.awards && data.awards.length > 0) {
          return `https://www.google.com/search?q=${encodeURIComponent(getGoogleSearchQuery())}`;
      }
      
      // Fallback for Hotels or if nothing else exists (legacy behavior)
      return !isHotel ? sourceUrl : null;
  };

  const guideLink = getSmartGuideLink();

  const renderSpecialBadge = () => {
      if (specialType === 'wildcard') {
          return <div className="flex items-center gap-1 font-bold text-purple-600"><Sparkles className="w-3.5 h-3.5" /><span>Wildcard</span></div>;
      }
      if (specialType === 'sunny') {
          return <div className="flex items-center gap-1 font-bold text-amber-600"><Sun className="w-3.5 h-3.5" /><span>Sonnentag</span></div>;
      }
      return <div className="flex items-center gap-1 font-bold text-blue-600"><CloudRain className="w-3.5 h-3.5" /><span>Regentag</span></div>;
  };

  const isFood = (customCategory && ['food', 'restaurant'].includes(customCategory.toLowerCase())) || 
                 (data.category && ['food', 'restaurant'].includes(data.category.toLowerCase()));

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
                <option key={cat} value={cat}>{(INTEREST_DATA as any)[cat]?.label?.[t('lang', { defaultValue: 'de' })] || cat}</option>
                ))}
                <option value="custom">{t('categories.other', { defaultValue: 'Sonstiges' })}</option>
            </select>
        </div>
      );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 mb-1">
        {renderCategory()}
        
        <div className="flex items-center gap-1" title={t('sights.duration_hint', { defaultValue: 'Dauer in Stunden' })}>
           <span className="text-gray-400">|</span><span className="text-gray-400">⏱</span>
           <input type="number" min="0" step="0.5" value={customDuration || 0} onChange={(e) => { e.stopPropagation(); onDurationChange(e); }} onClick={(e) => e.stopPropagation()} className="w-8 bg-transparent border-b border-gray-300 p-0 text-center text-xs focus:border-indigo-500 focus:ring-0" />
           <span>h</span>
        </div>
        
        <div className="flex-1"></div>

        {/* MAP BUTTON */}
        <button onClick={onShowMap} className="text-gray-400 hover:text-indigo-600 transition-colors mr-1" title={t('sights.show_on_map', { defaultValue: 'Auf Karte zeigen' })}>
          <MapIcon className="w-3.5 h-3.5" />
        </button>

        {isHotel && (
          <div className="flex items-center gap-1 mr-2">
             {bookingUrl && (<a href={ensureAbsoluteUrl(bookingUrl)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-2 py-0.5 rounded shadow-sm transition-colors">Booking <ExternalLink className="w-3 h-3" /></a>)}
             <button onClick={onHotelSelect} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border transition-all shadow-sm ${isSelected ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700' : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'}`}>
                {isSelected ? (<><Check className="w-3 h-3" /> {t('sights.selected', { defaultValue: 'Ausgewählt' })}</>) : (t('sights.select', { defaultValue: 'Wählen' }))}
            </button>
          </div>
        )}
        
        {/* GUIDE LINK BUTTON - Now Smart */}
        {guideLink && (
            <a href={ensureAbsoluteUrl(guideLink)} target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-700 transition-colors" title={data.awards && data.awards.length > 0 ? `Suche im Guide: ${data.awards[0]}` : "Zum Guide Eintrag"}>
                <BookOpen className="w-3.5 h-3.5" />
            </a>
        )}

        {/* WEBSITE BUTTON */}
        {websiteUrl && (<a href={ensureAbsoluteUrl(websiteUrl)} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700 transition-colors" title="Zur Website"><Globe className="w-3.5 h-3.5" /></a>)}
        
        {/* SEARCH BUTTON - Now Smart */}
        <a href={`https://www.google.com/search?q=${encodeURIComponent(getGoogleSearchQuery())}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600 transition-colors" title={`Suche: ${getGoogleSearchQuery()}`}><Search className="w-3.5 h-3.5" /></a>
    </div>
  );
};
// --- END OF FILE 119 Zeilen ---