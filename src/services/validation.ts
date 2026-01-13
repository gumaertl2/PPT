/**
 * src/services/validation.ts
 * * VALIDIERUNG & SELBSTHEILUNG
 * Portierung von Papatours/validation.js nach TypeScript.
 * Enthält die robuste "Bracket-Counting" Logik zum Extrahieren von JSON aus KI-Antworten.
 */

export interface ValidationResult<T> {
  valid: boolean;
  error: string | null;
  warning?: string | null;
  data?: T;
}

/**
 * Extrahiert den ersten vollständigen JSON-Block (Objekt oder Array) aus einem String,
 * indem die Klammer-Ebenen gezählt werden. Ignoriert Text vor und nach dem JSON.
 */
function extractJsonBlock(str: string): string {
  const firstBrace = str.indexOf('{');
  const firstBracket = str.indexOf('[');
  let startIndex: number;
  let startChar: string;
  let endChar: string;

  if (firstBrace === -1 && firstBracket === -1) {
    throw new Error("Kein gültiges JSON-Objekt oder -Array gefunden.");
  }

  // Bestimme, ob es mit { oder [ beginnt
  if (firstBrace !== -1 && (firstBrace < firstBracket || firstBracket === -1)) {
    startIndex = firstBrace;
    startChar = '{';
    endChar = '}';
  } else {
    startIndex = firstBracket;
    startChar = '[';
    endChar = ']';
  }

  let balance = 0;
  let inString = false;
  let escape = false;
  let endIndex = -1;

  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];

    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\') {
      escape = true;
      continue;
    }
    if (char === '"') {
      inString = !inString;
    }

    if (!inString) {
      if (char === startChar) {
        balance++;
      } else if (char === endChar) {
        balance--;
      }
    }

    if (balance === 0) {
      endIndex = i;
      break;
    }
  }

  if (endIndex === -1) {
    throw new Error("Kein vollständiges JSON-Objekt oder -Array gefunden (Incomplete Block).");
  }

  return str.substring(startIndex, endIndex + 1);
}

function checkSyntax(jsonString: string): { valid: boolean; error: string | null } {
  try {
    JSON.parse(jsonString);
    return { valid: true, error: null };
  } catch (e) {
    return { valid: false, error: `Syntax-Fehler: ${(e as Error).message}` };
  }
}

function checkSchema(data: any, requiredFields: string[]): { valid: boolean; error: string | null } {
  for (const field of requiredFields) {
    const fieldParts = field.split('.');
    let current = data;
    let found = true;
    for (const part of fieldParts) {
      if (current === null || typeof current !== 'object' || current[part] === undefined) {
        found = false;
        break;
      }
      current = current[part];
    }
    if (!found) {
      return { valid: false, error: `Schema-Fehler: Pflichtfeld '${field}' fehlt.` };
    }
  }
  return { valid: true, error: null };
}

/**
 * Spezifische Plausibilitäts-Prüfung für Reisepläne (aus V30 übernommen).
 * Prüft auf unrealistische Dauern (> 12h).
 */
function checkPlausibility(data: any): { valid: boolean; warning: string | null } {
  // Check: Ist es überhaupt eine Struktur mit Tagen?
  if (data && data.tage && Array.isArray(data.tage)) {
    for (const tag of data.tage) {
      if (!tag || !tag.aktivitaeten) continue;
      for (const akt of tag.aktivitaeten || []) {
        if (akt && akt.dauerMinuten && (akt.dauerMinuten < 1 || akt.dauerMinuten > 720)) {
          return { 
            valid: true, 
            warning: `Plausibilitäts-Warnung: Dauer von ${akt.dauerMinuten}min für '${akt.titel}' ist unrealistisch.` 
          };
        }
      }
    }
  }
  return { valid: true, warning: null };
}

/**
 * Führt automatische Reparaturen durch (z.B. Objekt zu Array).
 */
function validateAndRepairData(data: any, onRepair?: (msg: string) => void): any {
  const repairs: string[] = [];

  // Reparatur 1: "tage" ist einzelnes Objekt statt Array
  if (data && data.tage && !Array.isArray(data.tage)) {
    data.tage = [data.tage];
    repairs.push("Tage-Struktur (Objekt zu Array)");
  }

  // Reparatur 2: Fehlendes Aktivitäten-Array
  if (data && data.tage && Array.isArray(data.tage)) {
    data.tage.forEach((tag: any, index: number) => {
      if (tag && !tag.aktivitaeten) {
        tag.aktivitaeten = [];
        repairs.push(`Fehlendes 'aktivitaeten'-Array für Tag ${index + 1}`);
      }
    });
  }
  
  if (repairs.length > 0 && onRepair) {
    onRepair(`JSON-Struktur automatisch repariert: ${repairs.join(', ')}`);
  }

  return data;
}

/**
 * Hauptfunktion zur Validierung.
 * @param jsonString Der rohe String von der KI.
 * @param requiredFields Liste der erforderlichen Felder (dot.notation).
 * @param onRepair Optionaler Callback für Reparatur-Meldungen (statt showToast).
 */
export function validateJson<T = any>(
  jsonString: string, 
  requiredFields: string[] = [], 
  onRepair?: (msg: string) => void
): ValidationResult<T> {
  
  if (!jsonString || jsonString.trim() === '') {
    return { valid: false, error: "Eingabe ist leer." };
  }
  
  let processedString: string;

  try {
    // Schritt 1: Entferne Markdown Code-Blöcke
    let cleaned = jsonString.replace(/```json/g, '').replace(/```/g, '');
    
    // Schritt 2: Extrahiere den reinen JSON-Block (Robust)
    processedString = extractJsonBlock(cleaned);

  } catch(e) {
    return { valid: false, error: (e as Error).message };
  }

  // Syntax Check
  const syntaxResult = checkSyntax(processedString);
  if (!syntaxResult.valid) {
    return { valid: false, error: syntaxResult.error };
  }

  let data = JSON.parse(processedString);
  
  // Schritt 3: Auto-Repair
  data = validateAndRepairData(data, onRepair);

  // Schema Check
  const schemaResult = checkSchema(data, requiredFields);
  if (!schemaResult.valid) {
    return { valid: false, error: schemaResult.error };
  }
  
  // Plausibilität
  const plausibilityResult = checkPlausibility(data);
  // Warnungen geben wir mit zurück, aber valid ist true
  
  return { 
    valid: true, 
    error: null, 
    warning: plausibilityResult.warning, 
    data: data as T 
  };
}