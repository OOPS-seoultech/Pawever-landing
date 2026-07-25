import type { ConsentState } from "./types";

export const createAutomaticConsentState = (
  now: () => string = () => new Date().toISOString()
): ConsentState => ({
  analytics: true,
  marketing: true,
  decidedAt: now(),
});

let automaticConsent: ConsentState | null = null;

export const getConsentState = (): ConsentState =>
  (automaticConsent ??= createAutomaticConsentState());
