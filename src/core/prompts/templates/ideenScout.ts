// src/core/prompts/templates/ideenScout.ts
// 17.01.2026 18:20 - FEAT: Ported 'IdeenScout' (Special Days) from V30.
// Source: prompt-ideen-scout.js

import type { TripProject } from '../../types';
import { getPromptOperatingSystem, getStandardSelfCheck } from './prompt-helpers';

export const buildIdeenScoutPrompt = (
    project: TripProject, 
    location: string, 
    blockedActivities: string[] = [] // IDs oder Namen, die schon verplant sind
): string => {
  const { userInputs } = project;
  const { selectedInterests } = userInputs;

  // Interessen-String für den Prompt
  const interessenString = selectedInterests.join(', ');

  // Prompt-Konstanten aus V30
  const ideaSchema = {
      "name": "String",
      "beschreibung": "String (Warum ist das eine tolle Idee und was erwartet den Reisenden?)",
      "geschaetzte_dauer_minuten": "Integer",
      "adresse": "String (Eine für Google Maps auffindbare Adresse)",
      "website_url": "String | null",
      "planungs_hinweis": "String (Ein praktischer Tipp zur Planung, z.B. 'Am besten am Vormittag besuchen' oder 'Reservierung empfohlen')"
  };

  const outputSchema = {
    "sonnentag_ideen": [ideaSchema],
    "schlechtwetter_ideen": [ideaSchema]
  };

  // Fallback für Imports, falls prompt-helpers noch nicht existiert
  const osPrompt = typeof getPromptOperatingSystem === 'function' ? getPromptOperatingSystem() : '';
  const checkPrompt = typeof getStandardSelfCheck === 'function' ? getStandardSelfCheck(['basic', 'research']) : '';

  return `
${osPrompt}

# ROLLE & AUFGABE
Du bist ein kreativer und ortskundiger "Ideen-Scout". Deine Aufgabe ist es, für einen bestimmten Ort einzigartige und passende Aktivitäten für besondere Tage zu finden. Du erstellst **KEINEN** Zeitplan, sondern einen flexiblen, detailreichen Ideen-Pool.

# DEINE MISSION
Finde für den Übernachtungsort **"${location}"** jeweils 2-3 brandneue, kreative Ideen für die folgenden zwei Szenarien. Recherchiere für jede Idee **live im Internet**, um alle Fakten für das Zielschema zu sammeln.

### Szenario 1: Ein perfekter Sonnentag zum Entspannen
Schlage Outdoor-Aktivitäten vor, die entspannend und genussvoll sind. Beispiele: ein besonderer lokaler Park, ein Café an einem Seeufer, ein kleiner Bootsverleih, ein schöner Aussichtspunkt abseits der Massen, ein Besuch in einem Weingut.

### Szenario 2: Ein verregneter oder ungemütlicher Tag
Schlage spannende und gemütliche Indoor-Aktivitäten vor. Beispiele: ein kleines, unbekanntes Spezialisten-Museum (z.B. für Fotografie, Design), eine historische Bibliothek, eine architektonisch interessante Markthalle, ein Programmkino, ein besonders gemütliches Teehaus.

# FALLBACK-STRATEGIE FÜR KLEINE ORTE (WICHTIG!)
- Wenn der Ort **"${location}"** sehr klein ist (ein Dorf oder Weiler) und keine eigenen Indoor-Attraktionen hat:
- **ERWEITERE DEINEN SUCHRADIUS SOFORT AUF DIE REGION!**
- Suche im Umkreis von 20-30 Minuten Fahrzeit nach der nächstgrößeren Stadt oder regionalen Attraktion.
- Es ist viel besser, eine regionale Idee zu liefern (z.B. "Therme in der Nachbarstadt"), als eine leere Liste zurückzugeben.
- Gib im \`planungs_hinweis\` an, dass eine kurze Fahrt nötig ist.

# ZWINGENDE REGELN
- **Regel 1 (Keine Duplikate):** Deine Vorschläge dürfen **NICHT** in der folgenden Liste der bereits verplanten Orte enthalten sein. Finde wirklich NEUE Ideen.
  \`\`\`
  ${JSON.stringify(blockedActivities, null, 2)}
  \`\`\`
- **Regel 2 (Inspiration):** Lasse dich bei deiner Suche von den Kerninteressen des Reisenden leiten:
  \`\`\`
  ${interessenString}
  \`\`\`
- **Regel 3 (Fakten-Tiefe):** Für JEDE Idee musst du ALLE Felder des Schemas sorgfältig ausfüllen. Eine Adresse ist obligatorisch. Wenn eine Information (z.B. Website) nicht existiert, setze den Wert auf \`null\`.

# VERBINDLICHES ZIELFORMAT
Deine Antwort MUSS exakt dem folgenden JSON-Schema entsprechen.
\`\`\`json
${JSON.stringify(outputSchema, null, 2)}
\`\`\`

${checkPrompt}

Beginne deine Antwort direkt mit \`\`\`json.
`;
};
// --- END OF FILE 86 Zeilen ---