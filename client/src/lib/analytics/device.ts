import type { DeviceCategory, DeviceContext } from "./types";

export const classifyDevice = (viewportWidth: number): DeviceCategory => {
  if (viewportWidth < 768) return "mobile";
  if (viewportWidth < 1_024) return "tablet";
  return "desktop";
};

export const getDeviceContext = (): DeviceContext => {
  const viewportWidth = Math.max(0, Math.round(window.innerWidth));
  const viewportHeight = Math.max(0, Math.round(window.innerHeight));

  return {
    category: classifyDevice(viewportWidth),
    viewportWidth,
    viewportHeight,
    screenWidth: Math.max(0, Math.round(window.screen?.width ?? 0)),
    screenHeight: Math.max(0, Math.round(window.screen?.height ?? 0)),
    pixelRatio: Math.max(
      1,
      Math.round((window.devicePixelRatio || 1) * 100) / 100
    ),
    language: navigator.language || "unknown",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown",
  };
};
