import type { AttributionContext, CampaignParameters } from "./types";

const STORAGE_KEY = "pawever:campaign-attribution:v1";
const MAX_VALUE_LENGTH = 200;
const CAMPAIGN_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "fbclid",
  "gclid",
] as const;

export interface AttributionStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

interface InitializeAttributionOptions {
  search: string;
  pathname: string;
  storage: AttributionStorage;
  now?: () => string;
  createId?: () => string;
}

const sanitizeValue = (value: string) =>
  value
    .trim()
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, MAX_VALUE_LENGTH);

export const parseCampaignParameters = (search: string) => {
  const params = new URLSearchParams(search);
  const campaign: CampaignParameters = {};

  for (const key of CAMPAIGN_KEYS) {
    const rawValue = params.get(key);
    if (!rawValue) continue;
    const value = sanitizeValue(rawValue);
    if (value) campaign[key] = value;
  }

  return campaign;
};

const readStoredContext = (
  storage: AttributionStorage
): AttributionContext | null => {
  try {
    const value = storage.getItem(STORAGE_KEY);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<AttributionContext>;

    if (
      typeof parsed.visitId !== "string" ||
      typeof parsed.startedAt !== "string" ||
      typeof parsed.entryPath !== "string" ||
      !parsed.firstTouch ||
      !parsed.lastTouch ||
      typeof parsed.lastTouchAt !== "string"
    ) {
      return null;
    }

    return parsed as AttributionContext;
  } catch {
    return null;
  }
};

const writeStoredContext = (
  storage: AttributionStorage,
  context: AttributionContext
) => {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(context));
  } catch {
    // Attribution must never block the landing page or survey.
  }
};

const campaignsMatch = (
  first: CampaignParameters,
  second: CampaignParameters
) => CAMPAIGN_KEYS.every(key => first[key] === second[key]);

const defaultId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `visit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

export const initializeAttribution = ({
  search,
  pathname,
  storage,
  now = () => new Date().toISOString(),
  createId = defaultId,
}: InitializeAttributionOptions): AttributionContext => {
  const timestamp = now();
  const campaign = parseCampaignParameters(search);
  const stored = readStoredContext(storage);
  const hasCampaign = Object.keys(campaign).length > 0;

  if (stored) {
    const updated =
      hasCampaign && !campaignsMatch(stored.lastTouch, campaign)
        ? { ...stored, lastTouch: campaign, lastTouchAt: timestamp }
        : stored;
    writeStoredContext(storage, updated);
    return updated;
  }

  const context: AttributionContext = {
    visitId: createId(),
    startedAt: timestamp,
    entryPath: pathname,
    firstTouch: campaign,
    lastTouch: campaign,
    lastTouchAt: timestamp,
  };
  writeStoredContext(storage, context);
  return context;
};

let inMemoryContext: AttributionContext | null = null;
const fallbackStorage = new Map<string, string>();
const inMemoryStorage: AttributionStorage = {
  getItem: key => fallbackStorage.get(key) ?? null,
  setItem: (key, value) => {
    fallbackStorage.set(key, value);
  },
};

const getSessionStorage = (): AttributionStorage => {
  try {
    return window.sessionStorage;
  } catch {
    return inMemoryStorage;
  }
};

export const getAttributionContext = () => {
  if (inMemoryContext) return inMemoryContext;

  inMemoryContext = initializeAttribution({
    search: window.location.search,
    pathname: window.location.pathname,
    storage: getSessionStorage(),
  });
  return inMemoryContext;
};

export const refreshAttributionContext = () => {
  inMemoryContext = initializeAttribution({
    search: window.location.search,
    pathname: window.location.pathname,
    storage: getSessionStorage(),
  });
  return inMemoryContext;
};
