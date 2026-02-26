// 26.02.2026 12:55 - FEAT: Replaced hardcoded 'name' with 'nameKey' and 'defaultName' for i18n support.
// 26.02.2026 12:05 - FEAT: Extracted mapping constants, Layer Configs, and Icon Generators.
// src/features/Cockpit/Map/MapConstants.ts

import L from 'leaflet';
import type { Place } from '../../../core/types/models';

export type MapLayerType = 'standard' | 'topo' | 'cycle' | 'satellite';

export const MAP_LAYERS: Record<MapLayerType, { nameKey: string; defaultName: string; url: string; maxZoom: number; attribution: string }> = {
  standard: {
    nameKey: 'map.layer.standard',
    defaultName: 'Standard (Straße)',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap'
  },
  topo: {
    nameKey: 'map.layer.topo',
    defaultName: 'Wandern (Topografie)',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    maxZoom: 17,
    attribution: '&copy; OpenTopoMap'
  },
  cycle: {
    nameKey: 'map.layer.cycle',
    defaultName: 'Fahrradwege (CyclOSM)',
    url: 'https://{s}.tile-cyclosm.openstreetmap.fr/cyclosm/{z}/{x}/{y}.png',
    maxZoom: 20,
    attribution: '&copy; CyclOSM'
  },
  satellite: {
    nameKey: 'map.layer.satellite',
    defaultName: 'Satellit (Esri)',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 18,
    attribution: '&copy; Esri'
  }
};

export const CATEGORY_COLORS: Record<string, string> = {
  'museum': '#dc2626', 'architecture': '#db2777', 'sight': '#dc2626',        
  'districts': '#9333ea', 'city_info': '#7e22ce', 'nature': '#16a34a',       
  'parks': '#84cc16', 'view': '#16a34a', 'beach': '#2563eb', 'lake': '#2563eb',
  'wellness': '#06b6d4', 'relaxation': '#06b6d4', 'sports': '#ea580c',       
  'hiking': '#ea580c', 'abenteuer': '#ea580c', 'restaurant': '#ca8a04',   
  'food': '#ca8a04', 'gastronomy': '#ca8a04', 'dinner': '#ca8a04',
  'lunch': '#ca8a04', 'shopping': '#7c3aed', 'market': '#7c3aed',
  'nightlife': '#1e3a8a', 'family': '#0d9488', 'hotel': '#000000',        
  'accommodation': '#000000', 'camping': '#000000', 'campsite': '#000000',
  'stellplatz': '#000000', 'arrival': '#4b5563', 'general': '#64748b',
  'special': '#f59e0b', 'sunny': '#f59e0b', 'rainy': '#3b82f6'    
};

export const DEFAULT_COLOR = '#64748b'; 

export const DAY_COLORS = [
    '#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', 
    '#0ea5e9', '#f43f5e', '#14b8a6', '#f97316', '#6366f1'  
];

export const getCategoryColor = (cat?: string, place?: Place): string => {
  if (!cat) return DEFAULT_COLOR;
  if (cat === 'special' && place?.details?.specialType) {
      if (place.details.specialType === 'sunny') return CATEGORY_COLORS['sunny'];
      if (place.details.specialType === 'rainy') return CATEGORY_COLORS['rainy'];
  }
  const normalized = cat.toLowerCase().trim();
  if (CATEGORY_COLORS[normalized]) return CATEGORY_COLORS[normalized];
  const match = Object.keys(CATEGORY_COLORS).find(key => normalized.includes(key));
  return match ? CATEGORY_COLORS[match] : DEFAULT_COLOR;
};

export const createSmartIcon = (categoryColor: string, isSelected: boolean, dayNumber?: number, isHotel?: boolean, userPriority: number = 0, isFixed: boolean = false) => {
  const baseSize = isSelected ? 28 : 22;
  const animClass = isSelected ? 'marker-pulse' : '';
  const border = isSelected ? '3px solid #000' : '2px solid white';

  const isIgnored = userPriority === -1;
  const hasPrio = isFixed || userPriority === 1 || userPriority === 2;
  
  const shapeRadius = hasPrio ? '50%' : '6px';
  const opacity = isIgnored ? '0.4' : '0.9'; 
  const grayscale = isIgnored ? 'filter: grayscale(100%);' : '';

  if (isHotel) {
      return L.divIcon({
          className: `custom-map-marker ${animClass}`,
          html: `<div style="background-color: #0f172a; width: ${baseSize + 6}px; height: ${baseSize + 6}px; border-radius: 8px; border: ${border}; display: flex; align-items: center; justify-content: center; font-size: ${baseSize * 0.6}px; box-shadow: 0 4px 8px rgba(0,0,0,0.4); z-index: 999;">🏨</div>`,
          iconSize: [baseSize + 6, baseSize + 6],
          iconAnchor: [(baseSize + 6) / 2, (baseSize + 6) / 2],
          popupAnchor: [0, -12]
      });
  }

  if (dayNumber) {
      const dayColor = DAY_COLORS[(dayNumber - 1) % DAY_COLORS.length];
      return L.divIcon({
          className: `custom-map-marker ${animClass}`,
          html: `<div style="background-color: ${dayColor}; width: ${baseSize + 2}px; height: ${baseSize + 2}px; border-radius: 50%; border: ${border}; display: flex; align-items: center; justify-content: center; color: white; font-weight: 900; font-family: sans-serif; font-size: ${baseSize * 0.55}px; box-shadow: 0 3px 6px rgba(0,0,0,0.3); z-index: 500;">${dayNumber}</div>`,
          iconSize: [baseSize + 2, baseSize + 2],
          iconAnchor: [(baseSize + 2) / 2, (baseSize + 2) / 2],
          popupAnchor: [0, -12]
      });
  }

  return L.divIcon({
      className: `custom-map-marker ${animClass}`,
      html: `<div style="background-color: ${categoryColor}; width: ${baseSize - 2}px; height: ${baseSize - 2}px; border-radius: ${shapeRadius}; border: ${border}; opacity: ${opacity}; ${grayscale} box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
      iconSize: [baseSize - 2, baseSize - 2],
      iconAnchor: [(baseSize - 2) / 2, (baseSize - 2) / 2],
      popupAnchor: [0, -10]
  });
};
// --- END OF FILE 98 Zeilen ---