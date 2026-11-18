import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const remove = useCallback((id) => {
    setToasts((items) => items.filter((item) => item.id !== id));
  }, []);

  const notify = useCallback((message, type = "success") => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((items) => [...items, { id, message, type }]);
    window.setTimeout(() => remove(id), 4500);
  }, [remove]);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex w-[min(92vw,380px)] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start gap-3 rounded-xl border bg-white p-4 shadow-panel ${
              toast.type === "error" ? "border-red-200" : "border-emerald-200"
            }`}
            role="status"
          >
            {toast.type === "error"
              ? <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}
            <p className="flex-1 text-sm text-slate-700">{toast.message}</p>
            <button type="button" aria-label="Dismiss notification" onClick={() => remove(toast.id)}>
              <X className="h-4 w-4 text-slate-400" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context.notify;
}
