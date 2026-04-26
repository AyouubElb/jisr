// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://8c48f3fbbc6b65e6964449e50fbe7fcd@o4511275027988480.ingest.de.sentry.io/4511275033231440",

  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: true,

  beforeSend(event) {
    const msg = event.exception?.values?.[0]?.value ?? "";
    if (msg.includes("AuthApiError") || msg.includes("AuthSessionMissingError")) {
      return null;
    }
    return event;
  },
});
