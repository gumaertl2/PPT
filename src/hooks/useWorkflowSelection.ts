// 05.02.2026 18:15 - FIX: INFINITE SELECTION LOOP.
// - Removed circular dependency in useEffect (getStepStatus).
// - Auto-selection now only runs once when modal opens.
// src/hooks/useWorkflowSelection.ts

import { useState, useEffect, useCallback } from 'react';
import { useTripStore } from '../store/useTripStore';
import { WORKFLOW_STEPS } from '../core/Workflow/steps';
import type { WorkflowStepId } from '../core/types';

type StepStatus = 'locked' | 'available' | 'done';

export const useWorkflowSelection = (isOpen: boolean) => {
    const { project } = useTripStore();
    const [selectedSteps, setSelectedSteps] = useState<WorkflowStepId[]>([]);

    // 1. GLOBAL CONTEXT
    const isStationary = project.userInputs.logistics.mode === 'stationaer';

    // 2. HELPER: Check selection
    const isSelected = useCallback((id: WorkflowStepId) => {
        return selectedSteps.includes(id);
    }, [selectedSteps]);

    // 3. CORE LOGIC: STATUS CALCULATION
    // Note: This logic is reactive. It updates as the user clicks items.
    const getStepStatus = useCallback((stepId: WorkflowStepId): StepStatus => {
        // Data Presence Checks
        const places = project.data.places || {};
        const validPlaces = Object.values(places).filter((p: any) => p.id !== 'dummy-example-id');
        const hasPlaces = validPlaces.length > 0;
        
        // Magic Chain: Unlock if data exists OR if prerequisite is currently selected
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
                const isEnriched = validPlaces.some((p: any) => 
                    (p.kurzbeschreibung && p.kurzbeschreibung.length > 20) || 
                    (p.logistics_info && p.logistics_info.length > 10) ||
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

    // 4. SMART AUTO-SELECTION (On Open)
    // FIX: Removed 'getStepStatus' from dependency array to prevent infinite loop on selection change.
    useEffect(() => {
        if (isOpen) {
            const defaults: WorkflowStepId[] = [];
            const places = project.data.places || {};
            const hasPlaces = Object.keys(places).length > 0;

            WORKFLOW_STEPS.forEach(step => {
                // Scenario: Fresh Start (Special Logic)
                if (!hasPlaces) {
                    if (['basis', 'anreicherer', 'foodScout', 'ideenScout', 'infoAutor'].includes(step.id)) {
                         defaults.push(step.id);
                         return;
                    }
                }

                // Standard Logic using CURRENT status (Snapshot at open time)
                const status = getStepStatus(step.id);
                
                if (status === 'done') return;
                
                if (status === 'available') {
                    defaults.push(step.id);
                }
            });
            
            // Final Filter
            const validDefaults = defaults.filter(id => {
                if (id === 'routeArchitect' && isStationary) return false;
                if (id === 'transferPlanner' && isStationary) return false;
                return true;
            });

            setSelectedSteps(validDefaults);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, project, isStationary]); // Explicitly excluded getStepStatus

    // 5. ACTIONS
    const toggleStep = (id: WorkflowStepId) => {
        // If I click a selected item to DESELECT it:
        if (selectedSteps.includes(id)) {
            setSelectedSteps(prev => prev.filter(s => s !== id));
            return;
        }

        // If I click an unselected item to SELECT it:
        if (getStepStatus(id) === 'locked') return;

        setSelectedSteps(prev => [...prev, id]);
    };

    return {
        selectedSteps,
        toggleStep,
        getStepStatus,
        isStationary
    };
};
// --- END OF FILE 138 Zeilen ---