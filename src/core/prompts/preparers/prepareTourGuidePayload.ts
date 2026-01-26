// 26.01.2026 18:00 - FEAT: New Preparer for TourGuide.
// Separates data extraction from prompt generation.
// Adds GEO-COORDINATES to payload for precise clustering.
// src/core/prompts/preparers/prepareTourGuidePayload.ts

import type { TripProject, Place } from '../../types';

export const prepareTourGuidePayload = (project: TripProject) => {
    // 1. DATA GATHERING
    // Flatten the places object to get a simple list of all sights
    const allSights = Object.values(project.data.places || {}).flat() as Place[];

    // 2. MAPPING FOR AI
    // We strictly select only relevant fields to save tokens, 
    // BUT we add 'location' (lat/lng) which was missing before.
    const sightsForPrompt = allSights.map((sight: Place) => ({
        id: sight.id,
        name: sight.name,
        address: sight.address || sight.vicinity || "Unknown",
        category: sight.category,
        // CRITICAL FOR CLUSTERING: Pass Geo-Coords
        location: sight.location ? { lat: sight.location.lat, lng: sight.location.lng } : "Unknown",
        // Fallback for optional properties
        min_duration_minutes: (sight as any).min_duration_minutes || 60 
    }));

    return {
        context: {
            sights: sightsForPrompt
        },
        instructions: {
            role: "You are an experienced Travel Guide Author and Geographic Analyst."
        }
    };
};
// --- END OF FILE 37 Zeilen ---