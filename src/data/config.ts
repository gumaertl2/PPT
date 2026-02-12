// 12.02.2026 17:30 - CONFIG: TECHNICAL SEPARATION. Defined distinct ID for 'thinking' alias.
// 12.02.2026 17:00 - CONFIG: Added 'thinking' ModelType. Set FoodScout to pure 'flash'.
// 03.02.2026 15:40 - CONFIG: Upgraded FoodScout to PRO for stricter source compliance.
// 31.01.2026 19:45 - CONFIG: FULL FILE. REMOVED DurationEstimator. Strict Naming.
// src/data/config.ts

import type { TaskKey } from '../core/types';

export type ModelType = 'pro' | 'flash' | 'thinking';

export const CONFIG = {
  api: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/',
    
    models: {
      pro: 'gemini-2.5-pro:generateContent',
      flash: 'gemini-2.5-flash:generateContent',
      // INTERNAL ALIAS: Maps to Flash but triggers "Dynamic Thinking" in gemini.ts
      thinking: 'gemini-2.5-flash-thinking' 
    },
    
    defaultTimeout: 240000, 
    maxRetries: 3,
    
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" }
    ]
  },
  
  rateLimit: {
    maxCallsPerHour: {
      pro: 50,    
      flash: 1500,
      thinking: 1500
    },
    storageKey: 'papatours-api-history'
  },
  
  storage: {
    apiKeyStorageKey: 'papatours_api_key',
    defaultKeyExpirationDays: 30
  },

  taskRouting: {
    defaults: {
      // PRO TASKS
      chefPlaner: 'pro',
      routeArchitect: 'pro',
      tourGuide: 'pro',          // Renamed from guide/reisefuehrer
      initialTagesplaner: 'pro', // Renamed from dayplan
      ideenScout: 'pro',         // Renamed from sondertage
      geoAnalyst: 'pro',
      infoAutor: 'pro',          // Renamed from infos
      chefredakteur: 'pro',      // Renamed from details
      foodScout: 'flash',        // EXPLICIT: Pure Flash (No Thinking)
      
      // THINKING TASKS (Formerly Flash Defaults)
      foodEnricher: 'thinking',
      hotelScout: 'thinking',       // Renamed from accommodation
      transferPlanner: 'thinking',  // Renamed from transfers
      countryScout: 'thinking',
      
      // Wizard Defaults
      basis: 'thinking',      
      anreicherer: 'thinking' 
    } as Partial<Record<TaskKey, ModelType>>,

    chunkDefaults: {
        // High Volume
        chefPlaner: { auto: 60, manual: 60 },      
        basis: { auto: 60, manual: 60 },           
        
        foodScout: { auto: 20, manual: 40 }, 
        
        // Enrichment
        anreicherer: { auto: 15, manual: 25 },         
        foodEnricher: { auto: 10, manual: 20 },        
        hotelScout: { auto: 20, manual: 40 },          

        // Text Generation
        chefredakteur: { auto: 5, manual: 10 },              
        infoAutor: { auto: 5, manual: 10 },            
        tourGuide: { auto: 1, manual: 1 },                 

        // Planning
        initialTagesplaner: { auto: 14, manual: 14 }, 
        transferPlanner: { auto: 14, manual: 14 }
    } as Partial<Record<TaskKey, { auto: number; manual: number }>>,

    labels: {
      chefPlaner: "tasks.chefPlaner",
      routeArchitect: "tasks.routeArchitect",
      
      tourGuide: "tasks.reisefuehrer", 
      initialTagesplaner: "tasks.initialTagesplaner",
      
      infoAutor: "tasks.infoAutor",
      chefredakteur: "tasks.infoAutor", // Mapping key
      
      foodEnricher: "tasks.foodEnricher",
      geoAnalyst: "tasks.geoAnalyst",
      
      hotelScout: "tasks.hotelScout",
      transferPlanner: "tasks.transferPlanner",
      foodScout: "tasks.foodScout",
      
      ideenScout: "tasks.sondertage", 
      countryScout: "tasks.countryScout",

      // Workflow Mapping Keys
      basis: "tasks.sightCollector", 
      anreicherer: "tasks.intelligentEnricher"
    } as Partial<Record<TaskKey, string>>
  }
};
// --- END OF FILE 131 Zeilen ---