// src/data/config.ts
// 14.01.2026 13:45 - FIX: Added missing TaskKeys 'basis' and 'anreicherer' to support CockpitWizard workflow.
// 16.01.2026 04:20 - FIX: Consistently using TaskKey from core/types. Expanded defaults to include workflow steps.
// UPDATE: V30 Original-Modelle (Gemini 2.5) & Robustness Settings

// FIX: Importing TaskKey as the source of truth
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
      sightsChefredakteur: 'pro',
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
      timeOptimizer: 'flash',
      durationEstimator: 'flash',
      food: 'flash',
      accommodation: 'flash',
      transfers: 'flash',

      // FIX: Defaults for Wizard keys
      basis: 'flash',      
      anreicherer: 'flash' 
    } as Partial<Record<TaskKey, ModelType>>, // Changed to Partial for flexibility

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
      sightsChefredakteur: "tasks.sightsChefredakteur",
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
      timeOptimizer: "tasks.timeOptimizer",
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
// --- END OF FILE 135 Zeilen ---