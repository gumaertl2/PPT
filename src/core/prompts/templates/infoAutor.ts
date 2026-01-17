// src/core/prompts/templates/infoAutor.ts
// 17.01.2026 19:15 - FEAT: Ported 'InfoAutor' (Logistics & Safety) from V30.
// Source: prompt-info-autor.js

import type { TripProject } from '../../types';
import { getPromptOperatingSystem, getStandardSelfCheck } from './prompt-helpers';

export const buildInfoAutorPrompt = (
    project: TripProject,
    tasksChunk: any[], 
    currentChunk: number = 1, 
    totalChunks: number = 1, 
    detectedCountries: string[] = []
): string | null => {
    
    if (!tasksChunk || tasksChunk.length === 0) {
        return null;
    }

    const { userInputs } = project;
    const { logistics } = userInputs;
    
    const chunkingInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    // Daten-Mapping V40
    // Heimatort versuchen wir aus der Logistik zu lesen, sonst Default
    let heimat = 'Unbekannt';
    if (logistics.mode === 'roundtrip' && logistics.roundtrip.startLocation) {
        heimat = logistics.roundtrip.startLocation;
    } else if (logistics.mode === 'stationaer' && (logistics.stationary as any).origin) {
        heimat = (logistics.stationary as any).origin;
    }

    // Anreise-Typ
    const anreiseTyp = (logistics as any).arrivalType || 'Flugzeug/Mietwagen'; // Fallback falls nicht in Types

    // Wir bereiten die Länder-Infos vor
    const uniqueCountries = [...new Set(detectedCountries)].filter(Boolean);
    const countriesListString = uniqueCountries.length > 0 ? uniqueCountries.join(', ') : 'Unbekannt (bitte ermitteln)';

    const aufgabenListe = tasksChunk.map(p => {
        // V30: Anweisung holen oder Default
        let anweisung = p.anweisung || `Keine spezifische Anweisung für Typ '${p.typ}' gefunden. Erstelle eine allgemeine, nützliche Beschreibung für '${p.titel}'.`;

        // FALL A: Stadt-Infos (Parkplätze & Logistik)
        if (p.typ === 'StadtInfo' && p.contextLocation) {
            anweisung = anweisung.replace('für jede wichtige Stadt auf meiner Reise', `für die Stadt: **${p.contextLocation}**`);
            anweisung = anweisung.replace('Erstelle für jede Stadt eine detaillierte, mehrteilige Zusammenfassung im Anhang.', `Erstelle die detaillierte, mehrteilige Zusammenfassung im Anhang **ausschließlich für die Stadt ${p.contextLocation}**.`);
            
            // Länderspezifische Anpassung für "Tschechien" als Stadt (Safety Catch)
            if (['Tschechien', 'Österreich', 'Deutschland', 'Schweiz'].includes(p.contextLocation)) {
                 anweisung = `ACHTUNG: Der Ort "${p.contextLocation}" ist ein LAND, keine Stadt. Erstelle stattdessen eine kurze Übersicht über die wichtigsten touristischen Regionen dieses Landes. Ignoriere die Anweisung zu Parkplätzen in der Innenstadt.`;
            } else {
                 anweisung += `\n\n**LOGISTIK-PFLICHT:** Recherchiere und nenne konkrete **Parkmöglichkeiten** für Tagestouristen (z.B. Großparkplatz XY, Parkhaus Zentrum). Ist die Innenstadt autofrei?`;
            }
        }

        // FALL B: Reiseinformationen (Länderspezifisch oder Allgemein)
        if (p.typ === 'Reiseinformationen') {
            const targetLocation = p.contextLocation || countriesListString; // Entweder spezifisches Land oder Liste
            
            anweisung += `\n\n--------------------------------------------------\n`;
            anweisung += `**LOGISTIK-MATRIX (Harte Fakten):**\n`;
            anweisung += `* **Herkunft der Reisenden:** ${heimat}\n`;
            anweisung += `* **Zielgebiet für dieses Kapitel:** ${targetLocation}\n`;
            anweisung += `* **Anreiseart:** ${anreiseTyp}\n\n`;
            
            anweisung += `**DEINE AUFGABE - SPEZIFISCHE RECHERCHE:**\n`;
            
            // Wenn wir ein konkretes Land haben (neue Logik)
            if (p.contextLocation) {
                anweisung += `1.  **FOKUS AUF ${p.contextLocation.toUpperCase()}:**\n`;
                anweisung += `    * Schreibe NUR über ${p.contextLocation}. Vermische keine Infos mit anderen Ländern.\n`;
                anweisung += `    * **Maut & Vignette:** Gibt es in ${p.contextLocation} eine Vignettenpflicht? Preise 2025? Wo kaufen (Digital/Kleben)?\n`;
                anweisung += `    * **Verkehrsregeln:** Tempolimits, Lichtpflicht, Warnwesten?\n`;
                anweisung += `    * **Währung & Zahlung:** Welche Währung gilt? Kartenzahlung verbreitet?\n`;
                
                if (p.contextLocation !== 'Deutschland' && heimat.includes('Deutschland')) {
                     anweisung += `    * **Einreise:** Ausweispflicht für deutsche Staatsbürger?\n`;
                }
            } else {
                // Fallback (Alte Logik für generische "Reiseinfos")
                anweisung += `1.  **LÄNDER-CHECK:**\n`;
                anweisung += `    * Analysiere die Route durch: ${targetLocation}.\n`;
                anweisung += `    * Erstelle für JEDES fremde Land einen Abschnitt zu Maut, Vignette und Einreise.\n`;
            }
            
            anweisung += `2.  **MIETWAGEN-RISIKO (Nur wenn relevant):**\n`;
            anweisung += `    * Falls das Zielgebiet (${targetLocation}) für unbefestigte Straßen bekannt ist (z.B. Almwege, Strände), füge eine Warnung zum Versicherungsschutz (Offroad) hinzu.\n`;
            anweisung += `--------------------------------------------------\n`;
        }

        return `- **ID "${p.id}" (Titel: ${p.titel}, Typ: ${p.typ}):**\n  ${anweisung}`;
    }).join('\n\n');

    const outputSchema = { 
        id: "String", 
        typ: "String (MUSS exakt mit dem Typ aus der Aufgabenliste übereinstimmen)",
        inhalt: "String (Markdown-formatiert, alle Zeilenumbrüche als \\n maskiert)"
    };

    // Helper Fallbacks
    const osPrompt = typeof getPromptOperatingSystem === 'function' ? getPromptOperatingSystem() : '';
    const checkPrompt = typeof getStandardSelfCheck === 'function' ? getStandardSelfCheck(['basic', 'research']) : '';

    return `
${osPrompt}

# ROLLE & AUFGABE
Du bist ein erfahrener Chefredakteur für Reiseführer, spezialisiert auf Logistik und rechtliche Hinweise. Deine Aufgabe ist es, Text-Platzhalter mit präzisen, recherchierten Fakten zu füllen.

# REDAKTIONELLER STIL
- **Fokus:** Nutzwert, Sicherheit und Vermeidung von Touristenfallen.
- **Stil:** Sachlich, direkt, warnend wo nötig.
- **Struktur:** Nutze Markdown (Überschriften, Listen), um die Texte lesbar zu gestalten.

# QUALITÄTS-ANFORDERUNGEN (ANTI-LOOP & TIEFE)
1.  **Erklären statt Aufzählen:** Reine Listen (Bulletpoints ohne Inhalt) sind verboten. Zu jedem Punkt muss mindestens ein ganzer Satz geschrieben werden.
2.  **Die W-Fragen:** Nenne nicht nur "Es gibt eine Maut", sondern: WAS kostet sie? WO kauft man sie? WIE lange gilt sie?
3.  **Umfang & Abbruch:** Schreibe so detailliert wie nötig, aber höre sofort auf, wenn die relevanten Informationen erschöpft sind. Ein Richtwert sind 300-500 Wörter pro Thema. Erfinde keinen Text, um Länge zu schinden (Gefahr von Endlosschleifen!). Keine Wiederholungen!

# ZU BEARBEITENDE AUFGABEN${chunkingInfo}
Hier ist die Liste der IDs und die dazugehörigen Arbeitsanweisungen (AIA).

---
${aufgabenListe}
---

# VERBINDLICHES ZIELFORMAT
Du musst zwingend ein **JSON-Objekt** erstellen (KEIN Array als Wurzel!), das deine Gedanken und die Ergebnisse enthält.
**WICHTIG:** Das Feld \`inhalt\` ist für den fertigen Text. Schreibe NIEMALS deine internen Gedankenschritte in dieses Feld. Nutze dafür \`_gedankenschritte\`.

\`\`\`json
{
  "_gedankenschritte": [
    "String (Schritt 1: Analyse der Aufgabe...)",
    "String (Schritt 2: Recherche der Fakten für Land XY...)"
  ],
  "info_kapitel": [
    ${JSON.stringify(outputSchema, null, 2)}
  ]
}
\`\`\`

${checkPrompt}

Beginne deine Antwort direkt mit \`\`\`json.`;
};
// --- END OF FILE 135 Zeilen ---