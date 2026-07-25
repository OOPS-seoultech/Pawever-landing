const STORAGE_KEY = "pawever:first-party-engagement:v1";
const MAX_PAGE_ACTIVE_MS = 24 * 60 * 60 * 1000;

export interface EngagementStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const browserStorage = (): EngagementStorage | null => {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
};

const read = (storage: EngagementStorage) => {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEY) ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch {
    return {};
  }
};

export const recordFirstPartyEngagement = (
  pageName: string,
  activeMs: number,
  storage = browserStorage()
) => {
  if (!storage || !pageName || !Number.isFinite(activeMs) || activeMs <= 0) {
    return;
  }
  const current = read(storage);
  current[pageName] = Math.min(
    MAX_PAGE_ACTIVE_MS,
    Math.max(0, current[pageName] ?? 0) + Math.round(activeMs)
  );
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // 측정 저장 실패가 설문 진행을 막지 않게 한다.
  }
};

export const getFirstPartyEngagement = (
  storage = browserStorage()
): Record<string, number> => (storage ? read(storage) : {});
