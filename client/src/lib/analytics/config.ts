const enabled = import.meta.env.VITE_ANALYTICS_ENABLED === "true";

export const analyticsConfig = {
  enabled,
  debug: import.meta.env.DEV || import.meta.env.VITE_ANALYTICS_DEBUG === "true",
  ga4MeasurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim() ?? "",
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID?.trim() ?? "",
} as const;

export const hasConfiguredAnalyticsTags =
  analyticsConfig.enabled &&
  Boolean(analyticsConfig.ga4MeasurementId || analyticsConfig.metaPixelId);
