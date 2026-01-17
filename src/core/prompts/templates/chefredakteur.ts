// src/core/prompts/templates/chefredakteur.ts
// 17.01.2026 19:10 - FEAT: Ported 'Chefredakteur' (Content Editor) from V30.
// 17.01.2026 23:20 - REFACTOR: Migrated to PromptBuilder pattern (Unified Builder).
// 17.01.2026 17:50 - FIX: Added .flat() to handle Place[] arrays correctly (TS2339).

import type { TripProject, Place } from '../../types';
import { PromptBuilder } from '../PromptBuilder';

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

    // Helper: Finde Sight-Daten in Masterliste
    const findSightData = (anhangId: string) => {
        // FIX: .flat() nutzen, da places ein Record<Category, Place[]> ist.
        const masterliste = Object.values(data.places || {}).flat() as Place[];
        
        if (masterliste.length === 0) return null;

        const cleanId = anhangId.replace('anhang_sight_', '').replace('anhang_', '');
        return masterliste.find(s => s.id === cleanId || s.id === anhangId);
    };

    // Aufgabenliste generieren
    const aufgabenListe = tasksChunk.map(p => {
        let anweisung = p.anweisung || `Keine spezifische Anweisung für Typ '${p.typ}' gefunden. Erstelle eine allgemeine, nützliche Beschreibung für '${p.titel}'.`;

        // Kontext-Injektion
        const sightData = findSightData(p.id);
        let contextString = "";
        
        if (sightData) {
            // Sicherer Zugriff auf Properties (Fallback falls optional)
            const stadt = (sightData as any).stadt || (sightData.vicinity) || "Unbekannt";
            const land = (sightData as any).land || "Unbekannt";
            const adresse = sightData.address || (sightData as any).adresse || "Keine Adresse";
            contextString = `\n  **KONTEXT (WICHTIG):** Ort: ${stadt}, Land: ${land}, Adresse: ${adresse}. Nutze diese Info, um Verwechslungen mit gleichnamigen Orten zu vermeiden.`;
        }

        // Spezial-Logik für Stadtbezirke
        if (p.typ === 'Stadtbezirke') {
            anweisung += `\n\n**ZUSATZAUFGABE FÜR KARTEN-LINK:** Erstelle ZUSÄTZLICH zum \`inhalt\`-Text ein Array namens \`wegpunkte\`. Dieses Array muss für jede der im Text genannten Stationen des Spaziergangs ein Objekt enthalten. Jedes Objekt muss die Schlüssel \`name\` und \`adresse\` haben.\n**WICHTIGE REGEL:** Der Wert für \`name\` im \`wegpunkte\`-Objekt muss **EXAKT** mit der im Text verwendeten, fett markierten Überschrift oder dem Namen der Station übereinstimmen. Gib für \`adresse\` eine für Google Maps auffindbare, genaue Adresse an.`;
        }

        return `- **ID "${p.id}" (Titel: ${p.titel}, Typ: ${p.typ}):**${contextString}\n  ${anweisung}`;
    }).join('\n\n');

    const outputSchema = [
        { 
            id: "String", 
            typ: "String (MUSS exakt mit dem Typ aus der Aufgabenliste übereinstimmen)",
            inhalt: "String (Markdown-formatiert, alle Zeilenumbrüche als \\n maskiert)",
            wegpunkte: [
                { name: "String", adresse: "String" }
            ]
        }
    ];

    const role = `Du bist ein erfahrener Chefredakteur für Premium-Reiseführer. Deine Aufgabe ist es, für eine gegebene Liste von Sehenswürdigkeiten (Museen, Architektur, Stadtbezirke etc.) ansprechende, informative und gut strukturierte Detailtexte im Markdown-Format zu schreiben.`;

    const instructions = `# REDAKTIONELLER STIL (VERBINDLICH)
- **Stilvorgabe:** Dein Schreibstil muss sachlich, detailliert und informativ sein.
- **Inhaltliche Tiefe:** Reichere deine Texte aktiv mit interessanten Hintergrundgeschichten, historischen Fakten und unterhaltsamen Anekdoten an.
- **Verbotene Elemente:** Ignoriere bei der Texterstellung explizit die allgemeine "Emotionale Stimmung" der Reise. Der Tonfall soll enzyklopädisch sein.

# QUALITÄTS-ANFORDERUNGEN (ANTI-LOOP & TIEFE)
1.  **Narrative Tiefe statt Listen:** Reine Aufzählungen sind verboten. Schreibe fließende, zusammenhängende Absätze.
2.  **Detail-Liebe:** Beschreibe nicht nur, DASS es etwas zu sehen gibt, sondern WIE es aussieht, riecht oder klingt.
3.  **Umfang & Abbruch:** Schreibe ausführlich (Richtwert: 250-400 Wörter pro Sight), aber höre sofort auf, wenn die relevanten Informationen erschöpft sind.

# ZU BEARBEITENDE AUFGABEN${chunkingInfo}
Hier ist die Liste der IDs und die dazugehörigen Arbeitsanweisungen (TIA), die du exakt umsetzen musst. Führe für jede ID eine Live-Internet-Recherche durch.

---
${aufgabenListe}
---

# ZUSATZREGELN
- **Für Typ "Stadtbezirke":** Das Objekt MUSS ZUSÄTZLICH das Feld \`wegpunkte\` enthalten. Bei allen anderen Typen lässt du dieses Feld weg.
- Der Wert des \`id\`-Feldes MUSS exakt mit der Original-ID aus der Aufgabenliste übereinstimmen.
- Formatiere ALLE URLs im Text zwingend als klickbare Links mit einem beschreibenden Text.
- **WICHTIGSTE REGEL ZUM FORMAT:** Der gesamte Wert des "inhalt"-Feldes muss eine **einzigartige Zeichenkette** sein. Alle Zeilenumbrüche innerhalb deines Textes **MÜSSEN** als \`\\n\` maskiert werden.`;

    return new PromptBuilder()
        .withOS()
        .withRole(role)
        .withInstruction(instructions)
        .withOutputSchema(outputSchema)
        .withSelfCheck(['basic', 'research'])
        .build();
};
// --- END OF FILE 105 Zeilen ---