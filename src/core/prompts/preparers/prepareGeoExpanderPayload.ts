// 10.02.2026 14:10 - FIX: Added Country Context to resolve ambiguity.
// 11.02.2026 21:45 - FIX: Map 'center' to 'location_name' to satisfy Template interface.
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
    let center = "Europe"; 
    let radius = 20;
    let countryContext = "Europe";

    if (project) {
        const log = project.userInputs?.logistics;
        const analysis = project.analysis;

        // Try to get country/region from inputs
        countryContext = log?.target_countries?.[0] || 
                         (log?.stationary as any)?.region || 
                         "Europe";

        if (log) {
            // CASE A: STATIONARY
            if (log.mode === 'stationaer' && log.stationary?.destination) {
                center = log.stationary.destination;
            } 
            // CASE B: ROUNDTRIP
            else if (log.mode === 'roundtrip' || log.mode === 'mobil') {
                if (analysis?.routeArchitect?.routes?.[0]?.stages) {
                    const stages = analysis.routeArchitect.routes[0].stages;
                    const locations = stages.map((s: any) => s.location_name).filter((n: any) => n && n.length > 2);
                    center = [...new Set(locations)].join(', ');
                } else {
                    const start = log.roundtrip.startLocation;
                    const stops = Array.isArray(log.roundtrip.stops) ? log.roundtrip.stops.map((s: any) => s.location) : [];
                    const end = log.roundtrip.endLocation;
                    const allLocations = [start, ...stops, end].filter((s: any) => s && s.length > 2);
                    center = [...new Set(allLocations)].join(', ');
                }
            }
        }
    }

    // 3. Extract from Ad-Hoc String (HIGHEST PRIORITY)
    if (feedback) {
        const locMatch = feedback.match(/LOC:([^|]+)/);
        if (locMatch && locMatch[1].trim()) center = locMatch[1].trim();

        const radMatch = feedback.match(/RAD:(\d+)/);
        if (radMatch) radius = parseInt(radMatch[1]);
        
        // Extract country from feedback if present to help Google Search
        const countryMatch = feedback.match(/COUNTRY:([^|]+)/);
        if (countryMatch && countryMatch[1].trim()) countryContext = countryMatch[1].trim();
    }

    if (!center || center === "Europe") {
        console.warn("[GeoExpander] No specific center found. Using generic scope.");
    }

    return {
        context: {
            center, 
            radius,
            country: countryContext, // Explicit country for disambiguation
            
            // FIX: Map 'center' to 'location_name'.
            // The Template (geoExpander.ts) expects 'location_name' to define the search target.
            location_name: center 
        }
    };
};
// --- END OF FILE 98 Zeilen ---