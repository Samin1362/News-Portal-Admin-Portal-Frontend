"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AdminAuthProvider } from "@/lib/auth/AdminAuthProvider";
import { ToastProvider } from "@/lib/ui/toast";

/**
 * Root client-side providers. One QueryClient per request, hidden behind
 * useState so HMR doesn't re-instantiate it.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <ToastProvider>
        <AdminAuthProvider>{children}</AdminAuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
