// 06.02.2026 22:30 - FIX: Name Mapping & Smart Search Query.
// - Fixed wrong key 'official_name' -> 'name_official'.
// - Hardened Smart Link generation to ensure awards are included.
// src/features/Cockpit/SightCard/SightCardHeader.tsx

import React from 'react';
import { X, MapPin, Globe, BookOpen, Search } from 'lucide-react';

interface SightCardHeaderProps {
  data: any;
  onClose: () => void;
  isHotel?: boolean;
}

export const SightCardHeader: React.FC<SightCardHeaderProps> = ({ data, onClose, isHotel }) => {
  // CRITICAL FIX: Safety Check
  if (!data) return null;

  const categoryColor = isHotel ? 'text-emerald-600' : 'text-blue-600';
  const categoryBg = isHotel ? 'bg-emerald-50' : 'bg-blue-50';

  // FIX: Accurate Name Mapping (JSON uses name_official or name)
  const name = data.name || data.name_official || "Unbekannter Ort";
  const city = data.city || '';
  
  // FIX: Awards Extraction for the Link
  const awardsArray = Array.isArray(data.awards) ? data.awards : [];
  const awardsString = awardsArray.join(' ');
  
  // 1. SMART GOOGLE LINK (The "Reputation Check")
  // We combine Name + City + Awards for the perfect search query
  const query = `${name} ${city} ${awardsString}`.trim().replace(/\s+/g, ' ');
  const smartGoogleLink = `https://www.google.com/search?q=${encodeURIComponent(query)}`;

  // 2. GUIDE LINK (Direct proof from AI)
  const guideLink = data.guide_link;
  
  // 3. WEBSITE
  const website = data.website;

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
        
        {/* Subtitle (City/Region) */}
        {city && (
             <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                 <MapPin className="w-3 h-3" />
                 {city}
             </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
         
         {/* A: GUIDE LINK (Only if AI found one) */}
         {guideLink && (
             <a 
               href={guideLink} 
               target="_blank" 
               rel="noopener noreferrer"
               className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-full transition-colors"
               title="Zum Guide-Eintrag (Originalquelle)"
             >
               <BookOpen className="w-4 h-4" />
             </a>
         )}

         {/* B: SMART GOOGLE SEARCH (Reputation Link) */}
         <a 
           href={smartGoogleLink} 
           target="_blank" 
           rel="noopener noreferrer"
           className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
           title={`Google Reputation: ${query}`}
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

         {/* Close Button */}
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
// --- END OF FILE 102 Zeilen ---