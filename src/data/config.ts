// src/data/config.ts
// 07.01.2026 19:10
// UPDATE: V30 Original-Modelle (Gemini 2.5) & Robustness Settings

export type ModelType = 'pro' | 'flash';

export type TaskKey = 
  | 'chefPlaner' 
  | 'routenArchitekt' 
  | 'sightCollector' 
  | 'intelligentEnricher' 
  | 'initialTagesplaner' 
  | 'modificationTagesplaner' 
  | 'transferPlanner' 
  | 'timeOptimizer' 
  | 'sightsChefredakteur' 
  | 'infoAutor' 
  | 'foodCollector' 
  | 'foodEnricher' 
  | 'foodScout' 
  | 'geoAnalyst' 
  | 'hotelScout' 
  | 'transferUpdater' 
  | 'reisefuehrer' 
  | 'ideenScout' 
  | 'countryScout'
  | 'sondertage'
  | 'durationEstimator';

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
      reisefuehrer: 'pro',
      initialTagesplaner: 'pro',
      modificationTagesplaner: 'pro',
      sondertage: 'pro',
      geoAnalyst: 'pro',
      sightsChefredakteur: 'pro',
      infoAutor: 'pro',
      
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
      durationEstimator: 'flash'
    } as Record<TaskKey, ModelType>,

    labels: {
      chefPlaner: "tasks.chefPlaner",
      routenArchitekt: "tasks.routenArchitekt",
      sightCollector: "tasks.sightCollector",
      intelligentEnricher: "tasks.intelligentEnricher",
      reisefuehrer: "tasks.reisefuehrer",
      initialTagesplaner: "tasks.initialTagesplaner",
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
      durationEstimator: "tasks.durationEstimator"
    } as Record<TaskKey, string>
  }
};