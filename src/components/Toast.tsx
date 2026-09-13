import React from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div id="toastHost" className="fixed right-4 bottom-4 z-[100] space-y-2 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        const Icon =
          t.type === 'success'
            ? CheckCircle2
            : t.type === 'error'
            ? AlertTriangle
            : Info;

        const borderBg =
          t.type === 'success'
            ? 'border-emerald-800/80 bg-emerald-950/95 text-emerald-100 shadow-emerald-950/50'
            : t.type === 'error'
            ? 'border-red-800/80 bg-red-950/95 text-red-100 shadow-red-950/50'
            : 'border-zinc-700 bg-zinc-900/95 text-zinc-100 shadow-zinc-950/50';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in fade-in slide-in-from-bottom-2 ${borderBg}`}
          >
            <Icon className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 text-xs leading-relaxed break-words font-medium">
              {t.message}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-zinc-400 hover:text-white shrink-0 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
