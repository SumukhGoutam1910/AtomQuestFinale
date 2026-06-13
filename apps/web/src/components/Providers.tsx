"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      })
  );

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster
          position="top-center"
          toastOptions={{
            duration: 3500,
            style: {
              background: "hsl(0 0% 100%)",
              color: "hsl(222 47% 11%)",
              border: "1px solid hsl(220 16% 90%)",
              borderRadius: "0.5rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              boxShadow: "0 8px 24px hsl(222 47% 11% / 0.1), 0 2px 6px hsl(222 47% 11% / 0.06)",
              padding: "10px 14px",
            },
            success: { iconTheme: { primary: "hsl(158 75% 38%)", secondary: "#fff" } },
            error: { iconTheme: { primary: "hsl(351 83% 56%)", secondary: "#fff" } },
          }}
        />
      </QueryClientProvider>
    </SessionProvider>
  );
}
