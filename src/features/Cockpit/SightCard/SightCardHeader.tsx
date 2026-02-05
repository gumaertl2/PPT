// 06.02.2026 15:00 - FIX: ULTRA-ROBUST HEADER (No Crash, Smart Links).
// - Added Guard Clause against undefined data.
// - Resolves Name from 4 possible keys.
// - Handles Awards as Array or String.
// src/features/Cockpit/SightCard/SightCardHeader.tsx

import React from 'react';
import { X, MapPin, Globe, BookOpen, Search } from 'lucide-react';

interface SightCardHeaderProps {
  data: any;
  onClose: () => void;
  isHotel?: boolean;
}

export const SightCardHeader: React.FC<SightCardHeaderProps> = ({ data, onClose, isHotel }) => {
  // 1. SAFETY FIRST: Prevent Crash if data is missing
  if (!data) return null;

  const categoryColor = isHotel ? 'text-emerald-600' : 'text-blue-600';
  const categoryBg = isHotel ? 'bg-emerald-50' : 'bg-blue-50';

  // 2. NAME RESOLUTION (Priority List)
  const name = data.name_official || data.official_name || data.name || data.original_name || "Unbekannter Ort";
  const city = data.city || '';
  
  // 3. SMART LINK GENERATION
  // Awards can be String ("Michelin, Gault") or Array (["Michelin", "Gault"])
  let awardsText = "";
  if (Array.isArray(data.awards)) {
      awardsText = data.awards.join(' ');
  } else if (typeof data.awards === 'string') {
      awardsText = data.awards;
  }

  // Query: "Noma Kopenhagen Michelin World's 50 Best"
  const queryParts = [name, city, awardsText].filter(Boolean); // Remove empty strings
  const queryString = queryParts.join(' ').trim();
  const smartGoogleLink = `https://www.google.com/search?q=${encodeURIComponent(queryString)}`;

  // 4. EXTERNAL LINKS
  const guideLink = data.guide_link; // Direct proof from AI
  const website = data.website || data.source_url; // Official site

  return (
    <div className="flex items-start justify-between p-4 pb-2">
      <div className="flex-1 min-w-0 pr-4">
        {/* Category Badge */}
        <div className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mb-1.5 ${categoryBg} ${categoryColor}`}>
          {data.category || (isHotel ? 'Hotel' : 'Sight')}
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-bold text-slate-900 leading-tight break-words">
          {name}
        </h3>
        
        {/* Subtitle */}
        {city && (
             <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                 <MapPin className="w-3 h-3" />
                 {city}
             </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
         
         {/* A: GUIDE LINK (The Proof) */}
         {guideLink && (
             <a 
               href={guideLink} 
               target="_blank" 
               rel="noopener noreferrer"
               className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
               title="Zum Guide-Eintrag"
             >
               <BookOpen className="w-4 h-4" />
             </a>
         )}

         {/* B: SMART GOOGLE SEARCH (Reputation) */}
         <a 
           href={smartGoogleLink} 
           target="_blank" 
           rel="noopener noreferrer"
           className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
           title={`Google Reputation Check: ${queryString}`}
         >
           <Search className="w-4 h-4" />
         </a>

         {/* C: OFFICIAL WEBSITE */}
         {website && (
             <a 
               href={website} 
               target="_blank" 
               rel="noopener noreferrer"
               className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
               title="Offizielle Website"
             >
               <Globe className="w-4 h-4" />
             </a>
         )}

         <div className="w-px h-4 bg-slate-200 mx-1"></div>

         {/* Close */}
         <button 
           onClick={onClose}
           className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
         >
           <X className="w-5 h-5" />
         </button>
      </div>
    </div>
  );
};
// --- END OF FILE 105 Zeilen ---