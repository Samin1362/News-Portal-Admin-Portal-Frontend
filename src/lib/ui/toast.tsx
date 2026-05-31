"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils/cn";

export type ToastTone = "info" | "success" | "error";

export interface ToastOptions {
  /** Echoed `X-Request-Id` from the backend, surfaced under the message. */
  requestId?: string;
  /** Override the default 4.5s auto-dismiss. */
  durationMs?: number;
}

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
  requestId?: string;
}

interface ToastContextValue {
  show: (message: string, tone?: ToastTone, opts?: ToastOptions) => void;
  success: (message: string, opts?: ToastOptions) => void;
  error: (message: string, opts?: ToastOptions) => void;
  info: (message: string, opts?: ToastOptions) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const timers = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const show = useCallback(
    (message: string, tone: ToastTone = "info", opts?: ToastOptions) => {
      const id = nextId++;
      setItems((prev) => [
        ...prev,
        { id, message, tone, requestId: opts?.requestId },
      ]);
      const timer = setTimeout(() => dismiss(id), opts?.durationMs ?? 4500);
      timers.current.set(id, timer);
    },
    [dismiss],
  );

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((t) => clearTimeout(t));
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      show,
      success: (m, opts) => show(m, "success", opts),
      error: (m, opts) => show(m, "error", opts),
      info: (m, opts) => show(m, "info", opts),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="fixed top-4 right-4 z-100 flex flex-col gap-2 max-w-90 pointer-events-none"
      >
        {items.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismiss(t.id)}
            className={cn(
              "pointer-events-auto text-left border-[1.5px] rounded-sm px-3 py-2 bg-paper shadow-sm",
              "font-sans text-[13px] leading-relaxed",
              t.tone === "success" && "border-accent-2",
              t.tone === "error" && "border-accent",
              t.tone === "info" && "border-ink",
            )}
          >
            <span className="font-hand text-[11px] block mb-0.5 uppercase tracking-wider">
              {t.tone === "success" && (
                <span className="text-accent-2">Done</span>
              )}
              {t.tone === "error" && <span className="text-accent">Error</span>}
              {t.tone === "info" && <span className="text-muted">Notice</span>}
            </span>
            <span className="text-ink block">{t.message}</span>
            {t.requestId ? (
              <span className="block font-mono text-[10px] text-muted mt-1 break-all">
                req · {t.requestId}
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
