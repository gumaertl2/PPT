// src/core/prompts/templates/infoAutor.ts
// 17.01.2026 19:15 - FEAT: Ported 'InfoAutor' (Logistics & Safety) from V30.
// 17.01.2026 23:35 - REFACTOR: Migrated to PromptBuilder pattern (Unified Builder).

import type { TripProject } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

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
    let heimat = 'Unbekannt';
    if (logistics.mode === 'roundtrip' && logistics.roundtrip.startLocation) {
        heimat = logistics.roundtrip.startLocation;
    } else if (logistics.mode === 'stationaer' && (logistics.stationary as any).origin) {
        heimat = (logistics.stationary as any).origin;
    }

    const anreiseTyp = (logistics as any).arrivalType || 'Flugzeug/Mietwagen';
    const uniqueCountries = [...new Set(detectedCountries)].filter(Boolean);
    const countriesListString = uniqueCountries.length > 0 ? uniqueCountries.join(', ') : 'Unbekannt (bitte ermitteln)';

    // Aufgaben-Logik generieren
    const aufgabenListe = tasksChunk.map(p => {
        let anweisung = p.anweisung || `Keine spezifische Anweisung für Typ '${p.typ}' gefunden. Erstelle eine allgemeine, nützliche Beschreibung für '${p.titel}'.`;

        // FALL A: Stadt-Infos (Parkplätze & Logistik)
        if (p.typ === 'StadtInfo' && p.contextLocation) {
            anweisung = anweisung.replace('für jede wichtige Stadt auf meiner Reise', `für die Stadt: **${p.contextLocation}**`);
            anweisung = anweisung.replace('Erstelle für jede Stadt eine detaillierte, mehrteilige Zusammenfassung im Anhang.', `Erstelle die detaillierte, mehrteilige Zusammenfassung im Anhang **ausschließlich für die Stadt ${p.contextLocation}**.`);
            
            // Safety Catch: Länder als Städte maskiert
            if (['Tschechien', 'Österreich', 'Deutschland', 'Schweiz'].includes(p.contextLocation)) {
                 anweisung = `ACHTUNG: Der Ort "${p.contextLocation}" ist ein LAND, keine Stadt. Erstelle stattdessen eine kurze Übersicht über die wichtigsten touristischen Regionen dieses Landes. Ignoriere die Anweisung zu Parkplätzen in der Innenstadt.`;
            } else {
                 anweisung += `\n\n**LOGISTIK-PFLICHT:** Recherchiere und nenne konkrete **Parkmöglichkeiten** für Tagestouristen (z.B. Großparkplatz XY). Ist die Innenstadt autofrei?`;
            }
        }

        // FALL B: Reiseinformationen (Länderspezifisch)
        if (p.typ === 'Reiseinformationen') {
            const targetLocation = p.contextLocation || countriesListString;
            
            anweisung += `\n\n--------------------------------------------------\n`;
            anweisung += `**LOGISTIK-MATRIX (Harte Fakten):**\n`;
            anweisung += `* **Herkunft:** ${heimat}\n`;
            anweisung += `* **Zielgebiet:** ${targetLocation}\n`;
            anweisung += `* **Anreise:** ${anreiseTyp}\n\n`;
            
            anweisung += `**DEINE AUFGABE - SPEZIFISCHE RECHERCHE:**\n`;
            
            if (p.contextLocation) {
                anweisung += `1.  **FOKUS AUF ${p.contextLocation.toUpperCase()}:**\n`;
                anweisung += `    * Schreibe NUR über ${p.contextLocation}.\n`;
                anweisung += `    * **Maut & Vignette:** Preise 2025? Wo kaufen?\n`;
                anweisung += `    * **Verkehrsregeln:** Tempolimits, Lichtpflicht?\n`;
                anweisung += `    * **Währung & Zahlung:** Kartenzahlung verbreitet?\n`;
                
                if (p.contextLocation !== 'Deutschland' && heimat.includes('Deutschland')) {
                     anweisung += `    * **Einreise:** Ausweispflicht für deutsche Staatsbürger?\n`;
                }
            } else {
                anweisung += `1.  **LÄNDER-CHECK:** Analysiere die Route durch ${targetLocation}.\n`;
            }
            anweisung += `--------------------------------------------------\n`;
        }

        return `- **ID "${p.id}" (Titel: ${p.titel}, Typ: ${p.typ}):**\n  ${anweisung}`;
    }).join('\n\n');

    const role = `Du bist ein erfahrener Chefredakteur für Reiseführer, spezialisiert auf Logistik und rechtliche Hinweise. Deine Aufgabe ist es, Text-Platzhalter mit präzisen, recherchierten Fakten zu füllen.`;

    const instructions = `# REDAKTIONELLER STIL
- **Fokus:** Nutzwert, Sicherheit und Vermeidung von Touristenfallen.
- **Stil:** Sachlich, direkt, warnend wo nötig.

# QUALITÄTS-ANFORDERUNGEN
1.  **Erklären statt Aufzählen:** Zu jedem Punkt muss mindestens ein ganzer Satz geschrieben werden.
2.  **Die W-Fragen:** Nenne nicht nur "Es gibt eine Maut", sondern: WAS kostet sie? WO kauft man sie?
3.  **Umfang:** 300-500 Wörter pro Thema. Keine Wiederholungen!

# ZU BEARBEITENDE AUFGABEN${chunkingInfo}
Hier ist die Liste der IDs und die dazugehörigen Arbeitsanweisungen (AIA).

---
${aufgabenListe}
---`;

    const outputSchema = {
      "_gedankenschritte": [
        "String (Schritt 1: Analyse der Aufgabe...)",
        "String (Schritt 2: Recherche der Fakten...)"
      ],
      "info_kapitel": [
        { 
            id: "String", 
            typ: "String (MUSS exakt mit dem Typ aus der Aufgabenliste übereinstimmen)",
            inhalt: "String (Markdown-formatiert, alle Zeilenumbrüche als \\n maskiert)"
        }
      ]
    };

    return new PromptBuilder()
        .withOS()
        .withRole(role)
        .withInstruction(instructions)
        .withOutputSchema(outputSchema)
        .withSelfCheck(['basic', 'research'])
        .build();
};
// --- END OF FILE 130 Zeilen ---