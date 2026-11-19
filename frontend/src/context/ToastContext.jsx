import { createContext, useCallback, useContext, useMemo } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

const ToastContext = createContext(null);
const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 4500,
  timerProgressBar: true,
  customClass: { popup: "stockroom-swal-popup" }
});

export function ToastProvider({ children }) {
  const notify = useCallback((message, type = "success") => {
    void Toast.fire({
      icon: type === "error" ? "error" : "success",
      title: message,
      background: "#141d26",
      color: "#e7edf3"
    });
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context.notify;
}
