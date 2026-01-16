// src/core/prompts/templates/initialTagesplaner.ts
// 16.01.2026 21:00 - FEAT: Initial creation. Chunking-Aware Planning Logic.
// 16.01.2026 21:30 - FIX: Added 'excludedSightIds' (Memory).
// 16.01.2026 23:55 - PERF: Added Address & OpeningHours to prompt for V30-level routing precision.

import type { TripProject } from '../../types';

/**
 * Hilfsfunktion: Bereitet Sights auf UND filtert bereits besuchte raus.
 */
const formatSightsForPrompt = (project: TripProject, excludedIds: string[]): string => {
  const { data } = project;
  // Wir nehmen an, die Sights liegen hier flach oder wir sammeln sie aus Kategorien
  const allSights = Object.values(data.places || {}).flat(); 
  
  // FILTER: Entferne Sights, die schon in vorherigen Chunks genutzt wurden
  const availableSights = allSights.filter((s: any) => !excludedIds.includes(s.id));

  if (availableSights.length === 0) return "Keine weiteren spezifischen Orte verfügbar. Nutze dein allgemeines Wissen für passende Aktivitäten.";

  return availableSights.map((s: any) => {
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
        // Annahme: Es ist ein String oder Array von Strings
        const openStr = Array.isArray(s.openingHours) ? s.openingHours.join(', ') : s.openingHours;
        if (openStr && openStr.length < 100) openInfo = ` [Open: ${openStr}]`;
    }

    // Format: "- [PRIO] Name (Rating) [Lage: ...] [Open: ...]: Kurzbeschreibung (ID: ...)"
    return `- ${prio}${s.name}${rating}${locationInfo}: ${s.shortDesc || s.description || ''}${openInfo} (ID: ${s.id})`;
  }).join('\n');
};

export const buildInitialTagesplanerPrompt = (
    project: TripProject, 
    chunkData?: any, 
    feedback?: string,
    visitedSightIds: string[] = [] // Das Gedächtnis
): string => {
  
  const { userInputs } = project;
  const { logistics, pace, selectedInterests } = userInputs;
  const lang = userInputs.aiOutputLanguage === 'en' ? 'English' : 'Deutsch';

  // --- CHUNKING LOGIC ---
  let scopeInstruction = "";
  let dayOffset = 0;
  let currentStations = [];

  if (chunkData) {
      // Chunking Modus
      dayOffset = chunkData.dayOffset || 0;
      const daysToPlan = chunkData.days;
      currentStations = chunkData.stations || [];
      const startDay = dayOffset + 1;
      const endDay = dayOffset + daysToPlan;

      scopeInstruction = `
ACHTUNG - TEILPLANUNG (CHUNKING):
Du planst einen Teil-Abschnitt der Reise.
- Von Tag: ${startDay}
- Bis Tag: ${endDay}
- Fokus-Orte für diesen Abschnitt: ${currentStations.join(', ')}

BEREITS GEPLANT (DOPPELUNGEN VERMEIDEN):
In den vorherigen Tagen (${1} bis ${dayOffset}) wurden bereits ${visitedSightIds.length} Orte besucht. 
Diese wurden aus der Liste unten entfernt. Plane KEINE Orte doppelt!
`;
  } else {
      // Full Plan Modus
      scopeInstruction = "Erstelle den kompletten Reiseplan für die gesamte Reise.";
      currentStations = logistics.mode === 'stationaer' 
        ? [logistics.stationary.destination] 
        : logistics.roundtrip.stops.map(s => s.location);
  }

  // --- SIGHTS PREP (MIT FILTER & DETAILS) ---
  const sightsContext = formatSightsForPrompt(project, visitedSightIds);

  const feedbackInstruction = feedback 
    ? `\n\nUSER FEEDBACK (ÄNDERUNGSWUNSCH): "${feedback}"\nBitte passe den Plan unter Berücksichtigung dieses Feedbacks an.` 
    : "";

  return `
DU BIST EIN ELITE-REISEPLANER (KI).
Erstelle einen detaillierten, logischen Tagesplan.

### RAHMENBEDINGUNGEN
- Reisetempo: ${pace}
- Interessen: ${selectedInterests.join(', ')}
- Gruppe: ${userInputs.travelers.adults} Erw., ${userInputs.travelers.children} Kinder
- Sprache: ${lang}

${scopeInstruction}

### VERFÜGBARE ORTE (USER PRIOS BEACHTEN)
Nutze bevorzugt diese Orte, wenn sie geografisch zu den aktuellen Stationen passen:
${sightsContext}

${feedbackInstruction}

### LOGIK-ANWEISUNGEN
1. **Priorität:** Orte mit [USER-PRIO] MÜSSEN eingeplant werden (wenn geografisch machbar).
2. **Cluster:** Nutze die [Lage] Informationen, um Orte zu gruppieren, die nah beieinander liegen.
3. **Timing:** Beachte [Open] Zeiten, um nicht vor geschlossenen Türen zu stehen.
4. **Logistik:** Achte auf kurze Wege zwischen Aktivitäten am selben Tag.

### OUTPUT FORMAT (STRIKTES JSON)
Antworte AUSSCHLIESSLICH mit dem JSON.
Struktur muss exakt kompatibel mit dem Frontend-Renderer sein:

{
  "tage": [
    {
      "tag_nr": ${dayOffset + 1},
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
}
`;
};
// --- END OF FILE 127 Zeilen ---