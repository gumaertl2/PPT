// 23.02.2026 18:15 - FIX: 'basis' step status now ignores pre-populated hotels to accurately reflect completion.
// 23.02.2026 11:45 - FIX: Prevents auto-selection of 'hotelScout' if a manual hotel is already present.
// 19.02.2026 13:45 - FIX: Added tourGuide, chefredakteur & hotelScout to initial selection fallback.
// src/hooks/useWorkflowSelection.ts

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTripStore } from '../store/useTripStore';
import { WORKFLOW_STEPS } from '../core/Workflow/steps';
import { TripOrchestrator } from '../services/orchestrator';
import type { WorkflowStepId } from '../core/types';

type StepStatus = 'locked' | 'available' | 'done';

export interface StepValidationResult {
    canStart: boolean;
    reason?: 'no_priorities' | 'missing_data' | 'blocked';
    action?: 'prompt_user' | 'show_guide';
}

export const useWorkflowSelection = (isOpen: boolean) => {
    const { project, setUIState } = useTripStore(); 
    const [selectedSteps, setSelectedSteps] = useState<WorkflowStepId[]>([]);
    
    const hasInitializedRef = useRef(false);
    const isStationary = project.userInputs.logistics.mode === 'stationaer';

    const isSelected = useCallback((id: WorkflowStepId) => {
        return selectedSteps.includes(id);
    }, [selectedSteps]);

    const getStepStatus = useCallback((stepId: WorkflowStepId): StepStatus => {
        const places = project.data.places || {};
        const validPlaces = Object.values(places).filter((p: any) => p.id !== 'dummy-example-id');
        const hasPlaces = validPlaces.length > 0;
        
        // FIX: For basis, we only count places that are NOT hotels or restaurants (which might come from other scouts)
        // This prevents the bug where pre-filled hotels make the system think 'basis' is already done.
        const hasBaseSights = validPlaces.some((p: any) => {
            const cat = (p.category || '').toLowerCase();
            return cat !== 'hotel' && cat !== 'restaurant' && cat !== 'special';
        });

        const canRunPlaceDependent = hasPlaces || isSelected('basis');

        switch (stepId) {
            case 'chefPlaner': return project.analysis.chefPlaner ? 'done' : 'available';
            case 'routeArchitect': 
                if (isStationary) return 'locked';
                return project.analysis.routeArchitect ? 'done' : 'available';
            case 'basis': 
                // Return 'done' ONLY if actual sights have been collected, not just hotels.
                return hasBaseSights ? 'done' : 'available';
            
            case 'anreicherer':
                if (!canRunPlaceDependent) return 'locked';
                const isEnriched = validPlaces.some((p: any) => 
                    (p.kurzbeschreibung && p.kurzbeschreibung.length > 20) || 
                    (p.description && p.description.length > 20)
                );
                return isEnriched ? 'done' : 'available';

            case 'tourGuide': 
                if (!canRunPlaceDependent) return 'locked'; 
                return project.analysis.tourGuide ? 'done' : 'available';

            case 'chefredakteur': 
                if (!canRunPlaceDependent) return 'locked';
                const hasDetails = validPlaces.some((p: any) => p.detailContent && p.detailContent.length > 50);
                return hasDetails ? 'done' : 'available';

            case 'initialTagesplaner': 
                if (!hasPlaces) return 'locked';
                return project.itinerary.days.length > 0 ? 'done' : 'available';

            case 'infoAutor': 
                const hasInfos = Array.isArray(project.data.content?.infos) && project.data.content.infos.length > 0;
                return hasInfos ? 'done' : 'available';

            case 'foodScout': 
                if (!canRunPlaceDependent) return 'locked';
                const hasRestaurants = validPlaces.some((p: any) => p.category === 'restaurant' || p.category === 'Restaurant');
                return hasRestaurants ? 'done' : 'available';

            case 'hotelScout': 
                const manualHotel = project.userInputs.logistics?.stationary?.hotel;
                const hasValidatedHotels = (project.analysis.chefPlaner?.validated_hotels?.length || 0) > 0;
                if (manualHotel || hasValidatedHotels) return 'done';
                
                if (!canRunPlaceDependent) return 'locked';
                return 'available';
            
            case 'ideenScout': 
                if (!canRunPlaceDependent) return 'locked';
                const hasIdeen = !!(project.analysis as any).ideenScout;
                return hasIdeen ? 'done' : 'available';

            case 'transferPlanner': 
                if (isStationary) return 'locked';
                const hasDayPlan = project.itinerary.days.length > 0;
                const canRunTransfer = hasDayPlan || isSelected('initialTagesplaner');
                return canRunTransfer ? 'available' : 'locked';
                
            default: return 'available';
        }
    }, [project, isStationary, isSelected]);

    const validateStepStart = useCallback((stepId: string): StepValidationResult => {
        if (stepId === 'initialTagesplaner') {
             const places = Object.values(project.data.places || {});
             const hasPriorities = places.some((p: any) => {
                 const rootPrio = p.userPriority || 0;
                 const legacyPrio = p.userSelection?.priority || 0;
                 const isFixed = !!p.isFixed;
                 return rootPrio > 0 || legacyPrio > 0 || isFixed;
             });
             
             if (!hasPriorities) {
                 return { 
                     canStart: false, 
                     reason: 'no_priorities', 
                     action: 'prompt_user' 
                 };
             }
        }
        return { canStart: true };
    }, [project.data.places]);

    useEffect(() => {
        if (isOpen && !hasInitializedRef.current) {
            const defaults: WorkflowStepId[] = [];
            const places = project.data.places || {};
            // For initial defaults, we use the same strict logic: only count real sights
            const validPlaces = Object.values(places).filter((p: any) => p.id !== 'dummy-example-id');
            const hasBaseSights = validPlaces.some((p: any) => {
                const cat = (p.category || '').toLowerCase();
                return cat !== 'hotel' && cat !== 'restaurant' && cat !== 'special';
            });

            WORKFLOW_STEPS.forEach(step => {
                const status = getStepStatus(step.id);
                
                if (status === 'done') return;
                
                if (!hasBaseSights) {
                    if (['basis', 'anreicherer', 'tourGuide', 'chefredakteur', 'foodScout', 'hotelScout', 'ideenScout', 'infoAutor'].includes(step.id)) {
                         defaults.push(step.id);
                    }
                    return;
                }
                
                if (status === 'available') {
                    if (step.id === 'initialTagesplaner') return;
                    defaults.push(step.id);
                }
            });
            
            const validDefaults = defaults.filter(id => {
                if (id === 'routeArchitect' && isStationary) return false;
                if (id === 'transferPlanner' && isStationary) return false;
                return true;
            });

            setSelectedSteps(validDefaults);
            hasInitializedRef.current = true;
        }
        if (!isOpen) hasInitializedRef.current = false;
    }, [isOpen, project, isStationary, getStepStatus]); 

    const toggleStep = (id: WorkflowStepId) => {
        if (selectedSteps.includes(id)) {
            setSelectedSteps(prev => prev.filter(s => s !== id));
            return;
        }
        if (getStepStatus(id) === 'locked') return;
        setSelectedSteps(prev => [...prev, id]);
    };

    const handleWorkflowSelect = useCallback(async (stepId: string, options?: { mode: 'smart' | 'force' }) => {
        console.log(`[Workflow] Direct Select: ${stepId}`, options);
        if (stepId === 'routeArchitect') setUIState({ viewMode: 'map' });
        
        try {
            await TripOrchestrator.executeTask(stepId as any, undefined, undefined, options);
        } catch (err: any) {
            console.error(`[Workflow] Execution Failed:`, err);
            alert(`Fehler beim Starten des Workflows: ${err.message}`);
        }
    }, [setUIState]);

    return {
        selectedSteps,
        toggleStep,
        getStepStatus,
        isStationary,
        handleWorkflowSelect,
        validateStepStart 
    };
};
// --- END OF FILE 222 Zeilen ---