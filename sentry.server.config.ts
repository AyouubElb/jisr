// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://8c48f3fbbc6b65e6964449e50fbe7fcd@o4511275027988480.ingest.de.sentry.io/4511275033231440",

  tracesSampleRate: 1,
  enableLogs: true,
  sendDefaultPii: true,

  ignoreErrors: [
    "Invalid login credentials",
    "Email not confirmed",
    "User already registered",
  ],

  beforeSend(event) {
    const msg = event.exception?.values?.[0]?.value ?? "";
    if (msg.includes("AuthApiError") || msg.includes("AuthSessionMissingError")) {
      return null;
    }
    return event;
  },
});
