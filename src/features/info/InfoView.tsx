// 20.01.2026 16:55 - FIX: Removed unused 'MapIcon' import to satisfy Vercel Build (TS6133).
// src/features/info/InfoView.tsx

import React, { useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { 
  Book, 
  AlertTriangle, 
  Info, 
  Car, 
  Phone,
  Shield
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { INTEREST_DATA } from '../../data/interests';

// Konstanten für Info-Kategorien (muss exakt mit APPENDIX_ONLY_INTERESTS übereinstimmen)
const INFO_CATEGORIES = ['travel_info', 'city_info', 'arrival', 'general', 'sights', 'budget', 'ignored_places'];

export const InfoView: React.FC = () => {
  const { project } = useTripStore();
  const { t } = useTranslation();
  const { analysis, data } = project;

  // 1. QUELLE A: Echte Info-Kapitel (V40 Standard: infoAutor)
  const infoChapters = useMemo(() => {
    // Versuche alle Pfade, wo der InfoAutor geschrieben haben könnte
    const v40Chapters = (analysis as any)?.infoAutor?.chapters || [];
    const legacyInfos = data.content?.infos || []; // Legacy aus V3
    
    // Merge und Deduplizieren basierend auf Titel
    const all = [...v40Chapters, ...legacyInfos];
    const unique = new Map();
    all.forEach(c => unique.set(c.title, c));
    return Array.from(unique.values());
  }, [analysis, data]);

  // 2. QUELLE B: Places, die eigentlich Infos sind (Fallback aus Guide)
  const infoPlaces = useMemo(() => {
    const allPlaces = Object.values(data.places || {});
    return allPlaces.filter((p: any) => INFO_CATEGORIES.includes(p.category));
  }, [data.places]);

  const hasData = infoChapters.length > 0 || infoPlaces.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center animate-fade-in">
        <div className="bg-slate-100 p-6 rounded-full mb-6">
            <Book className="w-12 h-12 text-slate-300" />
        </div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">
            {t('info.no_data_title', { defaultValue: 'Noch keine Reiseinfos' })}
        </h2>
        <p className="text-slate-500 max-w-md">
            {t('info.no_data_desc', { defaultValue: 'Der Info-Autor hat noch keine Kapitel erstellt. Starten Sie den Task "Reiseinfos", um Verkehrsregeln, Sicherheitshinweise und kulturelle Tipps zu erhalten.' })}
        </p>
      </div>
    );
  }

  // Helper für Icon-Wahl
  const getIconForTitle = (title: string) => {
      const lower = title.toLowerCase();
      if (lower.includes('auto') || lower.includes('verkehr') || lower.includes('driving')) return <Car className="w-5 h-5 text-blue-500" />;
      if (lower.includes('sicherheit') || lower.includes('notfall') || lower.includes('safety')) return <Shield className="w-5 h-5 text-red-500" />;
      if (lower.includes('kultur') || lower.includes('culture')) return <Book className="w-5 h-5 text-amber-500" />;
      if (lower.includes('kontakt') || lower.includes('telefon')) return <Phone className="w-5 h-5 text-green-500" />;
      return <Info className="w-5 h-5 text-slate-400" />;
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 p-4 md:p-8 animate-fade-in space-y-8">
      
      {/* HEADER */}
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-blue-600 p-3 rounded-xl shadow-lg shadow-blue-200">
            <Info className="w-8 h-8 text-white" />
        </div>
        <div>
            <h1 className="text-2xl font-black text-slate-800">
                {t('info.title', { defaultValue: 'Reise-Informationen' })}
            </h1>
            <p className="text-slate-500">
                {t('info.subtitle', { defaultValue: 'Alles Wichtige für unterwegs: Regeln, Sicherheit & Tipps.' })}
            </p>
        </div>
      </div>

      {/* 1. RENDER INFO CHAPTERS (Markdown / Text) */}
      <div className="grid gap-6">
        {infoChapters.map((chapter: any, index: number) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-100 flex items-center gap-3">
                    {getIconForTitle(chapter.title || '')}
                    <h3 className="font-bold text-lg text-slate-700">
                        {chapter.title}
                    </h3>
                </div>
                <div className="p-6 prose prose-slate max-w-none text-slate-600">
                    {/* Simple Text Rendering (expandable to Markdown if library available) */}
                    {chapter.content ? (
                        <div className="whitespace-pre-line leading-relaxed">
                            {chapter.content}
                        </div>
                    ) : (
                        <p>{chapter.text}</p>
                    )}
                </div>
            </div>
        ))}
      </div>

      {/* 2. RENDER FALLBACK PLACES (Items from Guide) */}
      {infoPlaces.length > 0 && (
          <div className="space-y-4">
              <div className="flex items-center gap-2 mb-2 mt-8">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      {t('info.additional_items', { defaultValue: 'Weitere Hinweise' })}
                  </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {infoPlaces.map((place: any) => {
                      // Resolve localized label for category badge
                      const catLabel = INTEREST_DATA[place.category]?.label?.de || place.category;
                      
                      return (
                          <div key={place.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4 hover:shadow-md transition-shadow">
                              <div className="bg-amber-50 w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-amber-600">
                                  <Info className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                  <h4 className="font-bold text-slate-800 text-sm mb-1 truncate" title={place.name}>
                                    {place.name}
                                  </h4>
                                  <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                      {place.description || place.reasoning || place.shortDesc}
                                  </p>
                                  <div className="mt-2 text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full inline-block font-medium">
                                      {catLabel}
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      )}

    </div>
  );
};
// --- END OF FILE 134 Zeilen ---