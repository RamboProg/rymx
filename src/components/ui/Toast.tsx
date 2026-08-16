"use client";

import * as RadixToast from "@radix-ui/react-toast";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type ToastVariant = "success" | "error";
type ToastEntry = { id: string; message: string; variant: ToastVariant };

type ToastContextValue = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Corner popup for cart feedback (and anything else that wants a transient
// success/error notice). Mounted once in the root layout; call useToast()
// anywhere below it.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const counter = useRef(0);

  const push = useCallback((variant: ToastVariant, message: string) => {
    counter.current += 1;
    const id = `${Date.now()}-${counter.current}`;
    setToasts((current) => [...current, { id, message, variant }]);
  }, []);

  const value: ToastContextValue = {
    success: useCallback((message: string) => push("success", message), [push]),
    error: useCallback((message: string) => push("error", message), [push]),
  };

  function remove(id: string) {
    setToasts((current) => current.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={value}>
      <RadixToast.Provider swipeDirection="right" duration={4000}>
        {children}
        {toasts.map((t) => (
          <RadixToast.Root
            key={t.id}
            onOpenChange={(open) => {
              if (!open) remove(t.id);
            }}
            className={`border-rymx-cream/10 bg-rymx-card flex items-start gap-3 rounded-md border p-4 shadow-lg transition-all data-[state=closed]:opacity-0 data-[state=open]:opacity-100 ${
              t.variant === "error" ? "border-red-400/30" : "border-rymx-gold/30"
            }`}
          >
            <RadixToast.Description
              className={`font-mono text-xs ${
                t.variant === "error" ? "text-red-400" : "text-rymx-cream"
              }`}
            >
              {t.message}
            </RadixToast.Description>
            <RadixToast.Close
              aria-label="Dismiss"
              className="text-rymx-cream/40 hover:text-rymx-cream ml-auto text-xs"
            >
              ✕
            </RadixToast.Close>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="fixed top-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
