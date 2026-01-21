// 21.01.2026 10:48 - FIX: Final flat embedded report style. No Modal, No Overlay classes, No Kulinarik.
// src/features/info/InfoView.tsx
// 21.01.2026 10:45 - FIX: Resolved naming conflict between Lucide Map and JS Map constructor.

import React, { useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { 
  Book, 
  AlertTriangle, 
  Info, 
  Car, 
  Phone,
  Shield,
  Map as MapIcon 
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { INTEREST_DATA } from '../../data/interests';

// Konstanten für Info-Kategorien (muss exakt mit APPENDIX_ONLY_INTERESTS übereinstimmen)
const INFO_CATEGORIES = ['travel_info', 'city_info', 'arrival', 'general', 'sights', 'budget', 'ignored_places'];

export const InfoView: React.FC = () => {
  const { project } = useTripStore();
  const { t } = useTranslation();
  const { analysis, data } = project;

  // 1. QUELLE A: Echte Info-Kapitel (V40 Standard: infoAutor) + Filter Kulinarik
  const infoChapters = useMemo(() => {
    const v40Chapters = (analysis as any)?.infoAutor?.chapters || [];
    const legacyInfos = data.content?.infos || []; 
    
    const all = [...v40Chapters, ...legacyInfos];
    const unique = new Map(); // FIX: Now correctly refers to JS Map constructor
    
    all.forEach(c => {
      // FIX: Strikter Ausschluss des Kulinarik-Blocks (Redaktionsvorgabe PDF)
      if (c.title && !c.title.toLowerCase().includes('kulinarik')) {
        unique.set(c.title, c);
      }
    });
    return Array.from(unique.values());
  }, [analysis, data]);

  // 2. QUELLE B: Places, die eigentlich Infos sind (Fallback aus Guide)
  const infoPlaces = useMemo(() => {
    const allPlaces = Object.values(data.places || {});
    return allPlaces.filter((p: any) => INFO_CATEGORIES.includes(p.category));
  }, [data.places]);

  // PDF-Style Parser für fließenden Text (V30.3 Struktur)
  const renderReportLine = (line: string, idx: number) => {
    const trimmed = line.trim();
    if (!trimmed) return <div key={idx} className="h-4" />;

    // Kapitel-Überschriften (z.B. "7. Organisatorisches")
    if (/^\d+\./.test(trimmed)) {
      return (
        <h2 key={idx} className="text-2xl font-black text-slate-900 mt-10 mb-6 border-b-2 border-slate-900 pb-2 uppercase tracking-tighter">
          {trimmed}
        </h2>
      );
    }

    // Sektions-Header (z.B. "Teil 1:")
    if (trimmed.toLowerCase().includes('teil') && trimmed.includes(':')) {
      return (
        <h3 key={idx} className="text-lg font-bold text-blue-900 mt-8 mb-4">
          {trimmed}
        </h3>
      );
    }

    // Bullet Points mit fettem Label (z.B. "• Zoll: ...")
    if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
      const parts = trimmed.split(':');
      if (parts.length > 1) {
        const label = parts[0].replace(/^[•-]\s*/, '');
        return (
          <div key={idx} className="flex gap-2 ml-4 mb-3 text-slate-700 leading-relaxed text-sm">
            <span className="font-bold text-slate-900">•</span>
            <p>
              <span className="font-bold text-slate-900">{label}:</span>
              <span>{parts.slice(1).join(':')}</span>
            </p>
          </div>
        );
      }
    }

    // Standard-Bericht-Text
    return (
      <p key={idx} className="text-sm text-slate-700 leading-relaxed mb-4 text-justify">
        {trimmed}
      </p>
    );
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
      {/* FLAT REPORT LAYOUT - No shell, no shadow, just content */}
      <div className="max-w-3xl mx-auto pt-4 pb-20 px-4 md:px-0">
        
        {/* DOCUMENT HEADER */}
        <div className="border-b-4 border-slate-900 pb-6 mb-12">
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase mb-2 leading-none">
              {t('info.title', { defaultValue: 'Reise-Informationen' })}
          </h1>
          <p className="text-lg text-slate-500 font-medium italic">
              {t('info.subtitle', { defaultValue: 'Gesammelte Fakten, Regeln & Tipps für Ihre Reise.' })}
          </p>
        </div>

        {/* CONTINUOUS REPORT BODY */}
        <div className="space-y-4">
          {infoChapters.map((chapter: any) => (
              <div key={chapter.title} className="mb-16">
                  {/* Subtle Separator instead of Card */}
                  <div className="flex items-center gap-2 mb-6 opacity-20">
                     <span className="text-[9px] font-black uppercase tracking-[0.3em] whitespace-nowrap">{chapter.title}</span>
                     <div className="h-px w-full bg-slate-900" />
                  </div>
                  
                  <div className="report-content">
                      {(chapter.content || chapter.text || '').split('\n').map((line: string, i: number) => 
                        renderReportLine(line, i)
                      )}
                  </div>
              </div>
          ))}
        </div>

        {/* APPENDIX (Fallback Places) */}
        {infoPlaces.length > 0 && (
            <div className="mt-24 pt-12 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-8">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        {t('info.additional_items', { defaultValue: 'Anhang: Ortshinweise' })}
                    </span>
                </div>
                
                <div className="space-y-10">
                    {infoPlaces.map((place: any) => {
                        const catLabel = INTEREST_DATA[place.category]?.label?.de || place.category;
                        return (
                            <div key={place.id} className="border-l-2 border-slate-200 pl-6">
                                <h4 className="font-bold text-slate-900 text-base mb-1">{place.name}</h4>
                                <p className="text-sm text-slate-600 mb-2 leading-relaxed italic">
                                    {place.description || place.reasoning || place.shortDesc}
                                </p>
                                <div className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">
                                    Kategorie: {catLabel}
                                </div>
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

// --- END OF FILE 149 Zeilen ---