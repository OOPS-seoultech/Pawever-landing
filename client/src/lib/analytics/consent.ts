import type { ConsentState } from "./types";

const STORAGE_KEY = "pawever:analytics-consent:v1";
const defaultConsent: ConsentState = {
  analytics: false,
  marketing: false,
  decidedAt: null,
};

export const EXTERNAL_ANALYTICS_CONSENT_CHOICES = {
  allow: {
    analytics: true,
    marketing: false,
  },
  decline: {
    analytics: false,
    marketing: false,
  },
} as const satisfies Record<
  "allow" | "decline",
  Pick<ConsentState, "analytics" | "marketing">
>;

type ConsentListener = (consent: ConsentState) => void;

const listeners = new Set<ConsentListener>();
let inMemoryConsent: ConsentState | null = null;

const isConsentState = (value: unknown): value is ConsentState => {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<ConsentState>;
  return (
    typeof state.analytics === "boolean" &&
    typeof state.marketing === "boolean" &&
    (typeof state.decidedAt === "string" || state.decidedAt === null)
  );
};

export const getConsentState = (): ConsentState => {
  if (inMemoryConsent) return inMemoryConsent;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      inMemoryConsent = defaultConsent;
      return inMemoryConsent;
    }
    const parsed: unknown = JSON.parse(stored);
    inMemoryConsent = isConsentState(parsed)
      ? {
          ...parsed,
          // 광고 측정은 별도 안내·동의 UI를 마련하기 전까지 활성화하지 않는다.
          marketing: false,
        }
      : defaultConsent;
    return inMemoryConsent;
  } catch {
    inMemoryConsent = defaultConsent;
    return inMemoryConsent;
  }
};

export const setConsentState = (
  categories: Pick<ConsentState, "analytics">
) => {
  const next: ConsentState = {
    analytics: categories.analytics,
    marketing: false,
    decidedAt: new Date().toISOString(),
  };
  inMemoryConsent = next;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Consent still applies in memory for the current page.
  }

  listeners.forEach(listener => {
    try {
      listener(next);
    } catch {
      // A tag failure must not block the visitor's consent choice.
    }
  });
  return next;
};

export const subscribeConsent = (listener: ConsentListener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
