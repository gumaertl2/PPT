// 27.01.2026 17:00 - CONFIG: Increased Batch Limits for Collector to 60.
// Prevents unnecessary chunking for "Sight Collector" (Basis).
// src/data/config.ts

import type { TaskKey } from '../core/types';

export type ModelType = 'pro' | 'flash';

export const CONFIG = {
  api: {
    // Basis-URL für Google Gemini API
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
    
    models: {
      // WICHTIG: Original V30 Modelle (Gemini 2.5)
      // Das intelligente Arbeitstier für komplexe Analysen
      pro: 'gemini-2.5-pro:generateContent',
      // Der Sprinter für schnelle Listen und Texte
      flash: 'gemini-2.5-flash:generateContent'
    },
    
    // V30 ROBUSTNESS: 4 Minuten Timeout für komplexe Analysen
    defaultTimeout: 240000, 
    // V30 ROBUSTNESS: 3 Retries für temporäre Netzwerkaussetzer
    maxRetries: 3,
    
    // Tolerante Sicherheitsfilter
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
    ]
  },
  
  rateLimit: {
    maxCallsPerHour: {
      pro: 50,    // Konservativ für Pro
      flash: 1500 // Hoch für Flash
    },
    storageKey: 'papatours-api-history'
  },
  
  storage: {
    apiKeyStorageKey: 'papatours_api_key',
    defaultKeyExpirationDays: 30
  },

  // Routing-Strategie (V30 Logik)
  taskRouting: {
    defaults: {
      // Komplexe Tasks -> PRO
      chefPlaner: 'pro',
      routenArchitekt: 'pro',
      routeArchitect: 'pro', // Alias für Workflow
      reisefuehrer: 'pro',
      guide: 'pro',          // Alias für Workflow
      initialTagesplaner: 'pro',
      dayplan: 'pro',        // Alias für Workflow
      modificationTagesplaner: 'pro',
      sondertage: 'pro',
      geoAnalyst: 'pro',
      infoAutor: 'pro',
      details: 'pro',
      infos: 'pro',
      
      // Geschwindigkeit/Masse -> FLASH
      sightCollector: 'flash',
      intelligentEnricher: 'flash',
      foodCollector: 'flash',
      foodEnricher: 'flash',
      hotelScout: 'flash',
      transferPlanner: 'flash',
      countryScout: 'flash',
      foodScout: 'flash',
      transferUpdater: 'flash',
      ideenScout: 'flash',
      durationEstimator: 'flash',
      food: 'flash',
      accommodation: 'flash',
      transfers: 'flash',

      // FIX: Defaults for Wizard keys
      basis: 'flash',      
      anreicherer: 'flash' 
    } as Partial<Record<TaskKey, ModelType>>, // Changed to Partial for flexibility

    // NEU: Standard-Batch-Größen pro Agent (V30 Logic Transfer)
    chunkDefaults: {
        // --- High Volume Data Agents ---
        chefPlaner: { auto: 60, manual: 60 },      // Reine Datenanalyse, wenig Output-Token
        
        // FIX: Increased to 60 to prevent unnecessary splitting (User Request)
        sightCollector: { auto: 60, manual: 60 },  // Sammler (Namen)
        basis: { auto: 60, manual: 60 },           // Alias
        
        foodCollector: { auto: 20, manual: 40 },   // Restaurants (einfach)
        food: { auto: 20, manual: 40 },            // Alias
        
        // --- Enrichment / Recherche Agents ---
        intelligentEnricher: { auto: 15, manual: 25 }, // V30 war hier aggressiv (15)
        anreicherer: { auto: 15, manual: 25 },         // Alias
        foodEnricher: { auto: 10, manual: 20 },        // Detailsuche
        hotelScout: { auto: 20, manual: 40 },          // Hotels
        accommodation: { auto: 20, manual: 40 },       // Alias

        // --- Text Generation Agents (Token Heavy) ---
        details: { auto: 5, manual: 10 },              // Alias
        infoAutor: { auto: 5, manual: 10 },            // Fakten & Texte
        infos: { auto: 5, manual: 10 },                // Alias
        reisefuehrer: { auto: 1, manual: 1 },          // Struktureller Agent (immer 1)
        guide: { auto: 1, manual: 1 },                 // Alias

        // --- Planning Agents (Time Based) ---
        initialTagesplaner: { auto: 14, manual: 14 }, // Plant bis zu 2 Wochen am Stück
        dayplan: { auto: 14, manual: 14 },            // Alias
        transferPlanner: { auto: 14, manual: 14 },    // Logistik für ganze Reise
        transfers: { auto: 14, manual: 14 }           // Alias
    } as Partial<Record<TaskKey, { auto: number; manual: number }>>,

    labels: {
      chefPlaner: "tasks.chefPlaner",
      routenArchitekt: "tasks.routenArchitekt",
      routeArchitect: "tasks.routenArchitekt",
      sightCollector: "tasks.sightCollector",
      intelligentEnricher: "tasks.intelligentEnricher",
      reisefuehrer: "tasks.reisefuehrer",
      guide: "tasks.reisefuehrer",
      initialTagesplaner: "tasks.initialTagesplaner",
      dayplan: "tasks.initialTagesplaner",
      modificationTagesplaner: "tasks.modificationTagesplaner",
      infoAutor: "tasks.infoAutor",
      foodCollector: "tasks.foodCollector",
      foodEnricher: "tasks.foodEnricher",
      geoAnalyst: "tasks.geoAnalyst",
      hotelScout: "tasks.hotelScout",
      transferPlanner: "tasks.transferPlanner",
      sondertage: "tasks.sondertage",
      foodScout: "tasks.foodScout",
      transferUpdater: "tasks.transferUpdater",
      ideenScout: "tasks.ideenScout",
      countryScout: "tasks.countryScout",
      durationEstimator: "tasks.durationEstimator",

      // Mapping Workflow-Names to technical labels
      basis: "tasks.sightCollector", 
      anreicherer: "tasks.intelligentEnricher",
      food: "tasks.foodCollector",
      accommodation: "tasks.hotelScout",
      transfers: "tasks.transferPlanner",
      details: "tasks.infoAutor",
      infos: "tasks.infoAutor"
    } as Partial<Record<TaskKey, string>>
  }
};
// --- END OF FILE 160 Zeilen ---