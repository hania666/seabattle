import { createContext, useContext } from "react";

export type ToastTone = "info" | "success" | "error";

export interface Toast {
  id: string;
  tone: ToastTone;
  title?: string;
  message: string;
}

export interface ToastContextValue {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a <ToastProvider>");
  return ctx;
}
