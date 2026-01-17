// src/core/prompts/templates/initialTagesplaner.ts
// 16.01.2026 21:00 - FEAT: Initial creation. Chunking-Aware Planning Logic.
// 16.01.2026 21:30 - FIX: Added 'excludedSightIds' (Memory).
// 16.01.2026 23:55 - PERF: Added Address & OpeningHours to prompt for V30-level routing precision.
// 17.01.2026 16:45 - REFACTOR: Migration to PromptBuilder Pattern.
// 17.01.2026 17:05 - FIX: Applied Strict Types (Zero Error Policy).

import { PromptBuilder } from '../builder';
import type { TripProject, Place, ChunkingContext } from '../../types';

/**
 * Hilfsfunktion: Bereitet Sights auf UND filtert bereits besuchte raus.
 * Behält spezifische Formatierungslogik bei, die nicht generisch im Builder ist.
 */
const formatSightsForPrompt = (project: TripProject, excludedIds: string[]): string => {
  const { data } = project;
  // Wir nehmen an, die Sights liegen hier flach oder wir sammeln sie aus Kategorien
  // Strict Type Cast: Wir wissen durch types.ts, dass es Place[] arrays sind.
  const allSights = Object.values(data.places || {}).flat() as Place[];
  
  // FILTER: Entferne Sights, die schon in vorherigen Chunks genutzt wurden (Memory)
  const availableSights = allSights.filter((s: Place) => !excludedIds.includes(s.id));

  if (availableSights.length === 0) {
    return "Keine weiteren spezifischen Orte verfügbar. Nutze dein allgemeines Wissen für passende Aktivitäten.";
  }

  return availableSights.map((s: Place) => {
    // Human-in-the-Loop: Zeige Prio an
    const prio = s.userPriority ? `[USER-PRIO: ${s.userPriority}] ` : '';
    const rating = s.rating ? ` (${s.rating}⭐)` : '';
    
    // NEU: Geografische & Zeitliche Metadaten für V30-Routing-Qualität
    const address = s.address || s.vicinity || '';
    const locationInfo = address ? ` [Lage: ${address}]` : '';
    
    // Einfache Darstellung der Öffnungszeiten (falls String oder Array)
    let openInfo = '';
    if (s.openingHours) {
        // Falls komplexes Objekt, vereinfachen wir es hier ggf.
        const openStr = Array.isArray(s.openingHours) ? s.openingHours.join(', ') : s.openingHours;
        if (openStr && typeof openStr === 'string' && openStr.length < 100) {
            openInfo = ` [Open: ${openStr}]`;
        }
    }

    // Format: "- [PRIO] Name (Rating) [Lage: ...] [Open: ...]: Kurzbeschreibung (ID: ...)"
    return `- ${prio}${s.name}${rating}${locationInfo}: ${s.shortDesc || s.description || ''}${openInfo} (ID: ${s.id})`;
  }).join('\n');
};

/**
 * Baut den Prompt für den Tagesplaner.
 * Nutzt PromptBuilder für konsistente Struktur und integriert Chunking-Logik.
 */
export const buildInitialTagesplanerPrompt = (
    project: TripProject, 
    chunkData?: ChunkingContext, 
    feedback?: string,
    visitedSightIds: string[] = [] // Das Gedächtnis
): string => {
  
  const { userInputs } = project;
  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'Deutsch';

  // 1. Builder initialisieren
  const builder = new PromptBuilder(
    'DU BIST EIN ELITE-REISEPLANER (KI). Erstelle einen detaillierten, logischen Tagesplan.'
  );

  // 2. Rahmenbedingungen setzen
  builder.addContext('RAHMENBEDINGUNGEN', [
    `Reisetempo: ${userInputs.pace}`,
    `Interessen: ${userInputs.selectedInterests.join(', ')}`,
    `Gruppe: ${userInputs.travelers.adults} Erw., ${userInputs.travelers.children} Kinder`,
    `Sprache: ${lang}`
  ]);

  // 3. Chunking Logic (Scope & Memory)
  let dayOffset = 0;
  if (chunkData) {
      // Chunking Modus
      dayOffset = chunkData.dayOffset || 0;
      const startDay = dayOffset + 1;
      const endDay = dayOffset + chunkData.days;
      const currentStations = chunkData.stations || [];

      builder.addInstruction(`ACHTUNG - TEILPLANUNG (CHUNKING):
      Du planst einen Teil-Abschnitt der Reise.
      - Von Tag: ${startDay}
      - Bis Tag: ${endDay}
      - Fokus-Orte für diesen Abschnitt: ${currentStations.join(', ')}`);

      if (visitedSightIds.length > 0) {
          builder.addConstraint(
            `BEREITS GEPLANT (DOPPELUNGEN VERMEIDEN): In den vorherigen Tagen wurden bereits ${visitedSightIds.length} Orte besucht. Diese wurden aus der Liste entfernt. Plane KEINE Orte doppelt!`
          );
      }
  } else {
      // Full Plan Modus
      const stations = userInputs.logistics.mode === 'stationaer' 
        ? [userInputs.logistics.stationary.destination] 
        : userInputs.logistics.roundtrip.stops.map(s => s.location);
        
      builder.addInstruction("Erstelle den kompletten Reiseplan für die gesamte Reise.");
      builder.addContext("Stationen", stations.join(', '));
  }

  // 4. Sights Context (Aufbereitet durch Helper)
  const sightsContext = formatSightsForPrompt(project, visitedSightIds);
  builder.addContext('VERFÜGBARE ORTE (USER PRIOS BEACHTEN)', sightsContext);

  // 5. User Feedback Loop
  if (feedback) {
      builder.addInstruction(`USER FEEDBACK (ÄNDERUNGSWUNSCH): "${feedback}"\nBitte passe den Plan unter Berücksichtigung dieses Feedbacks an.`);
  }

  // 6. Logik-Anweisungen (V30 Routing Regeln)
  builder.addInstruction(`LOGIK-REGELN:
  1. **Priorität:** Orte mit [USER-PRIO] MÜSSEN eingeplant werden (wenn geografisch machbar).
  2. **Cluster:** Nutze die [Lage] Informationen, um Orte zu gruppieren, die nah beieinander liegen (kurze Wege).
  3. **Timing:** Beachte [Open] Zeiten, um nicht vor geschlossenen Türen zu stehen.
  4. **Logistik:** Achte auf kurze Wege zwischen Aktivitäten am selben Tag.`);

  // 7. Output Format (Strict JSON)
  builder.setOutputFormat(`
  Antworte AUSSCHLIESSLICH mit dem JSON.
  Struktur muss exakt kompatibel mit dem Frontend-Renderer sein:

  {
    "tage": [
      {
        "tag_nr": ${dayOffset + 1}, // Startet beim korrekten Tag (Offset beachten)
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
  }`);

  return builder.build();
};
// --- END OF FILE 136 Zeilen ---