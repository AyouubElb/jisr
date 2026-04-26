// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://8c48f3fbbc6b65e6964449e50fbe7fcd@o4511275027988480.ingest.de.sentry.io/4511275033231440",

  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: true,

  ignoreErrors: [
    // Expected auth errors — not bugs
    "Invalid login credentials",
    "Email not confirmed",
    "User already registered",
    "Password should be at least 6 characters",
    // Browser/network noise
    "ResizeObserver loop limit exceeded",
    "Non-Error promise rejection captured",
    "Load failed",
    "NetworkError",
    "ChunkLoadError",
  ],

  beforeSend(event) {
    // Drop auth errors from Supabase that are user mistakes, not bugs
    const msg = event.exception?.values?.[0]?.value ?? "";
    if (msg.includes("AuthApiError") || msg.includes("AuthSessionMissingError")) {
      return null;
    }
    return event;
  },
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
