const enabled = import.meta.env.VITE_ANALYTICS_ENABLED === "true";

export const analyticsConfig = {
  enabled,
  debug: import.meta.env.DEV || import.meta.env.VITE_ANALYTICS_DEBUG === "true",
  ga4MeasurementId: import.meta.env.VITE_GA4_MEASUREMENT_ID?.trim() ?? "",
  metaPixelId: import.meta.env.VITE_META_PIXEL_ID?.trim() ?? "",
  // GTM은 서드파티 태그(메타 픽셀·Hotjar 등)를 코드 배포 없이 붙이기 위한 통로다.
  // GA4는 코드에서 직접 보내므로 GTM 안에서 GA4 태그를 또 만들면 이중 집계된다.
  gtmContainerId: import.meta.env.VITE_GTM_CONTAINER_ID?.trim() ?? "",
} as const;

export const hasConfiguredExternalAnalytics =
  analyticsConfig.enabled && Boolean(analyticsConfig.ga4MeasurementId);
