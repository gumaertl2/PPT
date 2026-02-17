// 17.02.2026 21:05 - FEAT: Added 'validateStepStart' for Tagesplaner Priority Check.
// 17.02.2026 10:45 - FIX: Added Initialization Guard to prevent selection reset.
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

    // 1. GLOBAL CONTEXT
    const isStationary = project.userInputs.logistics.mode === 'stationaer';

    // 2. HELPER: Check selection
    const isSelected = useCallback((id: WorkflowStepId) => {
        return selectedSteps.includes(id);
    }, [selectedSteps]);

    // 3. CORE LOGIC: STATUS CALCULATION
    const getStepStatus = useCallback((stepId: WorkflowStepId): StepStatus => {
        const places = project.data.places || {};
        const validPlaces = Object.values(places).filter((p: any) => p.id !== 'dummy-example-id');
        const hasPlaces = validPlaces.length > 0;
        
        const canRunPlaceDependent = hasPlaces || isSelected('basis');
        const canRunGuideDependent = !!project.analysis.tourGuide || isSelected('tourGuide');

        switch (stepId) {
            case 'chefPlaner':
                return project.analysis.chefPlaner ? 'done' : 'available';

            case 'routeArchitect':
                if (isStationary) return 'locked';
                return project.analysis.routeArchitect ? 'done' : 'available';

            case 'basis':
                return hasPlaces ? 'done' : 'available';
            
            case 'anreicherer':
                if (!canRunPlaceDependent) return 'locked';
                // Less aggressive check: only 'done' if user didn't just ask to re-run
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
                // Fix: Check Guide dependent, but return available even if done to allow updates
                const canRunDayPlan = canRunPlaceDependent && canRunGuideDependent;
                if (!canRunDayPlan) return 'locked';
                return project.itinerary.days.length > 0 ? 'done' : 'available';

            case 'infoAutor': 
                const hasInfos = Array.isArray(project.data.content?.infos) && project.data.content.infos.length > 0;
                return hasInfos ? 'done' : 'available';

            case 'foodScout': 
                if (!canRunPlaceDependent) return 'locked';
                const hasRestaurants = validPlaces.some((p: any) => p.category === 'restaurant' || p.category === 'Restaurant');
                return hasRestaurants ? 'done' : 'available';

            case 'hotelScout': 
                if (!canRunPlaceDependent) return 'locked';
                const manualHotel = project.userInputs.logistics?.stationary?.hotel;
                const hasValidatedHotels = (project.analysis.chefPlaner?.validated_hotels?.length || 0) > 0;
                return (manualHotel || hasValidatedHotels) ? 'done' : 'available';
            
            case 'ideenScout': 
                if (!canRunPlaceDependent) return 'locked';
                const hasIdeen = !!(project.analysis as any).ideenScout;
                return hasIdeen ? 'done' : 'available';

            case 'transferPlanner': 
                if (isStationary) return 'locked';
                const hasDayPlan = project.itinerary.days.length > 0;
                const canRunTransfer = hasDayPlan || isSelected('initialTagesplaner');
                return canRunTransfer ? 'available' : 'locked';
                
            default:
                return 'available';
        }
    }, [project, isStationary, isSelected]);

    // 4. NEW: VALIDATE STEP START (Logic for Tagesplaner Prio Check)
    const validateStepStart = useCallback((stepId: string): StepValidationResult => {
        if (stepId === 'initialTagesplaner') {
             const places = Object.values(project.data.places || {});
             // Check for at least one item with Prio 1/2 or Fix
             const hasPriorities = places.some((p: any) => 
                 (p.userPriority && p.userPriority > 0) || p.isFixed
             );
             
             if (!hasPriorities) {
                 return { 
                     canStart: false, 
                     reason: 'no_priorities', 
                     action: 'prompt_user' // Signal UI to ask: "Assign Prios?"
                 };
             }
        }
        return { canStart: true };
    }, [project.data.places]);

    // 5. SMART AUTO-SELECTION
    useEffect(() => {
        if (isOpen && !hasInitializedRef.current) {
            const defaults: WorkflowStepId[] = [];
            const places = project.data.places || {};
            const hasPlaces = Object.keys(places).length > 0;

            WORKFLOW_STEPS.forEach(step => {
                if (!hasPlaces) {
                    if (['basis', 'anreicherer', 'foodScout', 'ideenScout', 'infoAutor'].includes(step.id)) {
                         defaults.push(step.id);
                         return;
                    }
                }
                const status = getStepStatus(step.id);
                if (status === 'done') return;
                
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
        
        if (!isOpen) {
            hasInitializedRef.current = false;
        }
    }, [isOpen, project, isStationary, getStepStatus]); 

    // 6. ACTIONS
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
        
        if (stepId === 'routeArchitect') {
            setUIState({ viewMode: 'map' });
        }

        // Validate first (e.g. DayPlanner Prios)
        // Note: For direct calls via UI buttons (not the wizard loop), we assume the UI handled the prompt, 
        // OR we enforce it here if needed. 
        // But usually "handleWorkflowSelect" is the final "GO".
        
        await TripOrchestrator.executeTask(stepId as any, undefined, undefined, options);
        
    }, [setUIState]);

    return {
        selectedSteps,
        toggleStep,
        getStepStatus,
        isStationary,
        handleWorkflowSelect,
        validateStepStart // Export new validation function
    };
};
// --- END OF FILE 210 Zeilen ---