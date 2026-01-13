// src/features/shared/NotificationSystem.tsx
// 10.01.2026 22:00
// UPDATE: Implemented Centered Loading Modal (Blocking) + Toast System for others.
// FIX: Removed missing import 'AppNotification' and defined locally. Fixed implicit any.

import React from 'react';
import { useTripStore } from '../../store/useTripStore';
import { 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  X, 
  Loader2 
} from 'lucide-react';

// FIX: Local definition since it's missing in store export
interface AppNotification {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  message: string;
  actions?: {
    label: string;
    onClick: () => void;
    variant?: 'default' | 'outline';
  }[];
}

export const NotificationSystem: React.FC = () => {
  const { notifications, dismissNotification } = useTripStore();

  if (notifications.length === 0) return null;

  // Strategie: Wir suchen EINE Loading-Notification für das Modal.
  // Alle anderen (Erfolg, Fehler) bleiben Toasts.
  const loadingNotification = notifications.find((n: any) => n.type === 'loading');
  const toastNotifications = notifications.filter((n: any) => n.type !== 'loading');

  return (
    <>
      {/* 1. BLOCKING LOADING MODAL (Centered) */}
      {loadingNotification && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 flex flex-col items-center text-center animate-in zoom-in-95 duration-200">
            
            {/* Spinner */}
            <div className="mb-4 p-3 bg-blue-50 rounded-full">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>

            {/* Message */}
            <h3 className="text-lg font-semibold text-slate-800 mb-2">
              {loadingNotification.message}
            </h3>
            <p className="text-sm text-slate-500 mb-6">
              Bitte warten, dies kann einen Moment dauern...
            </p>

            {/* ACTIONS (z.B. Abbrechen) */}
            {loadingNotification.actions && loadingNotification.actions.length > 0 && (
              <div className="flex gap-3 w-full justify-center">
                {loadingNotification.actions.map((action: any, idx: number) => (
                  <button
                    key={idx}
                    onClick={action.onClick}
                    className={`
                      px-4 py-2 rounded-lg font-medium text-sm transition-colors w-full
                      ${action.variant === 'outline' 
                        ? 'border border-slate-200 text-slate-600 hover:bg-slate-50' 
                        : 'bg-red-50 text-red-600 hover:bg-red-100' // Default für Cancel im Modal eher rot/dezent
                      }
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. TOAST STACK (Bottom Right) - Für Success/Error */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 w-full max-w-sm pointer-events-none">
        {toastNotifications.map((notification: any) => (
          <Toast 
            key={notification.id} 
            notification={notification} 
            onDismiss={() => dismissNotification(notification.id)} 
          />
        ))}
      </div>
    </>
  );
};

const Toast: React.FC<{ 
  notification: AppNotification; 
  onDismiss: () => void;
}> = ({ notification, onDismiss }) => {
  
  // Styling based on type
  const getStyles = () => {
    switch (notification.type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default: // info
        return 'bg-slate-50 border-slate-200 text-slate-800';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-600" />;
      default: return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  const getButtonStyles = (variant: 'default' | 'outline' = 'default') => {
    const base = "px-3 py-1 text-xs font-semibold rounded shadow-sm transition-colors active:scale-95";
    
    if (notification.type === 'error') {
       if (variant === 'outline') return `${base} border border-red-200 text-red-700 hover:bg-red-100 bg-white`;
       return `${base} bg-red-600 text-white hover:bg-red-700 border border-transparent`;
    }
    // Default
    if (variant === 'outline') return `${base} border border-slate-200 text-slate-700 hover:bg-slate-100 bg-white`;
    return `${base} bg-slate-800 text-white hover:bg-slate-900 border border-transparent`;
  };

  return (
    <div 
      className={`
        pointer-events-auto
        flex items-start gap-3 p-4 rounded-lg shadow-lg border 
        transition-all duration-300 ease-in-out
        animate-in slide-in-from-right fade-in zoom-in-95
        ${getStyles()}
      `}
      role="alert"
    >
      <div className="flex-shrink-0 mt-0.5">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">
          {notification.message}
        </div>

        {/* RENDER ACTIONS (Buttons inside Toast) */}
        {notification.actions && notification.actions.length > 0 && (
          <div className="mt-3 flex gap-2">
            {notification.actions.map((action, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                }}
                className={getButtonStyles(action.variant)}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <button 
        onClick={onDismiss}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity p-0.5 rounded-full hover:bg-black/5"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};