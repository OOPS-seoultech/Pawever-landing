import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { hasConfiguredExternalAnalytics } from "@/lib/analytics/config";
import {
  EXTERNAL_ANALYTICS_CONSENT_CHOICES,
  getConsentState,
  setConsentState,
  subscribeConsent,
} from "@/lib/analytics/consent";
import "./AnalyticsConsent.css";

const useConsentSnapshot = () => {
  const [consent, setConsent] = useState(getConsentState);

  useEffect(() => subscribeConsent(setConsent), []);
  return consent;
};

export function AnalyticsPreferenceControls() {
  const consent = useConsentSnapshot();

  return (
    <div className="analytics-preferences">
      <p>
        현재 설정: 외부 방문 분석 {consent.analytics ? "허용" : "사용 안 함"}
      </p>
      <div>
        <button
          type="button"
          onClick={() =>
            setConsentState(EXTERNAL_ANALYTICS_CONSENT_CHOICES.allow)
          }
        >
          방문 분석 허용
        </button>
        <button
          type="button"
          onClick={() =>
            setConsentState(EXTERNAL_ANALYTICS_CONSENT_CHOICES.decline)
          }
        >
          외부 분석 사용 안 함
        </button>
      </div>
    </div>
  );
}

export default function AnalyticsConsent() {
  const [, setLocation] = useLocation();
  const consent = useConsentSnapshot();

  if (!hasConfiguredExternalAnalytics || consent.decidedAt) return null;

  return (
    <aside
      className="analytics-consent"
      aria-label="외부 방문 분석 사용 안내"
      aria-live="polite"
    >
      <strong>서비스 개선을 위한 방문 분석</strong>
      <p>
        허용하면 Google Analytics 4로 유입 경로(UTM), 페이지 활성 이용시간, 기기
        유형과 설문 진행 단계를 측정합니다. 설문을 시작하면 자체 연구를 위해
        유입 경로, 기기 유형, 응답 소요시간이 무작위 응답 ID와 함께 Pawever
        내부에 저장됩니다. 설문 답변과 제작·배송 정보는 Google로 보내지
        않습니다.
      </p>
      <div>
        <button
          type="button"
          className="analytics-consent__accept"
          onClick={() =>
            setConsentState(EXTERNAL_ANALYTICS_CONSENT_CHOICES.allow)
          }
        >
          방문 분석 허용
        </button>
        <button
          type="button"
          onClick={() =>
            setConsentState(EXTERNAL_ANALYTICS_CONSENT_CHOICES.decline)
          }
        >
          외부 분석 없이 계속
        </button>
        <button
          type="button"
          className="analytics-consent__link"
          onClick={() => setLocation("/privacy")}
        >
          자세히 보기
        </button>
      </div>
    </aside>
  );
}
