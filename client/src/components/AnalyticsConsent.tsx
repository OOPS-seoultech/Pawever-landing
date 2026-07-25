import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { hasConfiguredAnalyticsTags } from "@/lib/analytics/config";
import {
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
        현재 설정: 분석 {consent.analytics ? "허용" : "거부"} · 광고 측정{" "}
        {consent.marketing ? "허용" : "거부"}
      </p>
      <div>
        <button
          type="button"
          onClick={() => setConsentState({ analytics: true, marketing: true })}
        >
          모두 허용
        </button>
        <button
          type="button"
          onClick={() => setConsentState({ analytics: true, marketing: false })}
        >
          분석만 허용
        </button>
        <button
          type="button"
          onClick={() =>
            setConsentState({ analytics: false, marketing: false })
          }
        >
          모두 거부
        </button>
      </div>
    </div>
  );
}

export default function AnalyticsConsent() {
  const [, setLocation] = useLocation();
  const consent = useConsentSnapshot();

  if (!hasConfiguredAnalyticsTags || consent.decidedAt) return null;

  return (
    <aside
      className="analytics-consent"
      aria-label="분석 쿠키 사용 안내"
      aria-live="polite"
    >
      <strong>방문 분석을 허용하시겠어요?</strong>
      <p>
        선택 동의하면 광고 유입 경로, 페이지 활성 이용시간, 기기 유형을 GA4와
        Meta에서 측정합니다. 설문 진행 복원과 자체 연구에 필요한 가명 응답
        ID 기반 유입·활성 정보는 Pawever 내부에 저장되며, 설문 답변과
        제작·배송 정보는 외부 분석 도구로 보내지 않습니다.
      </p>
      <div>
        <button
          type="button"
          className="analytics-consent__accept"
          onClick={() => setConsentState({ analytics: true, marketing: true })}
        >
          모두 허용
        </button>
        <button
          type="button"
          onClick={() => setConsentState({ analytics: true, marketing: false })}
        >
          분석만 허용
        </button>
        <button
          type="button"
          onClick={() =>
            setConsentState({ analytics: false, marketing: false })
          }
        >
          필수만
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
