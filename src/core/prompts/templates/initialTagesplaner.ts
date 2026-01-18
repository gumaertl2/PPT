// 19.01.2026 19:20 - FIX: Corrected PromptBuilder pattern for Strategic Briefing & Appointments.
// src/core/prompts/templates/initialTagesplaner.ts
// 19.01.2026 13:00 - FIX: Restored V30 Legacy Schema (tag_nr -> tagNummer) for SSOT compliance.
// 18.01.2026 12:40 - BUILD-FIX: Replaced .withConstraint with .withInstruction (Fixes TS2339). Full logic preserved.
// 16.01.2026 21:00 - FEAT: Initial creation. Chunking-Aware Planning Logic.
// 17.01.2026 17:05 - FIX: Applied Strict Types (Zero Error Policy).
// 17.01.2026 17:45 - FIX: Corrected PromptBuilder import path.
// 17.01.2026 23:30 - REFACTOR: Migrated to Fluent PromptBuilder API (Fixes TS2339/TS2554).

import { PromptBuilder } from '../PromptBuilder';
import type { TripProject, Place, ChunkingContext } from '../../types';

/**
 * Hilfsfunktion: Bereitet Sights auf UND filtert bereits besuchte raus.
 */
const formatSightsForPrompt = (project: TripProject, excludedIds: string[]): string => {
  const { data } = project;
  const allSights = Object.values(data.places || {}).flat() as Place[];
  
  const availableSights = allSights.filter((s: Place) => !excludedIds.includes(s.id));

  if (availableSights.length === 0) {
    return "Keine weiteren spezifischen Orte verfügbar. Nutze dein allgemeines Wissen für passende Aktivitäten.";
  }

  return availableSights.map((s: Place) => {
    const prio = s.userPriority ? `[USER-PRIO: ${s.userPriority}] ` : '';
    const rating = s.rating ? ` (${s.rating}⭐)` : '';
    const address = s.address || s.vicinity || '';
    const locationInfo = address ? ` [Lage: ${address}]` : '';
    
    let openInfo = '';
    if (s.openingHours) {
        const openStr = Array.isArray(s.openingHours) ? s.openingHours.join(', ') : s.openingHours;
        if (openStr && typeof openStr === 'string' && openStr.length < 100) {
            openInfo = ` [Open: ${openStr}]`;
        }
    }

    return `- ${prio}${s.name}${rating}${locationInfo}: ${s.shortDesc || s.description || ''}${openInfo} (ID: ${s.id})`;
  }).join('\n');
};

/**
 * Baut den Prompt für den Tagesplaner.
 * Nutzt PromptBuilder Fluent API.
 */
export const buildInitialTagesplanerPrompt = (
    project: TripProject, 
    chunkData?: ChunkingContext, 
    feedback?: string,
    visitedSightIds: string[] = []
): string => {
  
  const { userInputs, analysis } = project; // FIX: Added analysis
  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'Deutsch';

  // 1. CHEF PLANER DATEN (V30 Parity)
  const chefPlaner = analysis.chefPlaner;
  const strategischesBriefing = chefPlaner?.strategisches_briefing?.itinerary_rules || chefPlaner?.strategisches_briefing?.sammler_briefing || "";
  const validierteTermine = chefPlaner?.validierte_termine || [];

  // 2. Builder initialisieren
  const builder = new PromptBuilder()
    .withRole('DU BIST EIN ELITE-REISEPLANER (KI). Erstelle einen detaillierten, logischen Tagesplan.');

  // 3. Rahmenbedingungen
  builder.withContext([
    `Reisetempo: ${userInputs.pace}`,
    `Interessen: ${userInputs.selectedInterests.join(', ')}`,
    `Gruppe: ${userInputs.travelers.adults} Erw., ${userInputs.travelers.children} Kinder`,
    `Sprache: ${lang}`
  ], 'RAHMENBEDINGUNGEN');

  // 4. Injektion der Strategie & Termine via Builder-Pattern
  if (strategischesBriefing) {
    builder.withContext(strategischesBriefing, "STRATEGISCHE VORGABE");
  }
  if (validierteTermine.length > 0) {
    builder.withContext(validierteTermine, "FIXTERMINE (UNVERRÜCKBAR)");
  }

  // 5. Chunking Logic
  let dayOffset = 0;
  if (chunkData) {
      dayOffset = chunkData.dayOffset || 0;
      const startDay = dayOffset + 1;
      const endDay = dayOffset + chunkData.days;
      const currentStations = chunkData.stations || [];

      builder.withInstruction(`ACHTUNG - TEILPLANUNG (CHUNKING):
      Du planst einen Teil-Abschnitt der Reise.
      - Von Tag: ${startDay}
      - Bis Tag: ${endDay}
      - Fokus-Orte für diesen Abschnitt: ${currentStations.join(', ')}`);

      if (visitedSightIds.length > 0) {
          builder.withInstruction(
            `BEREITS GEPLANT (DOPPELUNGEN VERMEIDEN): In den vorherigen Tagen wurden bereits ${visitedSightIds.length} Orte besucht. Diese wurden aus der Liste entfernt. Plane KEINE Orte doppelt!`
          );
      }
  } else {
      const stations = userInputs.logistics.mode === 'stationaer' 
        ? [userInputs.logistics.stationary.destination] 
        : userInputs.logistics.roundtrip.stops.map(s => s.location);
        
      builder.withInstruction("Erstelle den kompletten Reiseplan für die gesamte Reise.");
      builder.withContext(stations.join(', '), "Stationen");
  }

  // 6. Sights Context
  const sightsContext = formatSightsForPrompt(project, visitedSightIds);
  builder.withContext(sightsContext, 'VERFÜGBARE ORTE (USER PRIOS BEACHTEN)');

  // 7. User Feedback
  if (feedback) {
      builder.withInstruction(`USER FEEDBACK (ÄNDERUNGSWUNSCH): "${feedback}"\nBitte passe den Plan unter Berücksichtigung dieses Feedbacks an.`);
  }

  // 8. Logik
  builder.withInstruction(`LOGIK-REGELN:
  1. **Priorität:** Orte mit [USER-PRIO] MÜSSEN eingeplant werden (wenn geografisch machbar).
  2. **Cluster:** Nutze die [Lage] Informationen, um Orte zu gruppieren.
  3. **Timing:** Beachte [Open] Zeiten.
  4. **Logistik:** Kurze Wege zwischen Aktivitäten.`);

  // 9. Output Format
  const outputFormat = `
  Antworte AUSSCHLIESSLICH mit dem JSON.
  Struktur muss exakt kompatibel mit dem Frontend-Renderer sein:

  {
    "tage": [
      {
        "tagNummer": ${dayOffset + 1}, // Legacy-Key: tagNummer (nicht tag_nr)
        "datum": "YYYY-MM-DD" (wenn bekannt, sonst null),
        "titel": "Motto des Tages",
        "ort": "Hauptaufenthaltsort",
        "aktivitaeten": [
          {
            "uhrzeit": "09:00",
            "titel": "Name der Aktivität",
            "beschreibung": "Inspirierende Beschreibung (2-3 Sätze).",
            "dauer": "2h",
            "kosten": "ca. 15€",
            "original_sight_id": "ID_AUS_LISTE_OBEN" (WICHTIG für Mapping!),
            "art": "sight" | "food" | "transfer" | "pause"
          }
        ]
      }
    ]
  }`;
  
  builder.withOutputSchema(outputFormat);

  return builder.build();
};
// --- END OF FILE 137 Zeilen ---