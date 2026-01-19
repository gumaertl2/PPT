// 20.01.2026 17:50 - REFACTOR: "Operation Clean Sweep" - Updated SYSTEM_GUARD to enforce English Keys.
// src/core/prompts/PromptBuilder.ts
// 19.01.2026 10:00 - SEC: Added SYSTEM_GUARD to prevent JSON Key Translation (Strict Protocol).
// 17.01.2026 23:00 - ARCH: Enhanced Builder with centralized OS and Self-Check patterns for SOTA prompting.

export class PromptBuilder {
  private parts: string[] = [];
  
  // Zentrales "Betriebssystem" für alle Agents
  private static readonly SYSTEM_OS = `
# DEIN BETRIEBSSYSTEM
- **Rolle:** Du bist ein hochpräziser Reiseplanungs-Assistent.
- **Prinzip 1 (CoT):** Nutze das Feld "_thought_process" für komplexe Logik, BEVOR du finale Daten erzeugst.
- **Prinzip 2 (Fakten):** Erfinde niemals Daten. Unbekanntes ist "null".
- **Format:** Valides JSON.
`.trim();

  // NEU: Der Schutzschild gegen Key-Übersetzungen (V40 Standard: English Keys)
  private static readonly SYSTEM_GUARD = `
---
### SYSTEM SECURITY PROTOCOL (CRITICAL)
1. **JSON INTEGRITY:** Your output must be valid JSON.
2. **LANGUAGE:** The *content* (values) should be in the requested target language (usually German).
3. **STRUCTURE PROTECTION:** You must NEVER translate **JSON KEYS**.
   - If the schema defines '{ "routes": ... }', you MUST NOT answer with '{ "routen": ... }'.
   - Strictly adhere to the keys from the output schema.
Context: The frontend crashes if a key is translated.
---
`.trim();

  constructor() {
    // Startet immer leer, Methoden fügen Teile hinzu
  }

  /**
   * Fügt das Standard-Betriebssystem hinzu.
   * Sollte fast immer als erstes aufgerufen werden.
   */
  public withOS(): this {
    this.parts.push(PromptBuilder.SYSTEM_OS);
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

  /**
   * Fügt standardisierte Self-Checks hinzu (SOTA Prompting).
   */
  public withSelfCheck(types: ('basic' | 'research' | 'planning')[] = ['basic']): this {
    const checks = {
      basic: "□ JSON-Validität & Schema-Einhaltung geprüft?",
      research: "□ Fakten verifiziert & Halluzinationen vermieden?",
      planning: "□ Logische Konsistenz & Zeitplanung validiert?"
    };

    const selectedChecks = types.map(t => checks[t]).join('\n');
    this.parts.push(`# SELF-CHECK (Vor Ausgabe prüfen)\n${selectedChecks}`);
    return this;
  }

  public build(): string {
    // NEU: System Guard wird ZWINGEND angehängt
    this.parts.push(PromptBuilder.SYSTEM_GUARD);

    // Abschluss: Trigger für JSON Mode
    this.parts.push("Beginne deine Antwort direkt mit ```json");
    return this.parts.join('\n\n');
  }
}
// --- END OF FILE 89 Zeilen --- 