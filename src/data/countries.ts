// 02.02.2026 21:00 - FIX: Strict Matrix Strategy.
// Removed regional fallbacks to prevent "Michelin Hallucinations" in non-covered countries.
// Added specific local sources for Sri Lanka (Yamu, Pulse).
// src/data/countries.ts

export const metadata = {
    lastUpdated: "2026-02-02T20:00:00.000Z"
};

export const globalGuideMatrix: Record<string, string[]> = {
    // --- DACH & ZENTRALEUROPA ---
    "Deutschland": ["Michelin", "Gault&Millau", "Feinschmecker", "Varta", "Slow Food", "Gusto"],
    "Österreich": ["Falstaff (Gabeln)", "Gault&Millau", "A la Carte", "Slow Food"],
    "Schweiz": ["Gault&Millau", "Michelin", "Guide Bleu", "Falstaff"],
    "Polen": ["Gault&Millau", "Michelin", "Poland 100 Best"],
    "Tschechien": ["Gastromapa Lukáše Hejlíka", "Maurer's Grand Restaurant Selection", "Gault&Millau", "Michelin"],
    "Ungarn": ["Michelin", "Dining Guide"],

    // --- SÜDEUROPA ---
    "Italien": ["Gambero Rosso", "Slow Food (Osterie d'Italia)", "Michelin", "L'Espresso"],
    "Frankreich": ["Michelin", "Gault&Millau", "Le Fooding", "La Liste"],
    "Spanien": ["Repsol (Soles)", "Michelin", "Macarfi"],
    "Portugal": ["Boa Cama Boa Mesa", "Michelin"],
    "Griechenland": ["Michelin", "FNL Guide", "Greek Cuisine Awards"],
    "Kroatien": ["Michelin", "Gault&Millau", "Dobri restorani"],

    // --- ASIEN (SPECIFIC) ---
    "Japan": ["Michelin", "Tabelog (Bronze/Silver/Gold)", "Asia's 50 Best"],
    "Thailand": ["Michelin", "Wongnai Users' Choice", "BK Magazine Top Tables", "Asia's 50 Best"],
    "Singapur": ["Michelin", "Burpple", "Asia's 50 Best"],
    "Vietnam": ["Michelin", "VietnamMM", "Asia's 50 Best"],
    
    // --- SRI LANKA (NEU - MIT DEINEN QUELLEN) ---
    "Sri Lanka": [
        "Yamu.lk (Lokal-Bibel)", 
        "Pulse.lk", 
        "TripAdvisor (Filter: Locals/Asiaten)", 
        "Asia's 50 Best"
    ],
    // Indien vorerst entfernt/generisch, da keine spezifischen Daten vorliegen

    // --- NORDAMERIKA ---
    "USA": ["Michelin", "James Beard Foundation", "Zagat", "The Infatuation", "Eater (Essential/Heatmap)"],
    "Kanada": ["Michelin", "Canada's 100 Best", "En Route"],

    // --- OZEANIEN ---
    "Australien": ["Good Food Guide (Chef's Hats)", "Gourmet Traveller", "Australian Good Food & Travel Guide"],
    "Neuseeland": ["Cuisine Good Food Awards", "Metro Top 50"],

    // --- AFRIKA ---
    "Südafrika": ["Eat Out Awards", "Rossouw’s Restaurants", "JHP Gourmet Guide"],
    
    // --- NO FALLBACKS! ---
    // Wir entfernen hier bewusst "Asien", "Europa" etc., damit Länder ohne Config nicht falsch zugeordnet werden.
    "Welt": ["TripAdvisor (Travelers' Choice)", "Local Recommendations (Verify Source)"] 
};

export function getGuidesForCountry(countryName: string | undefined): string[] {
    if (!countryName) return globalGuideMatrix["Welt"];
    
    // 1. Direkter Treffer
    if (globalGuideMatrix[countryName]) return globalGuideMatrix[countryName];
    
    const normalized = countryName.toLowerCase();
    
    // 2. Fuzzy Suche (Keys)
    const foundKey = Object.keys(globalGuideMatrix).find(k => 
        k.toLowerCase() === normalized || 
        normalized.includes(k.toLowerCase()) || 
        k.toLowerCase().includes(normalized)
    );
    
    if (foundKey) return globalGuideMatrix[foundKey];

    // 3. KEINE REGIONALEN FALLBACKS MEHR
    // Wenn das Land nicht explizit definiert ist, geben wir eine Warnung/leere Liste zurück,
    // damit der Prompt nicht "Michelin" für Sri Lanka erfindet.
    
    // Wir geben "Welt" zurück, aber das enthält KEIN Michelin mehr (siehe oben).
    // Alternativ könnten wir ["ERROR: Country unknown"] zurückgeben, um den User zu warnen.
    return globalGuideMatrix["Welt"];
}
// --- END OF FILE 75 Zeilen ---