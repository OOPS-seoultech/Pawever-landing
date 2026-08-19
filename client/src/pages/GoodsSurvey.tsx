import {
  ArrowRight,
  ChevronDown,
  Hourglass,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { setSurveyPhaseContext, trackEvent } from "@/lib/analytics/analytics";
import { usePageEngagement, useScrollDepth } from "@/lib/analytics/react";
import {
  GOODS_SURVEY_CAPACITY,
  getSurveyCampaign,
  type SurveyCampaign,
} from "@/lib/goodsSurveyApi";
import { GOODS_PRICE, wonText } from "./goodsSurveyContent";
import "./GoodsSurvey.css";

const CAMPAIGN = {
  duration: "약 15분",
  capacity: GOODS_SURVEY_CAPACITY,
  // 서버 응답이 오기 전에 쓰는 값이다. 실제 신청 수를 그대로 보여주기로 했으므로
  // 여기에 임의의 숫자를 두면 화면이 잠깐 사실과 다른 수를 보여준다.
  completed: 0,
} as const;

// 금액은 goodsSurveyContent.ts 한 곳에서만 관리한다. 설문 완료 화면도 같은 값을 쓴다.
const PRICE = GOODS_PRICE;
const won = wonText;
const MEMBER_DISCOUNT = PRICE.list - PRICE.member;

// 회의록 4번: 주요 CTA 문구는 모든 구간에서 같아야 한다.
// 가격 카드와 마지막 배너만 회의록이 따로 지정한 문구를 쓴다.
const CTA_LABEL = "15분 설문하고 얼리버드 가격 받기";

const ASSET_BASE = "/goods-survey";

// 노션 3번: 이동 목적지는 같지만 어느 위치의 버튼이 설문 시작에 효과적인지 봐야 한다.
// 위에서부터 순서대로 btn_A1~A4, 화면 하단 고정 버튼이 btn_B다.
//
// 이벤트 파라미터로만 쓰지 않고 data-cta-id로 DOM에도 내보낸다. Meta 이벤트 설정
// 도구나 GTM 클릭 트리거는 DOM만 보는데, 히어로와 가격 비교 버튼은 클래스도
// 문구도 같아서 식별자가 없으면 둘을 구분하지 못하고 같은 규칙에 겹쳐 잡힌다.
const CTA_IDS = {
  hero: "btn_A1",
  price_comparison: "btn_A2",
  offer: "btn_A3",
  final: "btn_A4",
  sticky: "btn_B",
} as const;

const heroImages = [
  {
    src: "hero-original.png",
    alt: "굿즈 제작에 사용한 반려견 원본 사진",
    label: "원본 사진",
  },
  {
    src: "hero-acrylic.png",
    alt: "반려견 사진으로 만든 아크릴 얼굴 키링",
    label: "아크릴",
  },
  {
    src: "hero-face-keyring.png",
    alt: "반려견 얼굴을 입체적으로 만든 3D 얼굴 키링",
    label: "3D 얼굴",
  },
  {
    src: "hero-fullbody.png",
    alt: "반려견 사진으로 만든 3D 전신 피규어",
    label: "3D 전신",
  },
] as const;

/**
 * 회의록 6-11번의 FAQ 다섯 개. 여기에 임의로 더하지 않는다.
 *
 * 마지막 두 개는 회의록이 카카오톡을 전제로 쓴 문답이다. 연락 수단을
 * 이메일로 유지하기로 해(goods-round2-checklist.md) 채널 이름만 뺐다.
 * 휴대전화·카카오톡으로 전환할 때 회의록 원문대로 되돌린다.
 */
const faqs = [
  {
    question: "1차랑 2차랑 무엇이 다른가요?",
    answer: `1차는 제품 가능성과 보호자 선호를 확인하기 위한 ${CAMPAIGN.capacity}명 한정 체험단이었습니다. 2차부터는 피드백을 반영한 정식 제작으로 전환합니다. 설문에 참여한 분께는 리서치 멤버 가격을 제공합니다.`,
  },
  {
    question: "설문을 하면 반드시 구매해야 하나요?",
    answer:
      "아니요. 설문 완료 후 참여자 가격을 받을 수 있지만 구매 여부는 자유입니다.",
  },
  {
    question: "광고 수신에 동의하지 않으면 할인받을 수 없나요?",
    answer:
      "아니요. 광고 수신 여부는 할인에 영향을 끼치지 않아요. 다만 광고 수신에 동의해주셔야 상품이 공개됐을 때 알림을 받아보실 수 있어요.",
  },
  {
    question: "언제 결제하나요?",
    answer:
      "2차 제작이 열리면 전용 구매 페이지에서 사진과 배송지를 입력하고 결제합니다. 지금은 사진이나 배송지를 받지 않습니다.",
  },
  {
    question: "판매 소식은 어떻게 오나요?",
    answer:
      "판매 오픈과 할인 소식은 광고성 정보 수신에 동의한 채널로만 안내합니다. 구매 후 주문·제작·배송 안내는 정보성 알림으로 따로 받습니다.",
  },
];

function LandingImage({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  return (
    <img
      src={`${ASSET_BASE}/${src}`}
      alt={alt}
      className={className}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
    />
  );
}

function PrimaryCta({
  onClick,
  ctaId,
  label = CTA_LABEL,
  compact = false,
  disabled = false,
}: {
  onClick: () => void;
  ctaId?: string;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-cta-id={ctaId}
      className={`gs-primary-cta${compact ? " gs-primary-cta--compact" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{disabled ? "설문 접수 마감" : label}</span>
      <ArrowRight aria-hidden="true" />
    </button>
  );
}

export default function GoodsSurvey() {
  const [, setLocation] = useLocation();
  // 열려 있으면 어느 버튼에서 왔는지 담는다. 닫혀 있으면 null이다.
  const [ctaPlacement, setCtaPlacement] = useState<keyof typeof CTA_IDS | null>(
    null
  );
  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  const capacity = campaign?.capacity ?? CAMPAIGN.capacity;
  const completed = campaign?.allocated ?? CAMPAIGN.completed;
  const remaining = campaign?.remaining ?? capacity - completed;
  const completedPercent = (completed / capacity) * 100;
  // 설문과 굿즈는 서로 다른 스위치로 열리고 닫힌다. 기본값을 반대로 두는 이유는
  // 각각 틀렸을 때 덜 나쁜 쪽으로 넘어지게 하기 위해서다. 설문이 잘못 열리면
  // 서버가 거부할 뿐이지만, 굿즈가 잘못 열리면 지킬 수 없는 약속이 화면에 뜬다.
  const surveyAvailable = campaign?.surveyOpen ?? true;
  const goodsAvailable = campaign?.goodsOpen ?? false;
  usePageEngagement("goods_survey_landing", "landing_view");
  useScrollDepth("goods_survey_landing");

  /**
   * CTA를 누르면 설문으로 바로 보내지 않고 안내를 한 번 보여준다(회의록 4번).
   *
   * 설문이 15분짜리라, 무엇을 받는지 모른 채 들어가면 중간에 나간다.
   * survey_cta_click은 예전처럼 버튼을 누른 시점에 남긴다. 위치별 버튼 효과를
   * 재는 지표라 그대로 두고, 모달에서 돌아선 사람은 설문 진입 이벤트가 없는
   * 것으로 구분된다.
   */
  const openCta = (placement: keyof typeof CTA_IDS) => {
    if (!surveyAvailable) return;
    trackEvent("survey_cta_click", {
      // 노션 3번이 요구한 버튼 식별자. placement는 사람이 읽기 위해 함께 남긴다.
      cta_id: CTA_IDS[placement],
      cta_placement: placement,
    });
    // 모달이 참여자 가격을 처음 보여주는 자리다. 설문을 마친 뒤 다시 보는
    // 완료 화면과 구분해야 "설문 전 제안"과 "설문 후 자격"을 따로 셀 수 있다.
    trackEvent("member_offer_view", { offer_placement: "cta_modal" });
    setCtaPlacement(placement);
  };

  const startSurvey = () => {
    // wouter는 화면 안에서 경로만 바꾸므로 이 이벤트가 유실될 일은 없다.
    setLocation("/goods-survey/survey");
  };

  /**
   * 설문을 건너뛰고 바로 신청하러 간다.
   *
   * 설문에 답하면 더 싸다는 것을 이미 카드에서 보여준 뒤에 누르는 길이라,
   * 여기서 다시 붙잡지 않는다. 값이 갈리는 것은 서버가 판정한다.
   */
  const startDirectPurchase = () => {
    trackEvent("survey_cta_click", {
      cta_id: CTA_IDS.offer,
      cta_placement: "direct_purchase",
    });
    setLocation("/goods-survey/survey?direct=1");
  };

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void getSurveyCampaign()
        .then(next => {
          if (cancelled) return;
          setCampaign(next);
          // 이후 모든 이벤트가 어느 국면에서 나왔는지 함께 남기도록 심어 둔다.
          setSurveyPhaseContext({
            campaignId: next.campaignId,
            goodsOpen: next.goodsOpen,
          });
        })
        .catch(() => {
          // 조회에 실패하면 아직 아무도 신청하지 않은 상태(0/100)를 그대로 둔다.
          // 실패했다고 임의의 수치를 보여주면 사실과 다른 숫자가 나간다.
        });
    };

    // 남은 자리는 다른 사람의 제출로 계속 줄어든다. 화면을 열어둔 동안에도
    // 최신 수치를 보여주려고 주기적으로, 그리고 탭이 다시 보일 때 다시 조회한다.
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, []);

  useEffect(() => {
    const previousTitle = document.title;
    const existingRobots = document.head.querySelector<HTMLMetaElement>(
      'meta[name="robots"]'
    );
    const previousRobotsContent = existingRobots?.content;
    const robots = existingRobots ?? document.createElement("meta");

    if (!existingRobots) {
      robots.name = "robots";
      document.head.appendChild(robots);
    }

    document.title = "우리 아이 맞춤 굿즈 | Pawever";
    robots.content = "noindex, nofollow";

    return () => {
      document.title = previousTitle;
      if (existingRobots) {
        robots.content = previousRobotsContent ?? "";
      } else {
        robots.remove();
      }
    };
  }, []);

  const scrollToSection = (
    event: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    event.preventDefault();
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="goods-survey-page">
      <div className="gs-phone">
        <header className="gs-topbar">
          <a href="/goods-survey" className="gs-wordmark">
            <img
              src={`${ASSET_BASE}/paw-ever-logo.svg`}
              alt="PAW-EVER"
              width="118"
              height="16"
            />
          </a>
          <span>2차 굿즈 사전 예약중</span>
        </header>

        <section className="gs-section gs-hero">
          <h1>
            {CAMPAIGN.capacity}명의 보호자와 시작한
            <br />
            <em>우리 아이 맞춤 3D 피규어</em>
          </h1>
          <p className="gs-lead">
            1차 체험단은 하루 만에 마감되었습니다.
            <br />
            지금 설문에 참여하면 커스텀 3D 피규어 v.2를
            <br />
            얼리버드 전용가로 만나볼 수 있어요.
          </p>

          <div className="gs-hero-grid">
            {heroImages.map(({ src, alt, label }, index) => (
              <div className="gs-hero-cell" key={label}>
                <LandingImage
                  src={src}
                  alt={alt}
                  className={`gs-hero-image gs-hero-image--${index + 1}`}
                  eager
                />
                <span className="gs-hero-tag">{label}</span>
              </div>
            ))}
          </div>

          <div className="gs-price-headline">
            <p>
              <s>정가 {won(PRICE.list)}</s>
              <strong>설문 참여자 {won(PRICE.member)}</strong>
            </p>
            <small>타사 판매가 {won(PRICE.competitor)} 비교</small>
          </div>
          <PrimaryCta
            ctaId={CTA_IDS.hero}
            onClick={() => openCta("hero")}
            disabled={!surveyAvailable}
          />
        </section>

        <section className="gs-section gs-promise">
          <span className="gs-kicker">1차 결과</span>
          <div className="gs-promise-question">
            <h2>
              1차 체험단 ‘하루만에’
              <br />
              {CAMPAIGN.capacity}명 모집 마감
            </h2>
          </div>
          {/* 회의록 6-2는 이 두 줄만 정했다. 확인된 수치가 아니면 여기에
              숫자를 덧붙이지 않는다. */}
          <div className="gs-promise-answer">
            <strong>
              많은 보호자분이 가장 갖고 싶은 굿즈로 3D 전신 피규어를
              선택했습니다
            </strong>
          </div>
        </section>

        <section className="gs-section gs-price-section">
          <h2>
            사진만 넣으면 된다는
            <br />
            맞춤 굿즈는 많지만,
          </h2>
          <p className="gs-copy">
            {
              "막상 우리 아이의 귀 모양과 털무늬, 자주 짓는 표정까지 닮게 만들기는 어렵습니다."
            }
          </p>

          <LandingImage
            src="price-comparison.png"
            alt="아크릴 얼굴 키링 7,900원대, 3D 얼굴 커스텀 220,000원대, 3D 전신 피규어 210,000원대 가격 비교"
            className="gs-price-comparison"
          />
          <p className="gs-source-note">
            시중 커스텀 제작 A·B·C사 실판매가 기준(2026.07)
          </p>
          {/* "왜 설문 참여자가 더 저렴한가"는 아래 Offer 단락에서 따로 다룬다.
              여기서 먼저 말하면 중복이고, 제작비 지원을 시간과 맞바꾸는 것처럼
              읽힌다. 회의록 6-6이 구분하라고 못 박은 지점이다. */}
          <PrimaryCta
            ctaId={CTA_IDS.price_comparison}
            onClick={() => openCta("price_comparison")}
            disabled={!surveyAvailable}
          />
        </section>

        <section className="gs-section gs-emotion">
          <h2>
            갖고 싶은 건 흔한 강아지 피규어가 아니라
            <br />
            우리 가족만 알아보는 ‘우리 아이의 모습’이니까요.
          </h2>
          {/* 회의록 6-4는 이 제목만 정했다. 1차 랜딩의 본문은 걷어냈다. */}
          <div className="gs-story-stack">
            <LandingImage
              src="story-phone-figure.png"
              alt="휴대폰 속 반려견 사진과 완성된 전신 피규어"
            />
            <LandingImage
              src="story-photo-keyring.png"
              alt="반려견 원본 사진과 완성된 얼굴 키링"
            />
            <LandingImage
              src="story-dalmatian.png"
              alt="반려견 원본 사진과 완성된 아크릴 얼굴 키링"
            />
          </div>
        </section>

        <section className="gs-section gs-process" id="process">
          <h2>사진에서 아이의 특징을 찾아 만듭니다.</h2>

          {/* 회의록 6-5가 정한 네 단계. 설명을 덧붙이지 않는다. */}
          <div className="gs-process-list">
            {[
              ["01", "얼굴·전신 사진 3장 제출"],
              ["02", "귀·얼굴형·털색·자세 특징 정리"],
              ["03", "3D 모델 제작 및 출력"],
              ["04", "수작업 검수 후 발송"],
            ].map(([number, title]) => (
              <div className="gs-process-step" key={number}>
                <span aria-hidden="true" />
                <div>
                  <strong>
                    {number}. {title}
                  </strong>
                </div>
              </div>
            ))}
          </div>

          <LandingImage
            src="process-reference.png"
            alt="반려견 원본 사진, 3D 모델링 화면, 완성 피규어로 이어지는 제작 과정"
            className="gs-process-visual"
          />
          <p className="gs-process-note">
            * AI가 사진을 그대로 복제하는 방식은 아닙니다.
            <br />
            제작 방식과 사진 상태에 따라 차이가 생길 수 있어요.
          </p>
        </section>

        <section className="gs-section gs-story-copy">
          <span className="gs-kicker">왜 설문 참여자는 더 저렴한가요?</span>
          <h2>여러분의 이야기가 제품과 서비스를 더 정확하게 만듭니다.</h2>
          <LandingImage
            src="why-free.png"
            alt="소파에서 반려견과 편안한 시간을 보내는 보호자"
            className="gs-why-free-image"
          />
          <p>
            포에버는 반려견의 작은 변화를 기록하고, 필요한 돌봄을 제때
            준비하도록 돕는 서비스를 만들고 있습니다.
          </p>
          <strong>
            설문 참여자의 경험은
            <br />
            제품 선택과 서비스 설계에 직접 쓰입니다
          </strong>
          {/* 민감 문항 예고는 설문 안내 화면(goodsSurveyContent.ts)에 남겨 두었다.
              랜딩에서 뺐으므로 그쪽 문구는 지우면 안 된다. 아무 예고 없이
              노화·이별에 관한 질문을 마주하게 된다. */}
          <p>그 기여에 대한 감사로 2차 제작비 일부를 지원합니다.</p>
        </section>

        {/* 굿즈가 열려 있으면 남은 자리를, 닫혀 있으면 2차 가격을 보여준다.
            줄 수 없는 것을 준다고 말하지 않으려면 두 화면이 갈라져야 한다. */}
        <section className="gs-section" id="offer">
          {goodsAvailable ? (
            <div
              className="gs-remaining-card"
              data-remaining={remaining}
              aria-label={`선착순 ${capacity}명 중 ${remaining}명 남음`}
            >
              <span>
                <Hourglass aria-hidden="true" />
                선착순 {capacity}명 한정
              </span>
              <h2>
                지금 <em>{remaining}명</em>만 더 받을 수 있어요!
              </h2>
              <div
                className="gs-remaining-progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={capacity}
                aria-valuenow={completed}
              >
                <i style={{ width: `${completedPercent}%` }} />
              </div>
              <p>
                <span>{completed}명 신청 완료</span>
                <span>
                  남은 자리 {remaining} / {capacity}
                </span>
              </p>
            </div>
          ) : (
            <div className="gs-offer-cards">
              <div className="gs-offer-card is-member">
                <span>설문 참여자</span>
                <strong>{won(PRICE.member)}</strong>
                <ul>
                  <li>{CAMPAIGN.duration} 설문 완료</li>
                  <li>2차 오픈 시 전용 구매 링크 제공</li>
                </ul>
                <PrimaryCta
                  ctaId={CTA_IDS.offer}
                  onClick={() => openCta("offer")}
                  label="설문하고 멤버가 받기"
                  compact
                  disabled={!surveyAvailable}
                />
              </div>
              <div className="gs-offer-card">
                <span>일반 구매자</span>
                <strong>{won(PRICE.list)}</strong>
                <ul>
                  <li>설문 없이 바로 신청</li>
                  <li>신청 후 문자로 입금 계좌 안내</li>
                </ul>
                <PrimaryCta
                  ctaId={CTA_IDS.offer}
                  onClick={startDirectPurchase}
                  label="바로 신청하기"
                  compact
                  disabled={!goodsAvailable}
                />
              </div>
              <p className="gs-source-note">
                배송비 {won(PRICE.shipping)} 별도 · 2차 수량 한정
              </p>
            </div>
          )}
        </section>

        <section className="gs-section gs-timeline-section">
          <span className="gs-kicker">왜 계속 설문을 받나요?</span>
          <h2>
            반려견의 변화는
            <br />
            모든 가족에게 다르게 찾아옵니다.
          </h2>
          <p className="gs-copy">
            {
              "언제 변화를 느꼈고 무엇이 필요했는지 알아야, 포에버가 필요한 순간에 자연스럽게 도움을 건넬 수 있습니다."
            }
          </p>
          {/* 회의록 6-9가 정한 다섯 단계. 설명을 덧붙이지 않는다. */}
          <div className="gs-timeline">
            {[
              ["1", "약 15분 설문 참여"],
              ["2", "설문 참여자 가격 즉시 확인"],
              ["3", "광고성 정보 수신 여부 선택"],
              ["4", "2차 오픈 시 전용 링크 확인"],
              ["5", "구매할 경우 사진·배송지 입력 후 결제"],
            ].map(([number, title]) => (
              <div className="gs-timeline-item" key={number}>
                {/* 순서는 왼쪽 원 안의 숫자가 이미 말한다. */}
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="gs-section gs-privacy-summary">
          <h2>
            설문 응답과 연락처는
            <br />
            필요한 목적에만 사용합니다.
          </h2>
          {/* 회의록 6-10의 목록. 연락 수단은 휴대전화 전환을 미루고
              이메일을 유지하기로 해, 그 항목만 실제 수집값으로 적는다. */}
          <ul>
            <li>설문 응답: 서비스 연구와 통계 분석</li>
            <li>이메일 주소: 참여자 식별과 선택한 알림 발송</li>
            <li>반려견 사진: 구매 후 피규어 제작</li>
            <li>배송지: 구매가 확정된 뒤 배송 목적</li>
            <li>광고·SNS 활용: 별도 선택 동의</li>
          </ul>
        </section>

        <section className="gs-section gs-faq-section">
          <span className="gs-kicker">미리 답해드릴게요</span>
          <h2>참여 전에 궁금한 점</h2>
          <div className="gs-faq-list">
            {faqs.map(({ question, answer }, index) => (
              <details key={question} open={index === 0}>
                <summary>
                  {question}
                  <ChevronDown aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="gs-section" id="safety">
          <div className="gs-safety">
            <ShieldCheck aria-hidden="true" />
            <div>
              <h2>보호자용 키링 또는 전시용 굿즈로 사용해 주세요.</h2>
              <ul>
                <li>모든 굿즈는 반려동물용 장난감이나 식용 제품이 아닙니다.</li>
                <li>
                  반려견이 물거나 삼키지 못하도록 손이 닿지 않는 곳에 보관해
                  주세요.
                </li>
                <li>
                  목걸이 네임택 사용 여부는 무게·돌출부·연결 상태를 보호자가
                  확인해 판단해 주세요. 안전을 위해 보호자 키링 활용을 우선
                  권장합니다.
                </li>
                <li>3D 얼굴 키캡형은 결합 부품이 빠질 수 있습니다.</li>
                <li>
                  3D 프린팅 제품은 적층 결·미세한 표면 차이·돌출부가 있을 수
                  있습니다.
                </li>
                <li>
                  레진 전신 피규어는 약 5~6cm 전시용 제품으로, 충격·열에 주의해
                  주세요.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="gs-section gs-final" id="survey-start">
          <LandingImage
            src="final-banner.png"
            alt="반려견 원본 사진과 완성된 얼굴 키링 두 종류"
            className="gs-final-image"
          />
          <h2>
            15분으로 반려동물 문화에 기여하고,
            <br />
            우리 아이의 모습을 더 오래 남겨보세요.
          </h2>
          <PrimaryCta
            ctaId={CTA_IDS.final}
            onClick={() => openCta("final")}
            label={`설문하고 -${won(MEMBER_DISCOUNT)} 혜택 받기`}
            disabled={!surveyAvailable}
          />
          <p className="gs-cta-meta">
            설문 완료 즉시 참여자 자격 부여 · 구매 의무 없음 · 광고 수신 선택
          </p>
        </section>

        <footer className="gs-footer">
          <nav aria-label="페이지 내 안내">
            <a
              href="#process"
              onClick={event => scrollToSection(event, "process")}
            >
              제작 과정 다시보기
            </a>
            <a
              href="#safety"
              onClick={event => scrollToSection(event, "safety")}
            >
              제품 안전 안내
            </a>
          </nav>
          <p>
            서울과학기술대학교 창업팀이 만드는 반려인 서비스. 포에버 (PAW-EVER)
            <br />
            <Link href="/contact">문의하기</Link>
          </p>
        </footer>

        <div className="gs-stickybar">
          <button
            type="button"
            data-cta-id={CTA_IDS.sticky}
            onClick={() => openCta("sticky")}
            disabled={!surveyAvailable}
          >
            <span>
              {surveyAvailable ? CTA_LABEL : "설문 접수 마감"}
              <small>설문 완료 즉시 참여자 자격 부여 · 구매 의무 없음</small>
            </span>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* 회의록 5번의 안내 모달. 15분을 들이기 전에 무엇을 받는지 먼저 보여준다. */}
      {ctaPlacement && (
        <div
          className="gs-modal-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.currentTarget === event.target) setCtaPlacement(null);
          }}
        >
          <section
            className="gs-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gs-cta-modal-title"
          >
            <button
              type="button"
              className="gs-modal-close"
              onClick={() => setCtaPlacement(null)}
              aria-label="닫기"
            >
              <X aria-hidden="true" />
            </button>
            <h2 id="gs-cta-modal-title">
              설문을 완료하면
              <br />
              2차 멤버가로 구매할 수 있어요
            </h2>
            <p>
              1차 무료 체험단 {CAMPAIGN.capacity}명의 선택에서 4명 중 한 명이 3D
              전신 피규어를 선택했어요. 더 나은 결과물을 만들기 위해 여러분의
              이야기를 계속 듣고 있어요.
            </p>
            <div className="gs-modal-price">
              <span>{CAMPAIGN.duration} 설문을 완료하면</span>
              <p>
                <s>정가 {won(PRICE.list)}</s>
                <small>타사 판매가 {won(PRICE.competitor)}</small>
              </p>
              <strong>설문 참여자 전용가 {won(PRICE.member)}</strong>
            </div>
            <p className="gs-modal-terms">
              배송비 별도 · 2차 수량 한정 · 설문 완료 즉시 참여자 자격 부여
            </p>
            <PrimaryCta
              onClick={startSurvey}
              label={`설문하고 ${won(PRICE.member)} 혜택 받기`}
            />
            <button
              type="button"
              className="gs-modal-secondary"
              onClick={() => {
                setCtaPlacement(null);
                document
                  .getElementById("process")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              제품과 제작 과정 더 보기
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
