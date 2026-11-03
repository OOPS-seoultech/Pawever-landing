import { ArrowRight, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { setSurveyPhaseContext, trackEvent } from "@/lib/analytics/analytics";
import { usePageEngagement, useScrollDepth } from "@/lib/analytics/react";
import { getSurveyCampaign, type SurveyCampaign } from "@/lib/goodsSurveyApi";
import { saveGoodsSurveyPhotoHandoff } from "@/lib/goodsSurveyPhotoHandoff";
import { PhotoIntakeCard, PrimaryCta } from "./goodsSurveyIntake";
import { GoodsDeliveryGallery } from "./goodsDeliveryGallery";
import { GOODS_PRICE, wonText } from "./goodsSurveyContent";
import "./GoodsSurvey.css";
const PRICE = GOODS_PRICE;
const won = wonText;

const ASSET_BASE = "/goods-survey";

const INTAKE_HEADING = "추가해주세요.";

const CTA_IDS = {
  hero: "btn_A1",
  purchase_now: "btn_A2",
  final: "btn_A5",
  sticky: "btn_B",
} as const;

type Placement = keyof typeof CTA_IDS;

type FigureSlot = {
  src: string;
  alt: string;
  w: number;
  h: number;
};

const FIGURES: Record<string, FigureSlot> = {
  hero: {
    src: "flea-hero.webp",
    alt: "크림색 포메라니안과 같은 모습을 본뜬 작은 전신 피규어",
    w: 732,
    h: 549,
  },
  whyNow: {
    src: "flea-why-now.webp",
    alt: "반려견 사진과 같은 특징을 살려 만든 피규어",
    w: 730,
    h: 548,
  },
  figureCompare: {
    src: "flea-figure-3d.webp",
    alt: "반려견의 특징을 정리한 맞춤 피규어 네 방향 모습",
    w: 388,
    h: 388,
  },
  figureReal: {
    src: "flea-figure-real.webp",
    alt: "실제 반려견 모습을 참고해 만든 비교 이미지",
    w: 290,
    h: 386,
  },
  figureHand: {
    src: "flea-hand.webp",
    alt: "손 위에 올려둔 완성 피규어 넷",
    w: 656,
    h: 412,
  },
  proof: {
    src: "flea-proof-overlay.webp",
    alt: "책상 위 사진 곁에 놓인 작은 반려견 피규어",
    w: 752,
    h: 564,
  },
  modeling: {
    src: "flea-modeling.webp",
    alt: "모니터 위에서 반려견 3D 모델을 다듬는 작업 화면",
    w: 732,
    h: 438,
  },
  printing: {
    src: "flea-printing.webp",
    alt: "피규어를 제작하는 3D 출력기",
    w: 732,
    h: 400,
  },
  stepFace: {
    src: "flea-step-photo-1.webp",
    alt: "반려견 얼굴 사진",
    w: 228,
    h: 304,
  },
  stepBody: {
    src: "flea-step-photo-2.webp",
    alt: "반려견 전신 사진",
    w: 204,
    h: 306,
  },
  stepCoat: {
    src: "flea-step-photo-3.webp",
    alt: "반려견 털색과 무늬 사진",
    w: 204,
    h: 306,
  },
  stepTrait: {
    src: "flea-step-4view.webp",
    alt: "반려견의 앞·옆·뒤 모습을 정리한 2D 4면도",
    w: 640,
    h: 320,
  },
  stepPrint: {
    src: "flea-step-3d.webp",
    alt: "3D 모델링 화면과 출력 중인 피규어",
    w: 660,
    h: 716,
  },
  stepFinish: {
    src: "flea-step-finish.webp",
    alt: "작은 반려견 피규어를 손으로 정교하게 마감하는 작업 장면",
    w: 721,
    h: 961,
  },
  limited: {
    src: "flea-limited.webp",
    alt: "여러 종류의 완성 반려견 피규어가 진열된 모습",
    w: 780,
    h: 523,
  },
  final: {
    src: "flea-final.webp",
    alt: "반려견 사진과 함께 책상 위에 놓인 작은 맞춤 피규어",
    w: 732,
    h: 549,
  },
};

const faqs = [
  {
    question: "사진은 어떤 걸 보내야 하나요?",
    answer:
      "얼굴, 전신, 털색과 무늬가 잘 보이는 사진이면 좋아요. 1장부터 낼 수 있고, 많을수록 실제 모습에 가깝게 만들어요.",
  },
  {
    question: "실제 반려견과 얼마나 비슷하게 나오나요?",
    answer:
      "사진 속 특징을 최대한 반영하지만 사진 화질과 출력 특성에 따라 일부 차이가 있을 수 있습니다.",
  },
  {
    question: "한 달에 몇 건 제작하나요?",
    answer: "한 달에 100건씩 제작하며, 한 아이씩 특징을 확인하고 검수합니다.",
  },
  {
    question: "배송비와 제작 기간은 어떻게 되나요?",
    answer: `서울과학기술대학교 상상관에서 수령하면 배송비가 없고, 택배는 ${won(PRICE.shipping)}이 별도입니다. 제작은 5일에서 최대 3주가 소요됩니다.`,
  },
  {
    question: "광고 수신에 동의해야 할인받을 수 있나요?",
    answer: "아니요. 광고성 정보 수신 동의는 선택 사항입니다.",
  },
];

const processSteps = [
  {
    number: "01",
    title: "사진 1~5장",
    caption: "얼굴·전신·무늬가 잘 보이는 사진",
    figures: [FIGURES.stepFace, FIGURES.stepBody, FIGURES.stepCoat],
  },
  {
    number: "02",
    title: "특징 정리",
    caption: "귀·얼굴형·털색·체형 확인",
    figures: [FIGURES.stepTrait],
  },
  {
    number: "03",
    title: "3D 제작",
    caption: "모델링부터 출력까지 여러 작업 장면",
    figures: [FIGURES.stepPrint, FIGURES.modeling, FIGURES.printing],
  },
  {
    number: "04",
    title: "수작업 검수",
    caption: "세척·표면 마감·상태 확인 후 포장",
    figures: [FIGURES.stepFinish],
  },
];

function LandingFigure({
  slot,
  className = "",
}: {
  slot: FigureSlot;
  className?: string;
}) {
  return (
    <img
      src={`${ASSET_BASE}/${slot.src}`}
      alt={slot.alt}
      className={`gs-figure ${className}`.trim()}
      width={slot.w}
      height={slot.h}
      decoding="async"
    />
  );
}

export default function GoodsSurvey() {
  const [, setLocation] = useLocation();
  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  const goodsAvailable = campaign?.goodsOpen ?? false;
  usePageEngagement("goods_survey_landing", "landing_view");
  useScrollDepth("goods_survey_landing");

  const startDirectPurchase = (placement: Placement) => {
    trackEvent("survey_cta_click", {
      cta_id: CTA_IDS[placement],
      cta_placement: `${placement}_direct_purchase`,
    });
    setLocation("/goods-survey/order");
  };

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void getSurveyCampaign()
        .then(next => {
          if (cancelled) return;
          setCampaign(next);
          setSurveyPhaseContext({
            campaignId: next.campaignId,
            goodsOpen: next.goodsOpen,
          });
        })
        .catch(() => {});
    };
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

    document.title = "우리 아이 맞춤 3D 전신 피규어 | Pawever";
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

  const buyCta = (placement: Placement, label: string, compact = false) =>
    goodsAvailable ? (
      <PrimaryCta
        ctaId={CTA_IDS[placement]}
        onClick={() => startDirectPurchase(placement)}
        label={label}
        compact={compact}
      />
    ) : (
      <p className="gs-note">지금은 주문을 받지 않아요</p>
    );

  return (
    <main className="goods-survey-page">
      <div className="gs-phone">
        <header className="gs-topbar">
          <a href="/" className="gs-wordmark">
            <img
              src={`${ASSET_BASE}/paw-ever-logo.svg`}
              alt="PAW-EVER"
              width="118"
              height="16"
            />
          </a>
          <span>우리 아이 맞춤 피규어</span>
        </header>
        <section className="gs-section gs-hero" id="order">
          <span className="gs-kicker">01 ORDER</span>
          <h1>
            오늘의 모습은
            <br />
            지금만 남길 수 있으니까.
          </h1>
          <p className="gs-lead">
            우리 아이 사진으로 만드는
            <br />
            세상에 하나뿐인 3D 전신 피규어
          </p>

          <LandingFigure slot={FIGURES.hero} className="gs-figure--wide" />

          <div className="gs-product-card">
            <span>PAWEVER 커스텀 3D 전신 피규어</span>
            <s>기존 판매가 {won(PRICE.list)}</s>
            <strong>{won(PRICE.presale)}</strong>
            <small>
              배송비 {won(PRICE.shipping)} 별도 · 사진 1~5장 제출 · 수작업 검수
            </small>
          </div>

          {buyCta("hero", `${won(PRICE.presale)}에 우리 아이 피규어 구매하기`)}
        </section>

        <section className="gs-section gs-why-now">
          <span className="gs-kicker">02 WHY NOW</span>
          <h2>
            300장도 넘는 사진
            <br />
            그중 가장 <em>우리 아이다운 모습</em>을
            <br />
            작품으로 남겨보세요.
          </h2>
          <p className="gs-copy">
            매일 보던 표정, 살짝 접힌 귀, 털끝의 작은 무늬. 지금은 너무 익숙해서
            지나치는 모습들이 언젠가 가장 보고싶은 장면이 되기도 합니다.
          </p>

          <LandingFigure slot={FIGURES.whyNow} className="gs-figure--wide" />
          <div className="gs-quotes">
            {[
              {
                avatar: "voice-avatar-1.webp",
                who: "12135 님",
                stars: 5,
                text: "그때 사진을 더 찍어둘걸, 조금 더 많이 남겨둘걸 생각하게 되더라고요",
              },
              {
                avatar: "voice-avatar-2.webp",
                who: "12135 님",
                stars: 4,
                text: "잘받았습니다 우리애기랑 비슷하게 생겨서 너무 귀여워요 :)",
              },
            ].map(({ avatar, who, stars, text }) => (
              <blockquote key={avatar}>
                <header>
                  <img
                    className="gs-voice-avatar"
                    src={`${ASSET_BASE}/${avatar}`}
                    alt=""
                    width="34"
                    height="34"
                    decoding="async"
                  />
                  <cite>{who}</cite>
                  <span
                    className="gs-voice-stars"
                    aria-label={`별점 ${stars}점`}
                  >
                    <i>{"★".repeat(5 - stars)}</i>
                    {"★".repeat(stars)}
                  </span>
                </header>
                <p>{text}</p>
              </blockquote>
            ))}
          </div>

          <p className="gs-why-now-close">
            그래서 포에버는 그냥 ‘강아지 피규어’가 아니라
            <br />
            세상에 하나뿐인 우리 아이의 모습을 만듭니다.
          </p>
        </section>

        <section className="gs-section gs-the-figure">
          <span className="gs-kicker">03 THE FIGURE</span>
          <h2>
            가족끼리만 알아보는
            <br />
            우리 아이만의 특징까지.
          </h2>
          <p className="gs-copy">
            같은 견종이어도 얼굴형, 귀 모양, 털색과 무늬, 체형은 모두 다르니까,
            사진 속 특징을 최대한 찾아 3D 형태로 옮깁니다.
          </p>

          <div className="gs-figure-compare">
            <LandingFigure slot={FIGURES.figureReal} />
            <img
              src={`${ASSET_BASE}/flea-figure-arrow.webp`}
              alt=""
              width="29"
              height="29"
              decoding="async"
            />
            <LandingFigure slot={FIGURES.figureCompare} />
          </div>
          <p className="gs-note">
            * 반려견 비교 이미지 일부는 AI 대체 이미지입니다.
          </p>
          <LandingFigure
            slot={FIGURES.figureHand}
            className="gs-figure--wide"
          />

          <div className="gs-badges">
            {["접힌 귀", "입 주변 털", "꼬리 무늬"].map(trait => (
              <span key={trait}>{trait}</span>
            ))}
          </div>
        </section>

        <section className="gs-section gs-proof">
          <span className="gs-kicker">04 PROOF</span>
          <h2>한 달에 100건씩 제작 중</h2>
          <p className="gs-copy">
            한 아이씩 사진 속 특징을 살피고, 모델링·출력·검수까지 직접
            진행합니다.
          </p>
          <h3 className="gs-customer-review-heading">실제 고객 후기</h3>
          <div className="gs-customer-reviews">
            {[1, 2, 3, 4].map(number => (
              <img
                key={number}
                src={`${ASSET_BASE}/customer-review-${number}.jpg`}
                alt={`실제 고객 후기 ${number}: 반려동물과 맞춤 피규어 사진`}
                width="600"
                height="1067"
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
          <LandingFigure slot={FIGURES.proof} className="gs-figure--wide" />
          <p className="gs-note">
            ※ 사진의 화질·각도와 3D 출력 특성에 따라 실제 반려동물과 색상 및
            형태에 일부 차이가 있을 수 있습니다.
          </p>
        </section>

        <section className="gs-section gs-process" id="process">
          <span className="gs-kicker">05 PROCESS</span>
          <h2>한 아이씩 한땀한땀, 천천히.</h2>
          <p className="gs-copy">
            빠르게 많이 만드는 것보다, 사진 속 특징을 놓치지 않는 과정을
            우선합니다.
          </p>

          <div className="gs-steps">
            {processSteps.map(({ number, title, caption, figures }) => (
              <article className="gs-step" key={number}>
                <span className="gs-step-number">{number}</span>
                <h3>{title}</h3>
                <p>{caption}</p>
                <div
                  className={`gs-step-figures${
                    number === "01" ? " is-triple" : ""
                  }`}
                >
                  {figures.map(slot => (
                    <LandingFigure key={slot.src} slot={slot} />
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="gs-section gs-limited">
          <span className="gs-kicker">06 LIMITED</span>
          <h2>한 아이씩, 꼼꼼하게 제작합니다.</h2>
          <p className="gs-copy">
            사진을 보고 특징을 정리하고, 출력 상태를 하나씩 확인해야 하는 맞춤
            제작입니다. 한 달에 100건씩, 직접 살피고 검수합니다.
          </p>

          <div className="gs-limit-card">
            <span>한 달 제작 수량</span>
            <strong>100건</strong>
            <small>
              사진 속 작은 특징부터 완성된 피규어의 상태까지 하나씩 확인합니다.
            </small>
          </div>

          <LandingFigure slot={FIGURES.limited} className="gs-figure--wide" />
          <GoodsDeliveryGallery />
        </section>

        <section className="gs-section gs-purchase" id="offer">
          <span className="gs-kicker">07 PURCHASE</span>
          <h2>우리 아이의 모습을 실물로 남겨보세요.</h2>
          <article className="gs-buy-card">
            <h3>우리 아이 피규어</h3>
            <s>기존 판매가 {won(PRICE.list)}</s>
            <strong>{won(PRICE.presale)}</strong>
            {buyCta("purchase_now", `${won(PRICE.presale)}에 구매하기`, true)}
          </article>
          <p className="gs-note">
            서울과학기술대학교 상상관 수령 또는 택배 배송 선택 · 배송비{" "}
            {won(PRICE.shipping)} 별도
          </p>
        </section>

        <section className="gs-section gs-final" id="order-photos">
          <span className="gs-kicker">08 FINAL</span>
          <h2>
            지금의 우리 아이를,
            <br />
            지금 남겨두세요.
          </h2>
          <p className="gs-copy">
            오래 곁에 두고 싶은 모습 하나를 작은 피규어로 만들어드립니다.
          </p>

          <LandingFigure slot={FIGURES.final} className="gs-figure--wide" />

          <p className="gs-note">배송비 별도 · 준비 수량 소진 시 마감</p>
          {goodsAvailable ? (
            <PhotoIntakeCard
              ctaId={CTA_IDS.final}
              heading={INTAKE_HEADING}
              onSubmit={files => {
                saveGoodsSurveyPhotoHandoff(files);
                startDirectPurchase("final");
              }}
            />
          ) : (
            <p className="gs-note">지금은 주문을 받지 않아요</p>
          )}
        </section>
        <section className="gs-section gs-faq-section" id="faq">
          <span className="gs-kicker">09 FAQ</span>
          <h2>자주 묻는 질문</h2>
          <div className="gs-faq-list">
            {faqs.map(({ question, answer }) => (
              <details key={question}>
                <summary>
                  {question}
                  <i className="gs-faq-toggle" aria-hidden="true" />
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

        <section className="gs-section gs-privacy-summary">
          <h2>
            제작 정보와 연락처는
            <br />
            필요한 목적에만 사용합니다.
          </h2>
          <ul>
            <li>반려견 사진: 구매 후 피규어 제작</li>
            <li>배송지: 택배 수령을 선택한 경우 배송 목적</li>
            <li>광고·SNS 활용: 별도 선택 동의</li>
          </ul>
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
          {goodsAvailable ? (
            <button
              type="button"
              data-cta-id={CTA_IDS.sticky}
              onClick={() => startDirectPurchase("sticky")}
            >
              <span>
                {won(PRICE.presale)}에 구매하기
                <small>상상관 수령 또는 택배 배송 · 배송비 별도</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <button type="button" disabled>
              <span>지금은 주문을 받지 않아요</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
