// 29.01.2026 19:55 - REFACTOR: Sub-component extraction (Meta).
// src/features/Cockpit/SightCard/SightCardMeta.tsx

import React from 'react';
import { Star, Sun, CloudRain, CreditCard, ExternalLink, Check, BookOpen, Globe, Search, Map as MapIcon } from 'lucide-react';

interface SightCardMetaProps {
  data: any;
  customCategory: string;
  customDuration: number;
  isSpecial: boolean;
  specialType: string;
  rating: number;
  userRatingsTotal: number;
  isHotel: boolean;
  priceEstimate: string | null;
  bookingUrl: string | null;
  sourceUrl: string | null;
  websiteUrl: string | null;
  isSelected: boolean;
  displayCategory: string;
  onCategoryChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onDurationChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onHotelSelect: (e: React.MouseEvent) => void;
  onShowMap: (e: React.MouseEvent) => void;
  ensureAbsoluteUrl: (url: string | undefined) => string | undefined;
}

export const SightCardMeta: React.FC<SightCardMetaProps> = ({
  data,
  customCategory,
  customDuration,
  isSpecial,
  specialType,
  rating,
  userRatingsTotal,
  isHotel,
  priceEstimate,
  bookingUrl,
  sourceUrl,
  websiteUrl,
  isSelected,
  displayCategory,
  onCategoryChange,
  onDurationChange,
  onHotelSelect,
  onShowMap,
  ensureAbsoluteUrl
}) => {

  const renderStars = () => {
    if (!rating) return null;
    return (
      <div className="flex items-center gap-1 text-amber-500 text-xs font-medium whitespace-nowrap" title={`Google Rating: ${rating} (${userRatingsTotal})`}>
        <Star className="w-3 h-3 fill-amber-500" />
        <span>{rating}</span>
        {userRatingsTotal > 0 && <span className="text-gray-400 font-normal">({userRatingsTotal})</span>}
      </div>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mb-1">
      {isSpecial ? (
        <div className={`flex items-center gap-1 font-bold ${specialType === 'sunny' ? 'text-amber-600' : 'text-blue-600'}`}>
          {specialType === 'sunny' ? <Sun className="w-3 h-3" /> : <CloudRain className="w-3 h-3" />}
          <span>{specialType === 'sunny' ? 'Sonnentag' : 'Regentag'}</span>
        </div>
      ) : (
        <select 
          value={customCategory} 
          onChange={onCategoryChange}
          className="bg-transparent border-none p-0 pr-4 text-xs font-medium text-gray-700 focus:ring-0 cursor-pointer hover:text-blue-600 py-0.5"
        >
          <option value={data.category}>{displayCategory}</option>
          <option value="Kultur">Kultur</option>
          <option value="Natur">Natur</option>
          <option value="Entspannung">Entspannung</option>
          <option value="Abenteuer">Abenteuer</option>
          <option value="Shopping">Shopping</option>
          <option value="Restaurant">Restaurant</option>
          <option value="Hotel">Hotel</option>
        </select>
      )}
      <span className="text-gray-300">|</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          step="15"
          value={customDuration || ''}
          onChange={onDurationChange}
          className="w-10 bg-transparent border-b border-gray-300 p-0 text-center text-xs focus:border-blue-500 focus:ring-0"
        />
        <span>min</span>
      </div>
      <span className="text-gray-300">|</span>
      {!isSpecial && renderStars()}
      
      {isHotel && priceEstimate && (
        <>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
            <CreditCard className="w-3 h-3" />
            {priceEstimate}
          </span>
        </>
      )}

      <div className="flex items-center gap-2 ml-auto no-print">
        {isHotel && (
          <div className="flex items-center gap-1 mr-2">
            {bookingUrl && (
              <a href={ensureAbsoluteUrl(bookingUrl)} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-800 p-1 hover:bg-emerald-50 rounded" title="Zum Angebot">
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
            <button 
              onClick={onHotelSelect}
              className={`
                flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border transition-all
                ${isSelected 
                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-sm' 
                  : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'}
              `}
            >
              {isSelected ? (
                <><Check className="w-3 h-3" /> Ausgewählt</>
              ) : (
                'Wählen'
              )}
            </button>
          </div>
        )}
        
        {sourceUrl && !isHotel && (
          <a href={ensureAbsoluteUrl(sourceUrl)} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-700" title="Zum Guide Eintrag"><BookOpen className="w-3.5 h-3.5" /></a>
        )}
        {websiteUrl && (
          <a href={ensureAbsoluteUrl(websiteUrl)} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600" title="Zur Website"><Globe className="w-3.5 h-3.5" /></a>
        )}
        <a href={`https://www.google.com/search?q=${encodeURIComponent((data.name || '') + ' ' + (data.city || ''))}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-600"><Search className="w-3.5 h-3.5" /></a>
        <button onClick={onShowMap} className="text-gray-400 hover:text-blue-600 transition-colors"><MapIcon className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
};
// --- END OF FILE 136 Zeilen ---