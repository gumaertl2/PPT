// src/core/prompts/templates/anreicherer.ts
// 12.01.2026 10:45
// TEMPLATE: ANREICHERER (Data Enricher) - V40 Port
// UPDATE: Switch to ID-based matching. Input is now List<{id, name}>, Output must include ID.

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

/**
 * Das Ziel-Schema für einen Ort in V40.
 * UPDATE: Enthält nun zwingend die 'id' zur Identifikation.
 */
const SIGHT_SCHEMA = {
  "id": "String (MUSS exakt die ID aus der Eingabe-Liste sein!)",
  "name": "String (Offizieller Name)",
  "stadt": "String (Nur Ortsname, ohne PLZ)",
  "land": "String (Landesname)",
  "kategorie": "String (Passende Kategorie)",
  "kurzbeschreibung": "String (1-2 Sätze, inspirierend)",
  "geo_koordinaten": {
    "lat": "Number (Breitengrad)",
    "lng": "Number (Längengrad)"
  },
  "adresse": "String (Navigierbare Adresse, ohne Ortsname am Anfang)",
  "oeffnungszeiten": "String (Zusammenfassung für den Reisezeitraum)",
  "dauer_min": "Number (Empfohlene Besuchsdauer in Minuten)",
  "preis_tendenz": "String (Kostenlos, Günstig, Mittel, Teuer)",
  "logistics_info": "String (Parken, ÖPNV Anbindung)"
};

export const buildAnreichererPrompt = (project: TripProject): string => {
    const { userInputs, meta, analysis } = project;
    
    // UI Sprache für den Output bestimmen
    const outputLang = userInputs.aiOutputLanguage || meta.language;

    // 1. DATEN-QUELLEN
    // Wir holen uns alle Orte aus dem State (die vom Sammler angelegt wurden).
    // WICHTIG: Wir übergeben ID und NAME, damit die KI die ID zurückgeben kann.
    
    const rawCandidates = Object.values(project.data.places || {}).map((p: any) => ({
        id: p.id,
        name: p.name || "Unbekannter Ort"
    }));

    // Fallback, falls leer (damit Prompt nicht crasht)
    const candidatesList = rawCandidates.length > 0 
        ? rawCandidates 
        : [{ id: "dummy-example-id", name: "Beispiel Sehenswürdigkeit" }];

    const dates = `${userInputs.dates.start} bis ${userInputs.dates.end}`;
    const fixedEvents = userInputs.dates.fixedEvents || [];

    // 2. PROMPT CONSTRUCTION
    const prompt = `
# ROLE & MISSION
You are a high-precision Data Enricher. Your **sole mission** is to enrich a given list of **CANDIDATES** (IDs & Names) with hard, verifiable facts.

# MANDATORY RULES & WORKFLOW
- **Rule 1 (Pass-Through ID):** The input list contains objects with \`id\` and \`name\`. You MUST return the EXACT \`id\` for each object in your output. This is used for matching.
- **Rule 2 (Completeness):** Your final output MUST contain **exactly as many objects** as the input list. No item may be missing.
- **Rule 3 (Live Research):** Research **live** for every name to find the most current data.
- **Rule 4 (Structure Discipline):** Fill the fields \`stadt\` (city) and \`land\` (country) separately and cleanly.
    * **City:** Only the official name of the municipality (no Zip code). For nature spots, name the nearest municipality.
    * **Country:** Essential for logistics.
- **Rule 5 (Availability):** Check opening hours explicitly for the travel period: **${dates}**.
- **Rule 6 (Coordinates - PRIO A):** You MUST find exact Geo-Coordinates (lat/lng). This is critical for the map.
- **Rule 7 (Address Hygiene - PRIO B):** The \`adresse\` field must be navigable.
    * ✅ GOOD: "Rue de Rivoli, 75001 Paris"
    * ❌ FORBIDDEN: "Louvre Museum, Rue de Rivoli..." (NEVER put the place name in the address field!)
- **Rule 8 (Logistics):** For cities or busy spots, research parking/transit info and put it in \`logistics_info\`.

# DATA BASIS

### Travel Period
"${dates}"

### Fixed Appointments (for Identification)
\`\`\`json
${JSON.stringify(fixedEvents, null, 2)}
\`\`\`

### List of Candidates to Enrich (ID & Name)
\`\`\`json
${JSON.stringify(candidatesList, null, 2)}
\`\`\`

# MANDATORY TARGET FORMAT
Your response MUST be a valid JSON Array. Every object must follow this schema exactly.
Generate the content (descriptions) in **${outputLang === 'de' ? 'German' : 'English'}**.

\`\`\`json
${JSON.stringify(SIGHT_SCHEMA, null, 2)}
\`\`\`

Response in valid JSON only. Start directly with \`\`\`json.
`;

    return PromptBuilder.build(prompt, "", outputLang);
};
// --- END OF FILE 98 Zeilen ---