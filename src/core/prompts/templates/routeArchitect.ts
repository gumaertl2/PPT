// src/core/prompts/templates/routeArchitect.ts
// 14.01.2026 20:10 - NEW: Ported 'Routen Architekt' logic from V30 (prompt-routen-architekt.js).
// 14.01.2026 21:45 - FIX: Added 'type' keyword to TripProject import to fix runtime SyntaxError.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

export const buildRouteArchitectPrompt = (project: TripProject, feedback?: string): string => {
  const { userInputs } = project;
  const { logistics, dates, travelers, budget, pace, selectedInterests } = userInputs;

  // 1. Basis-Daten extrahieren
  const region = logistics.roundtrip.region || "Unbekannte Region";
  const startLoc = logistics.roundtrip.startLocation || region;
  const endLoc = logistics.roundtrip.endLocation || startLoc;
  
  const duration = dates.duration;
  const season = dates.start || "Unbekannte Reisezeit";
  
  const groupString = `${travelers.groupType} (${travelers.adults} Adults, ${travelers.children} Children)`;
  
  // 2. Transport-Mittel Logik (V30 Portierung)
  const transportType = dates.arrival.type || 'car';
  const isCamper = transportType === 'camper' || transportType === 'other'; 
  
  let transportContext = "";
  if (isCamper) {
      transportContext = `
    # TRANSPORTMITTEL: WOHNMOBIL / CAMPER (KRITISCH)
    Der Nutzer reist mit einem großen Wohnmobil. Dies hat massive Auswirkungen auf die Routenwahl:
    1.  **Straßentauglichkeit:** Vermeide zwingend extrem enge Gassen, niedrige Unterführungen oder extrem steile Pässe.
    2.  **Routen-Charakter:** "Der Weg ist das Ziel". Wähle landschaftlich schöne Strecken (Scenic Routes).
    3.  **Etappenziele:** Plane so, dass die Tagesziele gut erreichbar sind und idealerweise in der Nähe von Camping-Möglichkeiten liegen.
      `;
  } else {
      transportContext = `
    # TRANSPORTMITTEL
    Reiseart: ${transportType} (Standard-PKW Planung).
      `;
  }

  // 3. Stationen-Vorgabe (V30 Portierung)
  let userStationsBlock = '';
  const forcedStops = logistics.roundtrip.stops || [];
  const strictRoute = logistics.roundtripOptions?.strictRoute || false;

  if (forcedStops.length > 0) {
      const stationList = forcedStops.map(s => s.location).join(', ');
      const exclusiveRule = strictRoute
          ? "Du darfst KEINE weiteren Orte vorschlagen. Deine Routen MÜSSEN sich exakt auf diese Stationen beschränken."
          : "Du kannst diese Stationen um weitere, logistisch passende Orte ergänzen, um die Reisedauer zu füllen.";

      userStationsBlock = `
      # ZWINGENDE VORGABE: VOM NUTZER DEFINIERTE STATIONEN
      Der Nutzer hat folgende Stationen für die Rundreise fest vorgegeben. Deine Routenvorschläge MÜSSEN auf diesen Orten basieren.
      * **Vorgegebene Stationen:** ${stationList}
      * **Regel:** ${exclusiveRule}
      ---
      `;
  }

  // 4. Zeit-Limits (Smart Constraints aus V30)
  const constraints = logistics.roundtrip.constraints;
  const maxEtappe = constraints?.maxDriveTimeLeg ? `${constraints.maxDriveTimeLeg} Stunden` : 'Nicht definiert';
  const maxGesamt = constraints?.maxDriveTimeTotal ? `${constraints.maxDriveTimeTotal} Stunden` : 'Nicht definiert';

  const timeConstraintsBlock = `
  # REGELWERK FÜR FAHRZEITEN (SMART CONSTRAINTS)
  Der Nutzer hat folgende Zeit-Budgets definiert:
  1.  **Max. Fahrzeit pro Etappe:** ${maxEtappe}
  2.  **Max. Gesamtfahrzeit:** ${maxGesamt}

  **WICHTIG (Soft Limits):**
  Dies sind Richtwerte. Priorisiere "Sinnhaftigkeit des Erlebnisses" vor "strikter Mathematik".
  `;

  // 5. Output Schema Definition (V30 Style)
  const outputSchema = {
    "routenVorschlaege": [
      {
        "routenName": "String (Peppiger Name)",
        "charakter": "String (Kurzbeschreibung)",
        "gesamtKilometer": "Integer",
        "gesamtFahrzeitStunden": "Float",
        "anzahlHotelwechsel": "String",
        "uebernachtungsorte": ["String (Chronologische Liste der Orte)"],
        "ankerpunkte": [
          {
            "standortFuerKarte": "String (Ortsname für Geocoding)",
            "adresse": "String (Konkrete Adresse für Marker)"
          }
        ],
        "begruendung": "String (Warum passt diese Route zur Strategie?)"
      }
    ]
  };

  // 6. Finaler Prompt Zusammenbau
  const system = `
      Du bist ein erfahrener Routen-Architekt für Rundreisen.
      Erstelle exakt 3 unterschiedliche Routen-Optionen für die Region "${region}".
      Startpunkt: ${startLoc}, Endpunkt: ${endLoc}.
      
      ${transportContext}
      ${userStationsBlock}
      ${timeConstraintsBlock}
    `;

  const task = `
      TRIP PARAMETERS:
      - Duration: ${duration} days
      - Season: ${season}
      - Travelers: ${groupString}
      - Budget: ${budget}
      - Pace: ${pace}
      - Interests: ${selectedInterests.join(', ')}

      ${feedback ? `\nUSER FEEDBACK (CRITICAL): "${feedback}"` : ""}

      Erstelle 3 Varianten (z.B. "Der Klassiker", "Die Entpannte", "Der Geheimtipp").
      
      OUTPUT SCHEMA:
      ${JSON.stringify(outputSchema, null, 2)}
    `;

  // FIX: Return 3 separate arguments instead of an object to fix TS2554
  return PromptBuilder.build(system, task, userInputs.aiOutputLanguage as any || 'de');
};
// --- END OF FILE 109 Zeilen ---