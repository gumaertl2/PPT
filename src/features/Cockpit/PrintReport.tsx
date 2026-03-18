// 19.03.2026 14:00 - FEAT: Added responsive Detail-Level sync for Diary Text printing. If compact: prints lines/summaries only. If standard: hides user notes. If details: full rendering.
// 19.03.2026 12:00 - FEAT: Added 'Pre-created Days' & 'Daily Summaries' to the print layout.
// src/features/Cockpit/PrintReport.tsx

import React, { useMemo } from 'react';
import { useTripStore } from '../../store/useTripStore';
import { BriefingView } from './BriefingView'; 
import { AnalysisReviewView } from './AnalysisReviewView';
import { RouteReviewView } from './RouteReviewView';
import { SightsView } from './SightsView';
import { InfoView } from '../info/InfoView';
import { SightsMapView } from './SightsMapView';
import type { PrintConfig } from '../../core/types';
import { useTranslation } from 'react-i18next';
import { Star, PenLine, MapPin } from 'lucide-react'; 

interface PrintReportProps {
  config: PrintConfig;
}

export const PrintReport: React.FC<PrintReportProps> = ({ config }) => {
  const { t, i18n } = useTranslation();
  const { project, uiState } = useTripStore();
  const { logistics, dates } = project.userInputs;
  const currentLang = i18n.language.substring(0, 2);

  const visitedPlaces = useMemo(() => {
      return Object.values(project.data?.places || {})
          .filter((p: any) => p.visited && p.visitedAt)
          .sort((a: any, b: any) => new Date(a.visitedAt).getTime() - new Date(b.visitedAt).getTime())
          .map((p: any, index: number) => ({ ...p, _seq: index + 1 }));
  }, [project.data?.places]);

  const diaryAllDates = useMemo(() => {
      const allDatesSet = new Set<string>();
      if (dates?.start && dates?.end) {
          let current = new Date(dates.start);
          current.setHours(12, 0, 0, 0); 
          const end = new Date(dates.end);
          end.setHours(12, 0, 0, 0);
          let safeguard = 0;
          while (current <= end && safeguard < 100) {
              allDatesSet.add(current.toISOString().split('T')[0]);
              current.setDate(current.getDate() + 1);
              safeguard++;
          }
      }
      
      visitedPlaces.forEach(p => {
          if (p.visitedAt) allDatesSet.add(new Date(p.visitedAt).toISOString().split('T')[0]);
      });
      
      const summaries = project.data.content?.diarySummaries || {};
      Object.keys(summaries).forEach(k => {
          if (summaries[k]?.trim()) allDatesSet.add(k);
      });

      return Array.from(allDatesSet).sort();
  }, [dates, visitedPlaces, project.data.content?.diarySummaries]);

  const hasDiaryEntries = diaryAllDates.length > 0;

  if (!config) return null;

  const PageBreak = () => <div className="break-before-page" style={{ pageBreakBefore: 'always' }} />;

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="border-b-2 border-slate-800 mb-6 pb-2 mt-8 print:break-after-avoid">
        <h2 className="text-2xl font-black uppercase tracking-wider text-slate-900">{title}</h2>
    </div>
  );

  const buildDynamicTitle = () => {
      let destArr = [];
      if (logistics.mode === 'stationaer') {
          if (logistics.stationary.region) destArr.push(logistics.stationary.region);
          if (logistics.stationary.destination) destArr.push(logistics.stationary.destination);
      } else {
          if (logistics.roundtrip.region) destArr.push(logistics.roundtrip.region);
      }
      const destStr = destArr.join(', ');

      const formatShortDate = (dateStr?: string) => {
          if (!dateStr) return '';
          return new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { day: 'numeric', month: 'long' }).format(new Date(dateStr));
      };
      const formatYear = (dateStr?: string) => {
          if (!dateStr) return '';
          return new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { year: 'numeric' }).format(new Date(dateStr));
      };

      let dateStr = '';
      if (dates?.start && dates?.end) {
          const startYear = formatYear(dates.start);
          const endYear = formatYear(dates.end);
          if (startYear === endYear) {
              dateStr = `${formatShortDate(dates.start)} - ${formatShortDate(dates.end)} ${endYear}`;
          } else {
              dateStr = `${formatShortDate(dates.start)} ${startYear} - ${formatShortDate(dates.end)} ${endYear}`;
          }
      } else if (dates?.start) {
          dateStr = `${formatShortDate(dates.start)} ${formatYear(dates.start)}`;
      }

      const defaultTitle = currentLang === 'en' ? 'Travel Diary' : 'Reisetagebuch';
      return `${defaultTitle}${destStr ? ` - ${destStr}` : ''}${dateStr ? `, ${dateStr}` : ''}`;
  };

  const getMainDocumentTitle = () => {
      const name = project.meta.name;
      if (name !== 'Neue Reise' && name !== 'New Trip') {
          return name;
      }
      
      let destArr = [];
      if (logistics.mode === 'stationaer') {
          if (logistics.stationary.region) destArr.push(logistics.stationary.region);
          if (logistics.stationary.destination) destArr.push(logistics.stationary.destination);
      } else {
          if (logistics.roundtrip.region) destArr.push(logistics.roundtrip.region);
      }
      const destStr = destArr.join(', ');
      
      if (destStr) {
          return `${currentLang === 'en' ? 'Trip to' : 'Reise nach'} ${destStr}`;
      }
      return name;
  };

  const DiaryPrintView = () => {
      
      // FEATURE: Detail-Level Mapping für den Druck
      const normalizedLevel = (config.detailLevel === 'compact' || (config.detailLevel as any) === 'kompakt') ? 'kompakt' : (config.detailLevel === 'standard' ? 'standard' : 'details');
      const showPlaces = normalizedLevel !== 'kompakt';
      const showUserNotes = normalizedLevel === 'details';

      const firstDateMs = useMemo(() => {
          let ms = Infinity;
          if (dates?.start) {
              ms = new Date(dates.start).setHours(0,0,0,0);
          }
          const visits = visitedPlaces.map((p: any) => new Date(p.visitedAt).setHours(0,0,0,0));
          if (visits.length > 0) {
              const earliestVisit = Math.min(...visits);
              if (earliestVisit < ms) ms = earliestVisit;
          }
          if (ms === Infinity) ms = new Date().setHours(0,0,0,0);
          return ms;
      }, [dates?.start, visitedPlaces]);

      const getRealDay = (dateStr: string) => {
          const visit = new Date(dateStr);
          visit.setHours(0,0,0,0);
          const diff = visit.getTime() - firstDateMs;
          return Math.floor(diff / 86400000) + 1;
      };

      const groupedPlaces = visitedPlaces.reduce((acc: Record<string, any[]>, place: any) => {
          const safeDate = place.visitedAt ? (place.visitedAt as string) : new Date().toISOString();
          const dateKey = new Date(safeDate).toISOString().split('T')[0];
          if (!acc[dateKey]) acc[dateKey] = [];
          acc[dateKey].push(place);
          return acc;
      }, {});

      const diarySummaries = project.data.content?.diarySummaries || {};

      return (
          <div className="mt-2">
              <div className="space-y-2">
                  {diaryAllDates.map((dateKey) => {
                      const placesForThisDay = groupedPlaces[dateKey] || [];
                      const realDay = getRealDay(dateKey);
                      const dateObj = new Date(dateKey);
                      const dateStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', {
                          weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                      }).format(dateObj);

                      return (
                          <div key={dateKey} className="mb-6 print:break-inside-avoid">
                              
                              <div className="flex items-center gap-4 mt-4 mb-4 print:break-after-avoid">
                                  <div className="h-px bg-slate-300 flex-1"></div>
                                  <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                                      {t('diary.real_day', { defaultValue: currentLang === 'en' ? 'Travel Day' : 'Reisetag' })} {realDay} • {dateStr}
                                  </span>
                                  <div className="h-px bg-slate-300 flex-1"></div>
                              </div>

                              {diarySummaries[dateKey] && (
                                  <div className="mb-5 text-sm text-slate-700 italic border-l-2 border-slate-300 pl-3 py-1 leading-relaxed print:break-inside-avoid">
                                      {diarySummaries[dateKey].split('\n').map((line: string, i: number) => (
                                          <React.Fragment key={i}>
                                              {line}<br/>
                                          </React.Fragment>
                                      ))}
                                  </div>
                              )}
                              
                              {/* FEATURE: Schreiblinien werden auch gedruckt, wenn der User "Kompakt" druckt! */}
                              {!diarySummaries[dateKey] && (!showPlaces || placesForThisDay.length === 0) && (
                                  <div className="h-24 border-b border-dashed border-slate-200 mt-4 mb-4 print:block hidden"></div>
                              )}

                              {showPlaces && placesForThisDay.map((place: any) => {
                                  const safeTimeDate = place.visitedAt ? new Date(place.visitedAt as string) : new Date();
                                  const timeStr = new Intl.DateTimeFormat(currentLang === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(safeTimeDate);
                                  const isCustomEntry = place.category === 'custom_diary';
                                  const rating = place.userRating || 0; 
                                  
                                  return (
                                      <div key={place.id} className="relative pl-10 py-1 mb-3 print:break-inside-avoid">
                                          
                                          <div className="absolute left-1 top-1 w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-black">
                                              {place._seq}
                                          </div>
                                          
                                          <div className="flex justify-between items-start">
                                              <div>
                                                  <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-slate-900 text-sm leading-tight">{place.name}</h4>
                                                    {rating > 0 && (
                                                        <div className="flex items-center">
                                                            {[...Array(rating)].map((_, i) => (
                                                                <Star key={i} size={10} className="text-amber-400 fill-current" />
                                                            ))}
                                                        </div>
                                                    )}
                                                  </div>
                                                  <div className="text-[9px] text-slate-500 uppercase mt-0.5 flex items-center gap-1">
                                                    {isCustomEntry ? <PenLine size={8} /> : <MapPin size={8} />}
                                                    {isCustomEntry ? t('diary.custom_entry_label', { defaultValue: 'Eigener Eintrag' }) : place.category}
                                                  </div>
                                              </div>
                                              <span className="text-[9px] font-bold text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{timeStr}</span>
                                          </div>
                                          
                                          {showUserNotes && place.userNote && (
                                              <div className="mt-1.5 text-xs text-slate-700 italic border-l-2 border-slate-200 pl-2 py-0.5 leading-relaxed">
                                                  {place.userNote.split('\n').map((line: string, i: number) => (
                                                      <React.Fragment key={i}>
                                                          {line}<br/>
                                                      </React.Fragment>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  );
                              })}
                          </div>
                      );
                  })}
              </div>
          </div>
      );
  };

  const isOnlyDiary = !config.sections.briefing && !config.sections.analysis && !config.sections.days && !config.sections.tours && !config.sections.categories && !config.sections.infos;

  return (
    <div className="print-report font-sans text-slate-900 bg-white max-w-[210mm] mx-auto">
      
      {/* HEADER LOGIK */}
      {!isOnlyDiary ? (
          <div className="mb-12 text-center border-b border-slate-200 pb-8">
             <h1 className="text-4xl font-black text-slate-900 mb-2">{getMainDocumentTitle()}</h1>
             <p className="text-slate-500 uppercase tracking-widest text-sm">
                {new Date().toLocaleDateString()} • Papatours V40
             </p>
             {uiState.currentFileName && (
                 <p className="text-xs text-slate-400 mt-1 font-mono">
                    Datei: {uiState.currentFileName}
                 </p>
             )}
          </div>
      ) : (
          <div className="mb-4 text-center pb-2 border-b border-slate-200">
             <h1 className="text-[12pt] font-normal text-slate-900 uppercase tracking-wider">
                {buildDynamicTitle()}
             </h1>
          </div>
      )}

      {/* A) BRIEFING & STRATEGIE */}
      {config.sections.briefing && (
        <section className="print-section mb-8">
           <SectionHeader title={t('print.sections.briefing', { defaultValue: 'Briefing & Strategie' })} />
           <BriefingView />
        </section>
      )}

      {/* B) FUNDAMENT & ANALYSE (+ ROUTE) */}
      {config.sections.analysis && (
        <>
          {(config.sections.briefing) && <PageBreak />}
          <section className="print-section">
             <SectionHeader title={t('print.sections.analysis', { defaultValue: 'Fundament & Analyse' })} />
             <AnalysisReviewView />
             
             {logistics.mode === 'roundtrip' && (
                <div className="mt-8 pt-8 border-t border-slate-200">
                   <h3 className="text-xl font-bold mb-4 uppercase print:break-after-avoid">Routen-Verlauf</h3>
                   <RouteReviewView />
                </div>
             )}
          </section>
        </>
      )}

      {/* C) REISEFÜHRER: TAGESPLAN */}
      {config.sections.days && (
        <>
           {(config.sections.briefing || config.sections.analysis) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.section_days', { defaultValue: 'Reiseführer: Tage (Chronologisch)' })} />
              <SightsView overrideSortMode="day" overrideDetailLevel={config.detailLevel} />
           </section>
        </>
      )}

      {/* D) REISEFÜHRER: TOUREN */}
      {config.sections.tours && (
        <>
           {(config.sections.briefing || config.sections.analysis || config.sections.days) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.sections.tours', { defaultValue: 'Reiseführer (Touren)' })} />
              <SightsView overrideSortMode="tour" overrideDetailLevel={config.detailLevel} />
           </section>
        </>
      )}

      {/* E) REISEFÜHRER: KATEGORIEN */}
      {config.sections.categories && (
        <>
           {(config.sections.briefing || config.sections.analysis || config.sections.days || config.sections.tours) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.sections.categories', { defaultValue: 'Reiseführer (Kategorien)' })} />
              <SightsView overrideSortMode="category" overrideDetailLevel={config.detailLevel} />
           </section>
        </>
      )}

      {/* F) REISE-INFOS */}
      {config.sections.infos && (
        <>
           {(config.sections.briefing || config.sections.analysis || config.sections.days || config.sections.tours || config.sections.categories) && <PageBreak />}
           <section className="print-section">
              <SectionHeader title={t('print.sections.infos', { defaultValue: 'Reise-Infos A-Z' })} />
              <InfoView />
           </section>
        </>
      )}

      {/* G1) REISETAGEBUCH - NUR KARTE */}
      {config.sections.diaryMap && (
        <>
           {!isOnlyDiary && <PageBreak />}
           <section className="print-section">
              {!isOnlyDiary && (
                  <SectionHeader title={t('print.section_diary_map', { defaultValue: 'Mein Reisetagebuch (Karte)' })} />
              )}
              
              {!hasDiaryEntries ? (
                  <p className="text-slate-500 italic mt-4">{t('print.no_diary_entries', { defaultValue: 'Noch keine Einträge im Tagebuch vorhanden.' })}</p>
              ) : (
                  <div className="print:break-inside-avoid">
                     <SightsMapView places={visitedPlaces} forceDiaryMode={true} isPrintMode={true} />
                  </div>
              )}
           </section>
        </>
      )}

      {/* G2) REISETAGEBUCH - NUR TEXT */}
      {config.sections.diary && (
        <>
           {(!isOnlyDiary || config.sections.diaryMap) && <PageBreak />}
           <section className="print-section">
              {(!isOnlyDiary || config.sections.diaryMap) && (
                  <SectionHeader title={t('print.section_diary_text', { defaultValue: 'Mein Reisetagebuch (Einträge)' })} />
              )}
              
              {!hasDiaryEntries ? (
                  <p className="text-slate-500 italic mt-4">{t('print.no_diary_entries', { defaultValue: 'Noch keine Einträge im Tagebuch vorhanden.' })}</p>
              ) : (
                  <DiaryPrintView />
              )}
           </section>
        </>
      )}

      {/* FOOTER */}
      <div className="mt-16 pt-4 border-t border-slate-100 text-center text-xs text-slate-400">
         Generiert mit Papatours AI • {project.meta.id}
      </div>

    </div>
  );
};
// --- END OF FILE 350 Zeilen ---