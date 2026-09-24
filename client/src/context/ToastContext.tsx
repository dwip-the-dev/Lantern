import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev.slice(-3), { id, message, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4200);
  }, [removeToast]);

  const success = useCallback((msg: string) => showToast(msg, 'success'), [showToast]);
  const error = useCallback((msg: string) => showToast(msg, 'error'), [showToast]);
  const warning = useCallback((msg: string) => showToast(msg, 'warning'), [showToast]);
  const info = useCallback((msg: string) => showToast(msg, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info }}>
      {children}
      {/* Apple-grade Floating Dynamic Island Style Toast Portal */}
      <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none px-4 w-full max-w-md">
        {toasts.map((toast) => {
          const isError = toast.type === 'error';
          const isSuccess = toast.type === 'success';
          const isWarning = toast.type === 'warning';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all animate-fade-in-up duration-300 w-full ${
                isError
                  ? 'bg-rose-950/85 border-rose-500/30 text-rose-100 shadow-rose-950/50'
                  : isSuccess
                  ? 'bg-emerald-950/85 border-emerald-500/30 text-emerald-100 shadow-emerald-950/50'
                  : isWarning
                  ? 'bg-amber-950/85 border-amber-500/30 text-amber-100 shadow-amber-950/50'
                  : 'bg-slate-900/90 border-slate-700/50 text-slate-100 shadow-black/60'
              }`}
            >
              <div className="flex-shrink-0">
                {isError && <AlertCircle className="w-5 h-5 text-rose-400 stroke-[2]" />}
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-400 stroke-[2]" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-400 stroke-[2]" />}
                {!isError && !isSuccess && !isWarning && <Info className="w-5 h-5 text-sky-400 stroke-[2]" />}
              </div>
              <p className="text-sm font-medium leading-snug flex-1 truncate">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="flex-shrink-0 p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      showToast: (msg: string) => console.log(msg),
      success: (msg: string) => console.log(msg),
      error: (msg: string) => console.error(msg),
      warning: (msg: string) => console.warn(msg),
      info: (msg: string) => console.info(msg),
    };
  }
  return context;
};
