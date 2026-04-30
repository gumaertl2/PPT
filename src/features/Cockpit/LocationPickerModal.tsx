// 21.03.2026 19:30 - FEAT: Added LocationPickerModal to manually select or correct GPS coordinates for expenses and diary notes.
// src/features/Cockpit/LocationPickerModal.tsx

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X, Navigation, CheckCircle2, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import 'leaflet/dist/leaflet.css';

interface LocationPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialLocation: { lat: number, lng: number } | null;
    onSave: (location: { lat: number, lng: number }) => void;
}

const LocationPickerLogic: React.FC<{ 
    position: {lat: number, lng: number} | null, 
    setPosition: (pos: {lat: number, lng: number}) => void 
}> = ({ position, setPosition }) => {
    useMapEvents({
        click(e) {
            setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
    });

    const map = useMap();
    
    useEffect(() => {
        if (position) {
            map.flyTo([position.lat, position.lng], map.getZoom() < 14 ? 15 : map.getZoom());
        }
    }, [position, map]);

    return null;
};

const customPin = L.divIcon({
    className: 'custom-picker-pin',
    html: `<div style="color: #ef4444; filter: drop-shadow(0 4px 3px rgb(0 0 0 / 0.3));"><svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3" fill="white"></circle></svg></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
});

export const LocationPickerModal: React.FC<LocationPickerModalProps> = ({ isOpen, onClose, initialLocation, onSave }) => {
    const { t } = useTranslation();
    const [position, setPosition] = useState<{ lat: number, lng: number } | null>(initialLocation);
    const [isLocating, setIsLocating] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setPosition(initialLocation);
        }
    }, [isOpen, initialLocation]);

    const handleLocateMe = () => {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setIsLocating(false);
            },
            (err) => {
                console.error("GPS Error:", err);
                setIsLocating(false);
                alert(t('finance.error_gps_failed', { defaultValue: 'GPS konnte nicht abgerufen werden.' }));
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    if (!isOpen) return null;

    const defaultCenter: [number, number] = position ? [position.lat, position.lng] : [48.1351, 11.5820]; // Default München, falls nichts da ist

    return createPortal(
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                
                <div className="flex justify-between items-center p-4 border-b border-slate-100 shrink-0">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-blue-500" />
                        {t('map.picker_title', { defaultValue: 'Ort auf Karte wählen' })}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 p-1.5 rounded-full transition-colors"><X className="w-5 h-5"/></button>
                </div>

                <div className="p-3 bg-blue-50/50 text-xs text-blue-800 font-medium border-b border-blue-100 shrink-0">
                    {t('map.picker_hint', { defaultValue: 'Klicke auf die Karte, um den exakten Ort zu markieren.' })}
                </div>

                <div className="relative h-[350px] w-full bg-slate-100 shrink-0">
                    <button 
                        onClick={handleLocateMe}
                        className={`absolute top-3 right-3 z-[1000] bg-white text-blue-600 p-2.5 rounded-xl shadow-md border border-slate-200 hover:bg-blue-50 transition-all ${isLocating ? 'animate-pulse' : ''}`}
                        title={t('map.locate_me', { defaultValue: 'Meinen Standort nutzen' })}
                    >
                        <Navigation className={`w-5 h-5 ${isLocating ? 'animate-spin' : ''}`} />
                    </button>

                    <MapContainer 
                        center={defaultCenter} 
                        zoom={position ? 15 : 4} 
                        style={{ height: "100%", width: "100%" }}
                        zoomControl={false}
                    >
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
                        <LocationPickerLogic position={position} setPosition={setPosition} />
                        {position && <Marker position={[position.lat, position.lng]} icon={customPin} />}
                    </MapContainer>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 shrink-0">
                    <button onClick={onClose} className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-100 transition-colors shadow-sm">
                        {t('actions.cancel', { defaultValue: 'Abbrechen' })}
                    </button>
                    <button 
                        onClick={() => { if (position) { onSave(position); onClose(); } }} 
                        disabled={!position}
                        className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                    >
                        <CheckCircle2 className="w-4 h-4"/> {t('map.use_this_location', { defaultValue: 'Ort übernehmen' })}
                    </button>
                </div>

            </div>
        </div>,
        document.body
    );
};
// --- END OF FILE 108 Zeilen ---