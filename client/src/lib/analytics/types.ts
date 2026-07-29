export type DeviceCategory = "mobile" | "tablet" | "desktop";

export type ConsentCategory = "analytics" | "marketing";

export interface ConsentState {
  analytics: boolean;
  marketing: boolean;
  decidedAt: string | null;
}

export interface CampaignParameters {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
}

export interface AttributionContext {
  visitId: string;
  startedAt: string;
  entryPath: string;
  firstTouch: CampaignParameters;
  lastTouch: CampaignParameters;
  lastTouchAt: string;
}

export interface DeviceContext {
  category: DeviceCategory;
  viewportWidth: number;
  viewportHeight: number;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  language: string;
  timezone: string;
}

export type AnalyticsEventName =
  | "landing_view"
  | "page_engagement"
  | "scroll_depth"
  | "goods_preview_select"
  | "survey_cta_click"
  | "survey_intro_view"
  | "survey_start"
  | "survey_step_view"
  | "survey_step_complete"
  | "survey_step_back"
  | "survey_abandon"
  | "survey_question_view"
  | "survey_question_answered"
  | "survey_complete"
  | "story_start"
  | "story_skip"
  | "production_form_view"
  | "application_review_complete"
  | "application_complete";

export type AnalyticsProperty = string | number | boolean | undefined;

export type AnalyticsProperties = Record<string, AnalyticsProperty>;

export interface AnalyticsEvent {
  eventId: string;
  name: AnalyticsEventName;
  occurredAt: string;
  path: string;
  visitId: string;
  attribution: AttributionContext;
  device: DeviceContext;
  properties: AnalyticsProperties;
}

export interface AnalyticsProvider {
  name: string;
  initialize(): void;
  track(event: AnalyticsEvent): void;
}

export interface SubmissionTrackingContext {
  visitId: string;
  conversionEventId: string;
  capturedAt: string;
  attribution: AttributionContext;
  device: DeviceContext;
  consent: ConsentState;
  engagement: Record<string, number>;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: MetaPixelFunction;
    _fbq?: MetaPixelFunction;
    __PAWEVER_ANALYTICS__?: AnalyticsEvent[];
  }
}

export interface MetaPixelFunction {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  loaded: boolean;
  version: string;
  push: (...args: unknown[]) => void;
}
