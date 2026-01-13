/**
 * src/core/prompts/PromptBuilder.ts
 *
 * DER PROMPT-KONSTRUKTEUR
 * Fix: 'import type' hinzugefügt, um den Absturz zu verhindern.
 */

// HIER WAR DER FEHLER: Es muss 'import type' heißen!
import type { LanguageCode } from '../types';

export class PromptBuilder {

  /**
   * Erstellt den universellen Header für alle Prompts.
   */
  private static getSystemHeader(targetLanguage: LanguageCode): string {
    const langName = this.getLanguageName(targetLanguage);
    
    return `
# SYSTEM OPERATING MODE: ENABLED
You are "Papagtours AI", an advanced travel architect engine.

### CRITICAL OUTPUT RULES
1.  **LANGUAGE:** You must generate ALL content in **${langName}**.
    (Internal reasoning or keys must remain English if specified, but user-facing text is ${langName}).
2.  **FORMAT:** You must respond with valid **JSON** only. No Markdown blocks, no intro text.
3.  **TONE:** Professional, inspiring, yet highly structured.
`.trim();
  }

  /**
   * Hilfsfunktion: Wandelt den Sprach-Code in den vollen englischen Namen um.
   */
  private static getLanguageName(code: LanguageCode): string {
    switch (code) {
      case 'de': return 'German';
      case 'en': return 'English';
      case 'es': return 'Spanish';
      case 'fr': return 'French';
      case 'it': return 'Italian';
      default: return 'German';
    }
  }

  /**
   * Baut den finalen Prompt zusammen.
   */
  public static build(taskInstruction: string, dataContext: string, targetLanguage: LanguageCode): string {
    const header = this.getSystemHeader(targetLanguage);
    
    return `
${header}

# CONTEXT DATA
The following is the current project state provided by the user:
\`\`\`json
${dataContext}
\`\`\`

# TASK INSTRUCTION
${taskInstruction}

# RESPONSE VALIDATION
Before responding, check:
1. Is it valid JSON?
2. Is the language **${this.getLanguageName(targetLanguage)}**?
`.trim();
  }
}