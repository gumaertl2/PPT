// 08.04.2026 15:30 - FIX: Full file rewritten to fix esbuild syntax error (copy-paste glitch).
// 08.04.2026 15:00 - FIX: Injected dynamic LANGUAGE LOCKDOWN directly from useTripStore.
// 22.01.2026 22:15 - FIX: Made JSON Start Character dynamic (Support for Arrays '[' vs Objects '{').
// src/core/prompts/PromptBuilder.ts

import { useTripStore } from '../../store/useTripStore';

export class PromptBuilder {
  private parts: string[] = [];
  
  private static readonly SYSTEM_OS = `
# DEIN BETRIEBSSYSTEM
- **Rolle:** Du bist ein hochpräziser Reiseplanungs-Assistent. Deine einzige Aufgabe ist die Erstellung von validem JSON.
- **Prinzip 1 (CoT):** Denken ist PFLICHT, aber es muss **INNERHALB** des JSON-Objekts im Feld "_thought_process" stattfinden.
- **Prinzip 2 (Strict Output):** KEIN TEXT vor dem JSON. KEIN Markdown-Block (\`\`\`json). Beginne direkt mit dem JSON-Startzeichen.
- **Prinzip 3 (Batch Integrity):** Wenn du eine Liste von Elementen oder IDs erhältst, MUSST du für JEDES einzelne Element ein Ergebnis liefern. Das Weglassen von Daten ist ein kritischer Systemfehler.
- **Prinzip 4 (Fakten):** Erfinde niemals Daten. Unbekanntes ist "null" oder ein fundierter Schätzwert (markiert mit "ca.").
`.trim();

  private static readonly PRIORITY_PYRAMID = `
# OBERSTE ENTSCHEIDUNGSLOGIK (PRIORITÄTEN-PYRAMIDE)
Nutze diese Hierarchie bei jedem Konflikt zwischen Anweisungen:
1. **STRATEGIE (Reise-Charakter):** Oberste Direktive. Sie gewinnt immer gegen Einzelinteressen oder Stimmungen.
2. **RAHMENBEDINGUNGEN (Preis, Tempo, Logistik):** Harte Constraints (technische Limits).
3. **STIMMUNG:** Modulierender Filter für die Auswahl (Soft-Filter).
4. **INTERESSEN:** Bausteine, die gemäß 1-3 gefüllt werden.
`.trim();

  constructor() {}

  public withOS(): this {
    this.parts.push(PromptBuilder.SYSTEM_OS);
    this.parts.push(PromptBuilder.PRIORITY_PYRAMID);
    return this;
  }

  public withRole(roleDescription: string): this {
    this.parts.push(`# ROLLE & AUFGABE\n${roleDescription}`);
    return this;
  }

  public withContext(contextData: any, title: string = "KONTEXT DATEN"): this {
    if (!contextData) return this;
    const json = JSON.stringify(contextData, null, 2);
    this.parts.push(`# ${title}\n\`\`\`json\n${json}\n\`\`\``);
    return this;
  }

  public withInstruction(instruction: string): this {
    this.parts.push(`# ARBEITSANWEISUNG\n${instruction}`);
    return this;
  }

  public withOutputSchema(schema: any): this {
    const json = JSON.stringify(schema, null, 2);
    this.parts.push(`# VERBINDLICHES ZIELFORMAT\nAntworte strikt mit diesem JSON-Schema:\n\`\`\`json\n${json}\n\`\`\``);
    return this;
  }

  public withSelfCheck(types: ('basic' | 'research' | 'planning')[] = ['basic']): this {
    const checks = {
      basic: `□ JSON-Validität: Syntaktisch korrekt?\n□ Vollständigkeit: Alle IDs aus dem Input im Output enthalten?\n□ Schema: Alle Keys exakt wie im Zielformat (unübersetzt)?`,
      research: `□ Fakten: Nur verifizierbare Infos genutzt?\n□ Halluzinationen: Keine Daten erfunden?`,
      planning: `□ Logik: Zeit- und Transferplanung konsistent?\n□ Regeln: Alle Strategie-Vorgaben (z.B. 70/70 Mix) eingehalten?`
    };

    const selectedChecks = types.map(t => checks[t]).join('\n');
    this.parts.push(`# FINALE SELF-CHECK-LISTE (OBLIGATORISCH)\n${selectedChecks}`);
    return this;
  }

  public build(isListMode: boolean = false): string {
    
    // --- NEW: DYNAMIC LANGUAGE LOCKDOWN ---
    let targetLangName = "English"; // Fallback
    try {
        const state = useTripStore.getState();
        const langCode = state.project?.meta?.language || 'en';
        
        const langMap: Record<string, string> = {
            'de': 'German', 'en': 'English', 'es': 'Spanish', 'fr': 'French', 
            'it': 'Italian', 'pt': 'Portuguese', 'nl': 'Dutch', 'pl': 'Polish',
            'cs': 'Czech', 'sv': 'Swedish', 'da': 'Danish', 'fi': 'Finnish',
            'el': 'Greek', 'ru': 'Russian', 'uk': 'Ukrainian', 'tr': 'Turkish',
            'ja': 'Japanese', 'ar': 'Arabic', 'zh': 'Chinese', 'hi': 'Hindi'
        };
        targetLangName = langMap[langCode] || langCode;
    } catch (e) {
        console.warn("PromptBuilder: Could not read language from store, defaulting to English.");
    }

    const dynamicSystemGuard = `
---
### SYSTEM SECURITY PROTOCOL (CRITICAL)
1. **JSON INTEGRITY:** Output must be valid JSON. NEVER translate keys.
2. **SILENCE PROTOCOL:** NO text before JSON. NO preamble like "Here is your JSON".
3. **LANGUAGE LOCKDOWN:** All generated content, descriptions, and values MUST be written exclusively in **${targetLangName.toUpperCase()}**! Ignore the language of the technical instructions.
4. **ID CONSISTENCY:** Retain all input IDs exactly. Do not hallucinate new ones.
Context: Frontend will crash on key-translation, missing IDs or uncompleted batches.
---
`.trim();

    this.parts.push(dynamicSystemGuard);

    const startChar = isListMode ? '[' : '{';
    this.parts.push(`IMPORTANT: Start your response directly with '${startChar}'. Do not use Markdown code blocks.`);
    return this.parts.join('\n\n');
  }
}
// --- END OF FILE 109 Zeilen ---