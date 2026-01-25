// 25.01.2026 18:40 - FIX: Final Layout with State-Machine Parser & Removed unused 'chapterTitles' (TS6133).
// 25.01.2026 14:30 - FIX: Final "Chic Layout" with State-Machine Markdown Parser & exact Category Matching.
// src/features/info/InfoView.tsx

import React, { useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { 
  Book, 
  AlertTriangle,
  Info,
  MapPin
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { INTEREST_DATA } from '../../data/interests';

// Konstanten für Info-Kategorien (Exakt gemäß interests.ts für Info View)
const INFO_CATEGORIES = [
    'travel_info',  // Reiseinformationen
    'city_info',    // StadtInfo
    'arrival',      // Anreise
    'budget',       // Budget
    'hotel',        // Hotel / Camping
    'ignored_places'// Nicht berücksichtigte Orte
];

export const InfoView: React.FC = () => {
  const { project } = useTripStore();
  const { t } = useTranslation();
  const { analysis, data } = project;

  // 1. DATA AGGREGATION: Collect info from 'analysis.infoAutor' AND 'content.infos' AND specific places
  const infoChapters = useMemo(() => {
    const chapters = new Map<string, any>();

    // Source A: V40 Analysis Field (infoAutor)
    const v40Chapters = (analysis as any)?.infoAutor?.chapters || [];
    v40Chapters.forEach((c: any) => {
       if (c.title && !c.title.toLowerCase().includes('kulinarik')) {
         chapters.set(c.title, c);
       }
    });

    // Source B: Legacy/Fallback (content.infos)
    const legacyInfos = data.content?.infos || [];
    legacyInfos.forEach((c: any) => {
       if (c.title && !c.title.toLowerCase().includes('kulinarik')) {
         chapters.set(c.title, c);
       }
    });

    // Source C: Places acting as Info Containers (Category Match + Content Check)
    Object.values(data.places || {}).forEach((place: any) => {
        // Check if category belongs to Info View AND has substantial content
        if (INFO_CATEGORIES.includes(place.category) && place.detailContent && place.detailContent.length > 50) {
            
            // Resolve Label from INTEREST_DATA
            const catLabel = INTEREST_DATA[place.category]?.label?.de || place.category;
            const title = place.name === place.category ? catLabel : place.name; // Use nice name if available

            chapters.set(title, {
                title: title,
                content: place.detailContent,
                categoryLabel: catLabel
            });
        }
    });

    return Array.from(chapters.values());
  }, [analysis, data]);

  // 2. APPENDIX: Remaining Places (that are valid Info Categories but small/no content)
  const infoPlaces = useMemo(() => {
    const allPlaces = Object.values(data.places || {});
    // FIX: Removed unused 'chapterTitles' to resolve TS6133

    return allPlaces.filter((p: any) => {
        const isInfoCat = INFO_CATEGORIES.includes(p.category);
        // Exclude if it's already a main chapter (based on content length)
        const isChapter = p.detailContent && p.detailContent.length > 50; 
        return isInfoCat && !isChapter;
    });
  }, [data.places]);

  // --- PROFESSIONAL MARKDOWN RENDERER (State Machine) ---
  const renderMarkdown = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let listBuffer: React.ReactNode[] = [];
    
    // Helper: Flush the list buffer into a <ul>
    const flushList = () => {
      if (listBuffer.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="mb-6 space-y-2 ml-1">
            {listBuffer}
          </ul>
        );
        listBuffer = [];
      }
    };

    // Helper: Parse inline bold (**text**)
    const parseInline = (line: string) => {
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
        }
        return part;
      });
    };

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      
      // Empty lines reset lists
      if (!trimmed) {
        flushList();
        return;
      }

      // 1. HEADERS (###)
      if (trimmed.startsWith('#')) {
        flushList();
        const level = trimmed.match(/^#+/)?.[0].length || 0;
        const content = trimmed.replace(/^#+\s*/, '').replace(/\*\*/g, ''); // Clean bold from headers

        if (level === 1) {
            elements.push(
                <h3 key={`h1-${index}`} className="text-xl font-black text-slate-900 mt-12 mb-4 uppercase tracking-tight border-b border-slate-200 pb-2">
                    {content}
                </h3>
            );
        } else {
            elements.push(
                <h4 key={`h2-${index}`} className="text-base font-bold text-slate-800 mt-6 mb-2">
                    {content}
                </h4>
            );
        }
        return;
      }

      // 2. LIST ITEMS (*, -, 1.)
      const isList = /^[-\*•]/.test(trimmed) || /^\d+\./.test(trimmed);
      
      if (isList) {
        const cleanContent = trimmed.replace(/^[-\*•\d\.]+\s*/, '');
        
        // Structured List Item: "**Label:** Value"
        const parts = cleanContent.split(':');
        let itemContent;

        if (parts.length > 1 && parts[0].includes('**')) {
             const label = parts[0].replace(/\*\*/g, '');
             const val = parts.slice(1).join(':');
             itemContent = (
                 <span>
                     <span className="font-bold text-slate-900 mr-2">{label}:</span>
                     <span className="text-slate-700">{parseInline(val)}</span>
                 </span>
             );
        } else {
             itemContent = <span className="text-slate-700">{parseInline(cleanContent)}</span>;
        }

        listBuffer.push(
            <li key={`li-${index}`} className="flex items-start gap-3 text-sm leading-relaxed pl-2">
                <span className="text-blue-400 font-bold mt-1.5 text-[8px]">●</span>
                <div className="flex-1">{itemContent}</div>
            </li>
        );
        return;
      }

      // 3. PARAGRAPHS
      flushList();
      elements.push(
        <p key={`p-${index}`} className="text-sm text-slate-600 leading-relaxed mb-4 text-justify">
          {parseInline(trimmed)}
        </p>
      );
    });

    flushList(); // Final flush
    return elements;
  };

  const hasData = infoChapters.length > 0 || infoPlaces.length > 0;

  if (!hasData) {
    return (
      <div className="p-12 text-center animate-fade-in text-slate-400">
        <Book className="w-12 h-12 mx-auto mb-4 opacity-20" />
        <p>{t('info.no_data', { defaultValue: 'Keine Reiseinformationen vorhanden.' })}</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in w-full">
      {/* FLAT REPORT LAYOUT */}
      <div className="max-w-3xl mx-auto pt-4 pb-20 px-4 md:px-0">
        
        {/* DOCUMENT HEADER */}
        <div className="border-b-4 border-slate-900 pb-6 mb-12">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2 leading-none">
              {t('info.title', { defaultValue: 'Reise-Dossier' })}
          </h1>
          <p className="text-lg text-slate-500 font-medium italic flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-600" />
              {t('info.subtitle', { defaultValue: 'Wichtige Informationen & Fakten.' })}
          </p>
        </div>

        {/* CONTINUOUS REPORT BODY (Dynamic Chapters) */}
        <div className="space-y-16">
          {infoChapters.map((chapter: any) => (
              <div key={chapter.title} className="bg-white">
                  {/* Chapter Header (Only if content doesn't start with H1) */}
                  {!(chapter.content || '').trim().startsWith('#') && (
                      <div className="flex items-center gap-3 mb-8">
                          <div className="w-1.5 h-1.5 bg-slate-900 rounded-full" />
                          <h2 className="text-lg font-black uppercase tracking-widest text-slate-900">
                              {chapter.title}
                          </h2>
                          <div className="h-px flex-1 bg-slate-200" />
                      </div>
                  )}
                  
                  {/* Content Renderer */}
                  <div className="report-content">
                      {renderMarkdown(chapter.content || chapter.text || '')}
                  </div>
              </div>
          ))}
        </div>

        {/* APPENDIX (Small Items) */}
        {infoPlaces.length > 0 && (
            <div className="mt-24 pt-12 border-t-2 border-slate-100 bg-slate-50/50 p-8 rounded-xl">
                <div className="flex items-center gap-2 mb-8">
                    <AlertTriangle className="w-5 h-5 text-slate-400" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {t('info.additional_items', { defaultValue: 'Weitere Hinweise' })}
                    </span>
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                    {infoPlaces.map((place: any) => {
                        const catLabel = INTEREST_DATA[place.category]?.label?.de || place.category;
                        return (
                            <div key={place.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-slate-400" />
                                        {place.name}
                                    </h4>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed italic mb-3 flex-1">
                                    {place.description || place.reasoning || place.shortDesc}
                                </p>
                                <span className="self-start text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded">
                                    {catLabel}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
// --- END OF FILE 223 Zeilen ---