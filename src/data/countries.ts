// src/data/countries.ts
// 16.01.2026 18:30 - FEAT: Ported V30 Global Guide Matrix.

export const metadata = {
    lastUpdated: "2025-12-08T15:00:00.000Z"
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
    "Griechenland": ["Michelin", "Golden Chef's Hat (Toques d'Or)", "FNL Guide"],
    "Türkei": ["Michelin", "Gault&Millau", "Incili Gastronomy Guide"],
    "Kroatien": ["Gault&Millau", "Michelin", "Dobri restorani", "Falstaff"],

    // --- NORDEUROPA & BENELUX ---
    "Niederlande": ["Michelin", "Gault&Millau", "Lekker500"],
    "Belgien": ["Michelin", "Gault&Millau", "FoodTrotter"],
    "Dänemark": ["Michelin", "White Guide", "Den danske Spiseguide"],
    "Schweden": ["Michelin", "White Guide", "Sveriges Bästa Bord"],
    "Norwegen": ["Michelin", "White Guide"],
    "Finnland": ["Michelin", "White Guide", "Viisi Tähteä"],

    // --- UK & INSELN ---
    "Großbritannien": ["Michelin", "AA Rosettes", "Good Food Guide", "Hardens"],
    "Irland": ["Michelin", "AA Rosettes", "Good Food Guide", "Georgina Campbell"],
    "Schottland": ["The Good Food Guide", "AA Rosettes (ab 2 Rosetten)", "Harden's", "The List", "Taste Our Best"],

    // --- ASIEN (NEU) ---
    "Japan": ["Michelin", "Tabelog (Bronze/Silver/Gold Award)", "The Japan Times"],
    "China": ["Michelin", "Black Pearl Guide (Dianping)", "Tatler Dining"],
    "Thailand": ["Michelin", "BK Magazine (Top Tables)", "Wongnai"],
    "Vietnam": ["Michelin", "VietnamMM", "Foody.vn"],
    "Südkorea": ["Michelin", "Blue Ribbon Survey", "KOREAT"],
    "Singapur": ["Michelin", "Makansutra", "Tatler Dining"],
    "Indien": ["Zomato (Gold/Legends)", "Times Food & Nightlife Awards", "EazyDiner", "Condé Nast Top Restaurant Awards"],
    "Indonesien": ["Indonesia Tatler", "Qraved", "TripAdvisor (Local Legends)"],
    "Sri Lanka": ["Yamu.lk (Lokal-Bibel)", "Pulse.lk", "TripAdvisor (Filter: Locals/Asiaten)", "Asia's 50 Best"],

    // --- SÜDAMERIKA (NEU) ---
    "Brasilien": ["Michelin (Rio/SP)", "Veja Comer & Beber", "Prazeres da Mesa"],
    "Argentinien": ["Michelin (Buenos Aires/Mendoza)", "Guía Óleo", "Cuisine & Vins"],
    "Peru": ["SUMMUM", "Luces (El Comercio)", "Michelin (in Planung)", "Latin America's 50 Best"],
    "Chile": ["Wikén (El Mercurio)", "800.cl", "Guía 100"],
    "Kolumbien": ["Premios La Barra", "Bogotá Wine & Food Festival", "Latin America's 50 Best"],
    "Mexiko": ["Michelin", "Guía México Gastronómico (Culinaria Mexicana)", "Marco Beteta"],

    // --- ÜBERSEE & WELT ---
    "USA": ["Michelin", "James Beard Foundation", "Zagat", "The Infatuation", "Eater (Essential/Heatmap)"],
    "Kanada": ["Michelin", "Canada's 100 Best", "En Route"],
    "Australien": ["Good Food Guide (Chef's Hats)", "Gourmet Traveller", "Australian Good Food & Travel Guide"],
    "Südafrika": ["Eat Out Awards", "Rossouw’s Restaurants", "JHP Gourmet Guide"],
    
    // --- REGIONALE FALLBACKS ---
    "Asien": ["Michelin", "Asia's 50 Best", "Lokale Food-Blogs"],
    "Südamerika": ["Latin America's 50 Best", "Michelin (wo verfügbar)"],
    "Europa": ["Michelin", "OAD (Opinionated About Dining)", "50 Best Discovery"],
    "Welt": ["Michelin", "World's 50 Best Restaurants", "La Liste", "TripAdvisor (Travelers' Choice)"]
};

export function getGuidesForCountry(countryName: string | undefined): string[] {
    if (!countryName) return globalGuideMatrix["Welt"];
    
    // Direkter Treffer
    if (globalGuideMatrix[countryName]) return globalGuideMatrix[countryName];
    
    const normalized = countryName.toLowerCase();
    
    // Suche nach Teilübereinstimmungen (z.B. "Republik Korea" -> "Südkorea")
    const foundKey = Object.keys(globalGuideMatrix).find(k => 
        k.toLowerCase() === normalized || 
        normalized.includes(k.toLowerCase()) || 
        k.toLowerCase().includes(normalized)
    );
    
    if (foundKey) return globalGuideMatrix[foundKey];
    
    return globalGuideMatrix["Welt"];
}
// --- END OF FILE 98 Zeilen ---