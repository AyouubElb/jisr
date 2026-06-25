import { QueryClient, isServer } from "@tanstack/react-query";

// Defaults must match QueryProvider so server + browser caches behave alike.
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false, retry: 1 },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/** Server: fresh client per request (no cross-request leak). Browser: shared. */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
