// src/context/ToastContext.jsx
//
// Lightweight global toast/snackbar system. Any component calls
// useToast().show(...) to queue a toast; <Toaster /> (mounted once, in
// App.jsx) renders whatever is queued.

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

const ToastContext = createContext(null);

let nextId = 1;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));

    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const show = useCallback(
    (message, { type = "success", duration = 3200 } = {}) => {
      const id = nextId++;

      setToasts((current) => [...current, { id, message, type }]);

      timers.current[id] = setTimeout(() => dismiss(id), duration);

      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      show,
      dismiss,
      success: (message, options) => show(message, { ...options, type: "success" }),
      error: (message, options) => show(message, { ...options, type: "error" }),
      info: (message, options) => show(message, { ...options, type: "info" }),
      toasts,
    }),
    [show, dismiss, toasts]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside a <ToastProvider>.");
  }

  return context;
};
