// 05.02.2026 14:15 - FIX: ROUNDTRIP SUPPORT.
// 07.02.2026 12:00 - FIX: SUPPORT 'mobil' MODE ALIAS.
// - Fixed GeoExpander failing for roundtrips because it missed the 'mobil' mode key.
// src/core/prompts/preparers/prepareGeoExpanderPayload.ts

import type { TripProject } from '../../types';

export const prepareGeoExpanderPayload = (
    projectOrPayload: any,
    feedbackInput?: string
) => {
    // 1. Resolve Project & Input
    let project: TripProject | null = null;
    let feedback = feedbackInput;

    if (projectOrPayload.userInputs) {
        project = projectOrPayload;
    } else if (projectOrPayload.project) {
        project = projectOrPayload.project;
        if (!feedback) feedback = projectOrPayload.instructions;
    }

    // 2. Determine Center (Priority Logic)
    let center = "Europe"; // Safe Global Default
    let radius = 20;

    if (project) {
        const log = project.userInputs?.logistics;
        const analysis = project.analysis;

        if (log) {
            // CASE A: STATIONARY
            if (log.mode === 'stationaer' && log.stationary?.destination) {
                center = log.stationary.destination;
            } 
            // CASE B: ROUNDTRIP (FIX: Support 'mobil' alias used in UI)
            else if (log.mode === 'roundtrip' || log.mode === 'mobil') {
                // Option 1: Use calculated route stages (Most Accurate)
                if (analysis?.routeArchitect?.routes?.[0]?.stages) {
                    const stages = analysis.routeArchitect.routes[0].stages;
                    const locations = stages.map((s: any) => s.location_name).filter((n: any) => n && n.length > 2);
                    // Deduplicate and Join
                    center = [...new Set(locations)].join(', ');
                } 
                // Option 2: Use Input Definition (Fallback)
                else {
                    const start = log.roundtrip.startLocation;
                    const stops = Array.isArray(log.roundtrip.stops) ? log.roundtrip.stops.map((s: any) => s.location) : [];
                    const end = log.roundtrip.endLocation;
                    
                    const allLocations = [start, ...stops, end].filter((s: any) => s && s.length > 2);
                    center = [...new Set(allLocations)].join(', ');
                }
            }
        }
    }

    // 3. Extract from Ad-Hoc String (Override)
    // Allows user to force "LOC: Berlin" in manual prompt
    if (feedback) {
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch && locMatch[1].trim()) center = locMatch[1].trim();

        const radMatch = feedback.match(/RAD:(\d+)/);
        if (radMatch) radius = parseInt(radMatch[1]);
    }

    // Safety: If center is still generic or empty, warn but don't crash
    if (!center || center === "Europe") {
        console.warn("[GeoExpander] No specific center found. Using generic scope.");
    }

    return {
        context: {
            center, // Can now be a list: "City A, City B, City C"
            radius
        }
    };
};
// --- END OF FILE 79 Zeilen ---