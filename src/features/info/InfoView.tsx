// 22.02.2026 17:30 - FEAT: Added search filtering and yellow highlighting for the search term.
// 22.02.2026 16:05 - FIX: Removed 'print:break-inside-avoid' from info cards to prevent PDF text cutoff on long texts. Added 'print:break-after-avoid' to header instead.
// 06.02.2026 17:10 - FIX: Corrected File Path Header & Print Optimization.
// 29.01.2026 12:30 - FIX: InfoView Layout Optimization. Always full text, Smart Titles, Reduced Spacing, Removed Main Header.
// src/features/info/InfoView.tsx

import React, { useState, useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { useTranslation } from 'react-i18next';
import { 
  FileText, 
  Trash2, 
  Database, 
  X, 
  MapPin
} from 'lucide-react';
import { INTEREST_DATA } from '../../data/interests';

// Kategorien, die als "Info" gelten, auch wenn sie Places sind
const INFO_PLACE_CATEGORIES = [
    'travel_info', 'city_info', 'arrival', 'budget', 'hotel', 'ignored_places'
];

// Helper: Text-Highlighting
const highlightText = (text: string, term: string) => {
    if (!term || typeof text !== 'string') return text;
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return (
        <>
            {parts.map((part, i) => 
                part.toLowerCase() === term.toLowerCase() 
                ? <mark key={i} className="bg-yellow-200 text-slate-900 font-medium rounded-sm px-0.5">{part}</mark> 
                : part
            )}
        </>
    );
};

export const InfoView: React.FC = () => {
  const { t } = useTranslation();
  const { project, uiState } = useTripStore();
  
  // Lese Suchbegriff aus dem Store
  const searchTerm = (uiState.searchTerm || '').toLowerCase();
  
  const [debugItem, setDebugItem] = useState<any | null>(null);
  
  // 1. DATA GATHERING (Smart Title Extraction)
  const infoItems = useMemo(() => {
      const items: any[] = [];
      const seenIds = new Set<string>();

      // QUELLE A: data.content.infos
      const contentInfos = project.data.content?.infos || [];
      if (Array.isArray(contentInfos)) {
          contentInfos.forEach((item: any) => {
              if (!seenIds.has(item.id)) {
                  let smartTitle = item.title;
                  const rawContent = item.content || item.description || '';
                  
                  const titleMatch = rawContent.match(/^##\s+(.*?)(?:\\n|\n|$)/);
                  if (titleMatch && titleMatch[1]) {
                      smartTitle = titleMatch[1].trim();
                  } else if (item.title && item.title.startsWith('city info')) {
                      smartTitle = 'Stadt-Information';
                  }

                  items.push({
                      ...item,
                      _source: 'content.infos',
                      displayTitle: smartTitle
                  });
                  seenIds.add(item.id);
              }
          });
      }

      // QUELLE B: Places
      const places = project.data.places || {};
      Object.values(places).forEach((place: any) => {
          if (INFO_PLACE_CATEGORIES.includes(place.category) && place.detailContent && place.detailContent.length > 50) {
              if (!seenIds.has(place.id)) {
                  items.push({
                      id: place.id,
                      title: place.name, 
                      displayTitle: place.name,
                      content: place.detailContent,
                      category: place.category,
                      _source: 'places',
                      isPlace: true
                  });
                  seenIds.add(place.id);
              }
          }
      });

      // QUELLE C: Analysis Fallback
      const analysisInfos = (project.analysis as any)?.infoAutor?.chapters;
      if (Array.isArray(analysisInfos)) {
          analysisInfos.forEach((item: any) => {
              if (!seenIds.has(item.id)) {
                  let smartTitle = item.title;
                  const rawContent = item.content || '';
                  const titleMatch = rawContent.match(/^##\s+(.*?)(?:\\n|\n|$)/);
                  if (titleMatch && titleMatch[1]) {
                      smartTitle = titleMatch[1].trim();
                  }

                  items.push({
                      ...item,
                      _source: 'analysis',
                      displayTitle: smartTitle
                  });
                  seenIds.add(item.id);
              }
          });
      }

      return items;
  }, [project.data.content, project.data.places, project.analysis]);

  // Such-Filter anwenden
  const filteredInfoItems = useMemo(() => {
      if (!searchTerm) return infoItems;
      return infoItems.filter(item => {
          const searchable = [item.displayTitle, item.title, item.content, item.category].filter(Boolean).join(' ').toLowerCase();
          return searchable.includes(searchTerm);
      });
  }, [infoItems, searchTerm]);

  // 2. HELPER: MARKDOWN PARSER (Compact Spacing & Highlighting)
  const renderMarkdown = (text: string | undefined) => {
    if (!text) return <span className="text-gray-400 italic">Kein Inhalt verfügbar.</span>;

    let cleanText = (typeof text === 'string' ? text : JSON.stringify(text))
        .replace(/\\\\n/g, '\n')
        .replace(/\\n/g, '\n');

    // Entferne den Titel aus dem Text, da er jetzt im Header steht
    cleanText = cleanText.replace(/^##\s+.*?(?:\n|$)/, ''); 

    return cleanText.split('\n').map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-1" />; // Minimaler Abstand bei Leerzeilen

      // HEADERS (### or **)
      if (trimmed.startsWith('###') || trimmed.startsWith('##')) {
         const content = trimmed.replace(/^#+\s*/, '');
         return <h4 key={index} className="font-bold text-slate-800 mt-3 mb-1 text-base border-b border-slate-100 pb-1">{highlightText(content, searchTerm)}</h4>;
      }

      // LIST ITEMS
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\./.test(trimmed)) {
         const parts = trimmed.split(/(\*\*.*?\*\*)/g);
         return (
           <div key={index} className="flex gap-2 ml-2 mb-1 text-sm text-slate-700">
              <span className="text-blue-500 mt-1.5 text-[6px]">●</span>
              <p className="flex-1">
                {parts.map((part, i) => 
                    part.startsWith('**') && part.endsWith('**') 
                    ? <strong key={i} className="font-semibold text-slate-900">{highlightText(part.slice(2, -2), searchTerm)}</strong>
                    : highlightText(part, searchTerm)
                )}
              </p>
           </div>
         );
      }

      // BOLD PARAGRAPHS ("**Teil 1:** ...")
      if (trimmed.startsWith('**') && trimmed.includes('**')) {
          const parts = trimmed.split(/(\*\*.*?\*\*)/g);
          return (
            <p key={index} className="mb-1 text-sm text-slate-600 leading-relaxed mt-2">
               {parts.map((part, i) => 
                  part.startsWith('**') && part.endsWith('**') 
                  ? <strong key={i} className="font-bold text-slate-800 block mb-0.5">{highlightText(part.slice(2, -2), searchTerm)}</strong>
                  : highlightText(part, searchTerm)
               )}
            </p>
          );
      }

      // NORMAL TEXT
      return (
        <p key={index} className="mb-2 text-sm text-slate-600 leading-relaxed">
           {highlightText(trimmed, searchTerm)}
        </p>
      );
    });
  };

  // 3. ACTION HANDLERS
  const handleDelete = (id: string, source: string) => {
      if (!confirm(t('common.delete_confirm', { defaultValue: 'Diesen Eintrag wirklich löschen?' }))) return;

      useTripStore.setState((state) => {
          const newData = { ...state.project.data };
          
          if (source === 'content.infos') {
              const currentInfos = newData.content?.infos || [];
              if (Array.isArray(currentInfos)) {
                  newData.content.infos = currentInfos.filter((i: any) => i.id !== id);
              }
          } else if (source === 'places') {
              if (newData.places && newData.places[id]) {
                  newData.places[id] = { ...newData.places[id], detailContent: undefined };
              }
          }

          return {
              project: {
                  ...state.project,
                  data: newData
              }
          };
      });
  };

  const getCategoryLabel = (cat: string) => {
      return INTEREST_DATA[cat]?.label?.de || cat;
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/50 overflow-y-auto p-4 pb-24 info-view-root print:h-auto print:overflow-visible print:bg-white print:p-0 print:pb-0">
      
      {/* CONTENT LIST */}
      {filteredInfoItems.length === 0 ? (
         <div className="flex flex-col items-center justify-center h-64 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl bg-white print:border-none">
            <FileText className="w-12 h-12 mb-2 opacity-20" />
            <p>
                {searchTerm 
                    ? `Keine Ergebnisse für "${searchTerm}" gefunden.` 
                    : 'Keine Informationen gefunden.'}
            </p>
            {!searchTerm && <p className="text-xs mt-2 text-slate-400 print:hidden">Prüfen Sie, ob der Workflow "Infos A-Z" ausgeführt wurde.</p>}
         </div>
      ) : (
         <div className="space-y-6 print:space-y-8">
            {filteredInfoItems.map((item: any, idx: number) => {
                const itemId = item.id || `info_${idx}`;
                const rawContent = item.content || item.description || '';

                return (
                  <div key={itemId} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow print:shadow-none print:border-b print:border-t-0 print:border-x-0 print:rounded-none print:mb-4">
                      
                      {/* CARD HEADER */}
                      <div className="bg-slate-50/50 p-3 border-b border-slate-100 flex justify-between items-start print:bg-white print:pl-0 print:break-after-avoid">
                          <div className="flex flex-col">
                              <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                  {item.isPlace ? <MapPin className="w-5 h-5 text-indigo-500" /> : <span className="text-indigo-500 text-xl">ℹ️</span>}
                                  {highlightText(item.displayTitle || item.title || "Information", searchTerm)}
                              </h3>
                              {item.category && (
                                  <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5 ml-8">
                                      {getCategoryLabel(item.category)}
                                  </span>
                              )}
                          </div>
                          
                          <div className="flex items-center gap-1 print:hidden">
                              <button 
                                onClick={() => setDebugItem(item)}
                                className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                title="JSON Debug"
                              >
                                  <Database className="w-4 h-4" />
                              </button>
                              
                              {/* Only allow deleting confirmed content items */}
                              {item._source === 'content.infos' && (
                                <button 
                                    onClick={() => handleDelete(itemId, item._source)}
                                    className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                    title="Löschen"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                          </div>
                      </div>

                      {/* CARD BODY */}
                      <div className="p-5 pt-2 print:px-0">
                          <div className="text-sm text-slate-600 print:text-black">
                              {renderMarkdown(rawContent)}
                          </div>
                      </div>
                  </div>
                );
            })}
         </div>
      )}

      {/* DEBUG MODAL */}
      {debugItem && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in print:hidden">
           <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col">
              <div className="flex justify-between items-center p-4 border-b">
                 <h3 className="font-bold text-lg truncate pr-4">JSON: {debugItem.displayTitle}</h3>
                 <button onClick={() => setDebugItem(null)} className="text-gray-500 hover:text-black">
                   <X className="w-6 h-6" />
                 </button>
              </div>
              <div className="p-4 overflow-auto bg-slate-50 font-mono text-xs">
                 <pre className="whitespace-pre-wrap">{JSON.stringify(debugItem, null, 2)}</pre>
              </div>
           </div>
        </div>
      )}

    </div>
  );
};
// --- END OF FILE 256 Zeilen ---