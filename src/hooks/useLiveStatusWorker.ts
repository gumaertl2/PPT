// 09.02.2026 18:10 - FEAT: Background Worker for Lazy Live Checks.
// src/hooks/useLiveStatusWorker.ts

import { useEffect, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { LiveScout } from '../services/LiveScout';

export const useLiveStatusWorker = (enabled: boolean = true) => {
  const { project, aiSettings } = useTripStore();
  const processingRef = useRef(false);
  
  // Throttle: Only one check every 8 seconds to be safe with quota
  const INTERVAL_MS = 8000;

  useEffect(() => {
    if (!enabled) return;

    const worker = setInterval(async () => {
      // 1. Check if already busy
      if (processingRef.current) return;

      // 2. Find a candidate
      // We look for places that have NO liveStatus yet.
      const places = project.data.places || {};
      const candidateId = Object.keys(places).find(id => {
          const p = places[id];
          // Skip if already checked
          if (p.liveStatus) return false;
          // Skip internal/dummy items
          if (p.category === 'internal') return false;
          return true;
      });

      if (!candidateId) return; // Nothing to do

      // 3. Process
      processingRef.current = true;
      if (aiSettings.debug) console.log(`[LiveWorker] 🕵️ Checking background candidate: ${places[candidateId].name}`);
      
      try {
          await LiveScout.verifyPlace(candidateId);
      } catch (e) {
          console.error("[LiveWorker] Error", e);
      } finally {
          processingRef.current = false;
      }

    }, INTERVAL_MS);

    return () => clearInterval(worker);
  }, [enabled, project.data.places, aiSettings.debug]);
};
// --- END OF FILE 48 Zeilen ---