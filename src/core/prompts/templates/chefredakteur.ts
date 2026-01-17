// src/core/prompts/templates/chefredakteur.ts
// 17.01.2026 19:10 - FEAT: Ported 'Chefredakteur' (Content Editor) from V30.
// Source: prompt-chefredakteur.js

import type { TripProject } from '../../types';
import { getPromptOperatingSystem, getStandardSelfCheck } from './prompt-helpers';

export const buildChefredakteurPrompt = (
    project: TripProject,
    tasksChunk: any[], // Die Teil-Liste der zu bearbeitenden Sights
    currentChunk: number = 1,
    totalChunks: number = 1
): string | null => {
    
    // Safety Check
    if (!tasksChunk || tasksChunk.length === 0) {
        return null;
    }

    const { data } = project;
    const chunkingInfo = totalChunks > 1 ? ` (Block ${currentChunk}/${totalChunks})` : '';

    // Helper: Finde Sight-Daten in Masterliste (V30 Logic Port)
    const findSightData = (anhangId: string) => {
        const masterliste = (data.sights as any[]) || [];
        if (masterliste.length === 0) return null;

        // Anhang-ID ist meist "anhang_sight_XYZ", aber manchmal auch direkt die ID
        // Wir versuchen beide Strategien, um robust zu sein.
        const cleanId = anhangId.replace('anhang_sight_', '').replace('anhang_', '');
        
        return masterliste.find(s => s.id === cleanId || s.id === anhangId);
    };

    // Aufgabenliste generieren
    const aufgabenListe = tasksChunk.map(p => {
        // Fallback für Anweisung, falls nicht im Objekt enthalten (V30 Logic)
        let anweisung = p.anweisung || `Keine spezifische Anweisung für Typ '${p.typ}' gefunden. Erstelle eine allgemeine, nützliche Beschreibung für '${p.titel}'.`;

        // V25.1: Kontext-Injektion für präzisere Texte
        const sightData = findSightData(p.id);
        let contextString = "";
        
        if (sightData) {
            const stadt = sightData.stadt || "Unbekannt";
            const land = sightData.land || "Unbekannt";
            const adresse = sightData.adresse || "Keine Adresse";
            contextString = `\n  **KONTEXT (WICHTIG):** Ort: ${stadt}, Land: ${land}, Adresse: ${adresse}. Nutze diese Info, um Verwechslungen mit gleichnamigen Orten zu vermeiden.`;
        }

        // Spezial-Logik für Stadtbezirke (Waypoints)
        if (p.typ === 'Stadtbezirke') {
            anweisung += `\n\n**ZUSATZAUFGABE FÜR KARTEN-LINK:** Erstelle ZUSÄTZLICH zum \`inhalt\`-Text ein Array namens \`wegpunkte\`. Dieses Array muss für jede der im Text genannten Stationen des Spaziergangs ein Objekt enthalten. Jedes Objekt muss die Schlüssel \`name\` und \`adresse\` haben.\n**WICHTIGE REGEL:** Der Wert für \`name\` im \`wegpunkte\`-Objekt muss **EXAKT** mit der im Text verwendeten, fett markierten Überschrift oder dem Namen der Station übereinstimmen (z.B. muss aus \"**4. Plaza de España & Rathaus**\" der Name \"Plaza de España & Rathaus\" werden). Gib für \`adresse\` eine für Google Maps auffindbare, genaue Adresse an.`;
        }

        return `- **ID "${p.id}" (Titel: ${p.titel}, Typ: ${p.typ}):**${contextString}\n  ${anweisung}`;
    }).join('\n\n');

    const outputSchema = { 
        id: "String", 
        typ: "String (MUSS exakt mit dem Typ aus der Aufgabenliste übereinstimmen)",
        inhalt: "String (Markdown-formatiert, alle Zeilenumbrüche als \\n maskiert)",
        wegpunkte: [
            {
                name: "String",
                adresse: "String"
            }
        ]
    };

    // Fallback für Helper, falls prompt-helpers.ts fehlt
    const osPrompt = typeof getPromptOperatingSystem === 'function' ? getPromptOperatingSystem() : '';
    const checkPrompt = typeof getStandardSelfCheck === 'function' ? getStandardSelfCheck(['basic', 'research']) : '';

    return `
${osPrompt}

# ROLLE & AUFGABE
Du bist ein erfahrener Chefredakteur für Premium-Reiseführer. Deine Aufgabe ist es, für eine gegebene Liste von Sehenswürdigkeiten (Museen, Architektur, Stadtbezirke etc.) ansprechende, informative und gut strukturierte Detailtexte im Markdown-Format zu schreiben.

# REDAKTIONELLER STIL (VERBINDLICH)
- **Stilvorgabe:** Dein Schreibstil muss sachlich, detailliert und informativ sein.
- **Inhaltliche Tiefe:** Reichere deine Texte aktiv mit interessanten Hintergrundgeschichten, historischen Fakten und unterhaltsamen Anekdoten an, um den Inhalt lebendig und einzigartig zu machen.
- **Verbotene Elemente:** Ignoriere bei der Texterstellung explizit die allgemeine "Emotionale Stimmung" der Reise. Der Tonfall soll enzyklopädisch und nicht emotional sein. Konzentriere dich auf Fakten und Geschichten.

# QUALITÄTS-ANFORDERUNGEN (ANTI-LOOP & TIEFE)
1.  **Narrative Tiefe statt Listen:** Reine Aufzählungen sind verboten. Schreibe fließende, zusammenhängende Absätze. Wenn du Fakten nennst, verwebe sie in eine Geschichte.
2.  **Detail-Liebe:** Beschreibe nicht nur, DASS es etwas zu sehen gibt, sondern WIE es aussieht, riecht oder klingt.
3.  **Umfang & Abbruch:** Schreibe ausführlich (Richtwert: 250-400 Wörter pro Sight), aber höre sofort auf, wenn die relevanten Informationen erschöpft sind. Fülle niemals Text künstlich auf (Gefahr von Endlosschleifen!).

# ZU BEARBEITENDE AUFGABEN${chunkingInfo}
Hier ist die Liste der IDs und die dazugehörigen Arbeitsanweisungen (TIA), die du exakt umsetzen musst. Führe für jede ID eine Live-Internet-Recherche durch, um die besten und aktuellsten Informationen zu liefern. Beachte zwingend den angegebenen **KONTEXT** (Ort/Land), um den richtigen Ort zu beschreiben.

---
${aufgabenListe}
---

# VERBINDLICHES ZIELFORMAT & REGELN
- Deine Antwort MUSS ein JSON-Array sein.
- Jedes Objekt im Array muss die Felder \`id\`, \`typ\` und \`inhalt\` enthalten.
- **Für Typ "Stadtbezirke":** Das Objekt MUSS ZUSÄTZLICH das Feld \`wegpunkte\` enthalten. Bei allen anderen Typen lässt du dieses Feld weg.
- Der Wert des \`id\`-Feldes MUSS exakt mit der Original-ID aus der Aufgabenliste übereinstimmen.
- Der Wert des \`typ\`-Feldes MUSS exakt mit dem Original-Typ aus der Aufgabenliste übereinstimmen.
- Der \`inhalt\` MUSS im Markdown-Format sein.
- Formatiere ALLE URLs im Text zwingend als klickbare Links mit einem beschreibenden Text. Beispiel: \`[Zur offiziellen Webseite](https://beispiel.de)\` statt nur \`https://beispiel.de\`.
- **WICHTIGSTE REGEL ZUM FORMAT:** Der gesamte Wert des "inhalt"-Feldes muss eine **einzigartige Zeichenkette** sein. Alle Zeilenumbrüche innerhalb deines Textes **MÜSSEN** als \`\\n\` maskiert werden.

\`\`\`json
[
  ${JSON.stringify(outputSchema, null, 2)}
]
\`\`\`

${checkPrompt}

Beginne deine Antwort direkt mit \`\`\`json.`;
};
// --- END OF FILE 115 Zeilen ---