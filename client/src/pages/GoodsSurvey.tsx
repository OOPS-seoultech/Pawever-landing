import {
  ArrowRight,
  Check,
  ChevronDown,
  Hourglass,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { setSurveyPhaseContext, trackEvent } from "@/lib/analytics/analytics";
import { usePageEngagement, useScrollDepth } from "@/lib/analytics/react";
import {
  GOODS_SURVEY_CAPACITY,
  GOODS_UNSELECTED,
  getSurveyCampaign,
  type SurveyCampaign,
} from "@/lib/goodsSurveyApi";
import "./GoodsSurvey.css";

const CAMPAIGN = {
  duration: "약 15분",
  capacity: GOODS_SURVEY_CAPACITY,
  // 서버 응답이 오기 전에 쓰는 값이다. 실제 신청 수를 그대로 보여주기로 했으므로
  // 여기에 임의의 숫자를 두면 화면이 잠깐 사실과 다른 수를 보여준다.
  completed: 0,
  // 1차 무료 체험단 모집 기간. 이미 지난 일정이라 기록으로만 쓴다.
  firstRoundPeriod: "2026.07.23 ~ 08.05",
} as const;

const ASSET_BASE = "/goods-survey";

// 노션 3번: 이동 목적지는 같지만 어느 위치의 버튼이 설문 시작에 효과적인지 봐야 한다.
// 위에서부터 순서대로 btn_A1~A4, 화면 하단 고정 버튼이 btn_B다.
const CTA_IDS = {
  hero: "btn_A1",
  price_comparison: "btn_A2",
  goods_options: "btn_A3",
  final: "btn_A4",
  sticky: "btn_B",
} as const;

type GoodsOption = {
  id: string;
  image?: string;
  imageAlt?: string;
  eyebrow: string;
  name: string;
  description: string;
  use?: string;
  detailLabel?: string;
  note?: string;
};

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

const goods: readonly GoodsOption[] = [
  {
    id: "acrylic",
    image: "product-acrylic.png",
    imageAlt: "아크릴 얼굴 키링 제작 예시",
    eyebrow: "가장 가벼운",
    name: "아크릴 얼굴",
    description:
      "사진 속 얼굴을 깔끔하게 살린 가장 가벼운 형태예요. 일상의 소지품에 우리 아이의 미소를 더해보세요.",
    use: "보호자 키링 · 조건 확인 후 네임택",
    detailLabel: "특징",
    note: "가볍고 휴대가 편해요",
  },
  {
    id: "face",
    image: "product-keycap.png",
    imageAlt: "3D 얼굴 키캡형 제작 예시",
    eyebrow: "입체감이 귀여운",
    name: "3D 얼굴 키캡형",
    description:
      "우리 아이 얼굴을 입체적으로 표현해요. 기계식 키보드에 장착하거나 전용 고리로 휴대할 수 있어요.",
    use: "보호자 키링",
    detailLabel: "주의",
    note: "키캡이 빠질 수 있으니 키링 활용을 권장해요.",
  },
  {
    id: "backplate",
    image: "product-backplate.png",
    imageAlt: "사각 뒷판형 3D 얼굴키링 앞면과 뒷면 제작 예시",
    eyebrow: "이름·연락처 추가 가능",
    name: "사각 뒷판형 3D 얼굴키링",
    description:
      "앞면엔 얼굴과 이름, 뒷면엔 아이 정보와 연락처를 추가할 수 있어요.",
    use: "보호자 키링 · 조건 확인 후 네임택",
    detailLabel: "주의",
    note: "이름만 / 이름+연락처 / 정보 없이",
  },
  {
    id: "figure",
    image: "product-figure.png",
    imageAlt: "3D 전신 피규어 제작 예시",
    eyebrow: "표정과 자세까지",
    name: "3D 전신 피규어",
    description:
      "사진 속 전체 모습을 약 5-6cm 레진 출력물로 제작해요. 우리 아이의 사랑스러운 포즈를 간직하세요.",
    use: "책상·선반 위 전시",
    detailLabel: "주의",
    note: "작은 돌출부는 충격에 약할 수 있음",
  },
  {
    id: "custom",
    eyebrow: "자유 요청",
    name: "“이런 모양도 될까요?”",
    description:
      "원하시는 형태를 말씀해주시면 제작 가능 여부를 확인해드려요. 제작이 힘들다면 가까운 방안으로 제안드릴게요.",
  },
];

const faqs = [
  {
    question: "지금 설문에 참여하면 굿즈를 받나요?",
    answer:
      "아니요. 1차 무료 제작 100명은 마감됐습니다. 지금은 설문만 받고 있어요. 2차 제작은 판매로 준비 중이고, 설문에 참여해 주신 분들께 먼저 안내드리며 참여자 할인을 준비하고 있습니다.",
  },
  {
    question: "2차는 얼마인가요? 언제 시작하나요?",
    answer:
      "금액과 수량, 일정 모두 아직 확정 전입니다. 확정 전이라 지금은 정확한 금액을 알려드릴 수 없어요. 정해지면 이 페이지와 인스타그램으로 안내드릴게요.",
  },
  {
    question: "지금 사진이나 연락처를 내야 하나요?",
    answer:
      "아니요. 사진과 주소는 받지 않습니다. 설문을 마친 뒤 2차 안내를 원하시면 이메일만 선택으로 남길 수 있고, 남기지 않아도 아무 불이익이 없습니다.",
  },
  {
    question: "15분보다 오래 걸리진 않나요?",
    answer:
      "객관식 중심으로 평균 약 15분입니다. 응답에 따라 꼬리 문항이 달라져 실제 시간은 조금 달라질 수 있고, 답하기 어려운 선택 문항은 건너뛸 수 있어요.",
  },
  {
    question: "제 응답은 어디에 쓰이나요?",
    answer:
      "반려인이 언제 어떤 도움을 필요로 하는지 파악하는 데 씁니다. 서비스 개선과 익명 분석 용도이며, 설문 단계에서는 신원을 알 수 있는 정보를 받지 않습니다.",
  },
  {
    question: "굿즈 종류는 왜 물어보나요?",
    answer:
      "2차에 어떤 형태를 얼마나 만들지 정하는 데 참고합니다. 고르지 않고 넘어가도 설문 참여에 아무 영향이 없어요.",
  },
  {
    question: "사진과 똑같이 나오나요?",
    answer:
      "아이의 눈, 귀, 털색과 눈에 띄는 특징을 반영하지만 완전히 복제하는 방식은 아닙니다. 사진 상태와 제작 방식에 따라 색상과 형태에 차이가 생길 수 있어요.",
  },
  {
    question: "이미 이별한 아이에 대해서도 답할 수 있나요?",
    answer:
      "네. 가장 최근에 이별한 아이 한 마리를 기준으로 응답해 주세요. 답하기 어려운 문항은 건너뛰어도 괜찮습니다.",
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
  label = "15분 설문 참여하기",
  compact = false,
  disabled = false,
}: {
  onClick: () => void;
  label?: string;
  compact?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
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
  // 아무것도 고르지 않은 상태로 시작한다. 특정 굿즈를 미리 골라 두면
  // 그 값이 실제 선호가 아닌 채로 선호도 집계에 섞인다.
  const [selectedGoods, setSelectedGoods] = useState("");
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

  const startSurvey = (placement: keyof typeof CTA_IDS) => {
    if (!surveyAvailable) return;
    trackEvent("survey_cta_click", {
      // 노션 3번이 요구한 버튼 식별자. placement는 사람이 읽기 위해 함께 남긴다.
      cta_id: CTA_IDS[placement],
      cta_placement: placement,
      goods_type: selectedGoods || GOODS_UNSELECTED,
    });
    // wouter는 화면 안에서 경로만 바꾸므로 이 이벤트가 유실될 일은 없다.
    setLocation(
      selectedGoods
        ? `/goods-survey/survey?goods=${selectedGoods}`
        : "/goods-survey/survey"
    );
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
          <span>설문 참여자 우선 안내</span>
        </header>

        <section className="gs-section gs-hero">
          <span className="gs-kicker">1차 무료 제작 100명 마감</span>
          <h1>
            하나뿐인 우리 아이 굿즈
            <br />
            <em>2차 제작을 준비하고</em>
            <br />
            있어요
          </h1>
          <p className="gs-lead">
            아크릴 얼굴 키링부터 3D 전신 피규어까지.
            <br />
            어떤 형태로 만들지 여러분의 15분이 정합니다.
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

          <p className="gs-hero-limit">1차 100명 마감 · 2차 준비 중</p>
          <p className="gs-cta-meta">
            결제 없이 시작 · 약 15분 소요 · 사진·연락처 안 받음
          </p>
          <PrimaryCta
            onClick={() => startSurvey("hero")}
            disabled={!surveyAvailable}
          />
          <p className="gs-cta-meta">2차 제작 소식을 가장 먼저 안내드려요</p>
        </section>

        <section className="gs-section gs-promise">
          <span className="gs-kicker">가장 먼저 드는 궁금증</span>
          <div className="gs-promise-question">
            <h2>지금 설문하면 뭐가 좋나요? 🤔</h2>
          </div>
          <div className="gs-promise-answer">
            <strong>
              2차 제작 소식을 먼저 받고, 참여자 할인을 준비 중이에요
            </strong>
            <p>
              1차 무료 제작 100명은 마감됐어요. 2차는 판매로 진행하며 금액과
              수량은 아직 확정 전입니다. 확정되면 이 페이지와 인스타그램으로
              먼저 알려드릴게요. 지금은 사진이나 연락처를 받지 않습니다.
            </p>
          </div>
        </section>

        <section className="gs-section gs-price-section">
          <h2>
            우리 아이만을 위한 굿즈
            <br />
            검색하면 정말 많죠
          </h2>
          <p className="gs-copy">
            {
              "그런데 표정과 털무늬까지 닮게 만들고, 얼굴을 3D로 세우거나 전신으로 제작하려면 옵션마다 금액이 붙어 생각보다 비싸집니다."
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
          <p className="gs-copy">
            결과가 마음에 들지 확인하기도 전에 결제부터 해야 하죠.
          </p>

          <div className="gs-quote">
            그래서 2차에서는
            <br />
            어떤 형태를 얼마에 만들지, 여러분의 15분으로 정하려 합니다.
          </div>
          <PrimaryCta
            onClick={() => startSurvey("price_comparison")}
            label="15분 설문으로 2차 제작에 의견 남기기"
            disabled={!surveyAvailable}
          />
        </section>

        <section className="gs-section gs-emotion">
          <h2>
            사실 갖고 싶은 건
            <br />
            ‘강아지 굿즈’가 아니니까요.
          </h2>
          <p className="gs-copy">
            {
              "한쪽만 접히는 귀, 코 옆의 작은 점, 웃을 때 올라가는 입꼬리처럼 우리 가족만 알아보는 우리 아이의 모습이 남았으면 하는 마음."
            }
          </p>
          <p className="gs-copy">
            {
              "사진첩 속에만 있던 그 표정을 매일 손에 잡히는 모습으로 만들어드리고 싶어요."
            }
          </p>
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

        <section className="gs-section gs-process">
          <span className="gs-kicker">2차 제작은 이렇게 진행돼요</span>
          <h2>
            사진들을 조합해
            <br />
            우리 아이만의 특징을 담아요.
          </h2>

          <div className="gs-process-list">
            {[
              [
                "01",
                "사진 제출",
                "얼굴과 무늬가 잘 보이는 사진 3장을 보내주세요.",
              ],
              [
                "02",
                "특징 반영",
                "AI와 함께 얼굴형·귀·털색과 눈에 띄는 특징을 정리합니다.",
              ],
              ["03", "굿즈 제작", "산업디자인 전공생이 실제 굿즈를 만듭니다."],
              ["04", "검수·발송", "검수를 거쳐 기한 내에 발송합니다."],
            ].map(([number, title, description]) => (
              <div className="gs-process-step" key={number}>
                <span aria-hidden="true" />
                <div>
                  <strong>
                    {number}. {title}
                  </strong>
                  <p>{description}</p>
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

        <section className="gs-section gs-goods-section" id="goods-options">
          <h2>2차에는 어떤 걸 만들면 좋을까요?</h2>
          <p className="gs-copy">
            고른 형태는 2차 제작 수량을 정하는 데 참고합니다. 고르지 않고
            넘어가도 설문 참여에는 아무 영향이 없어요.
          </p>

          <div className="gs-goods-list">
            {goods.map(item => {
              const selected = selectedGoods === item.id;
              return (
                <button
                  type="button"
                  className={`gs-goods-card${selected ? " is-selected" : ""}`}
                  onClick={() => {
                    // 다시 누르면 고르지 않은 상태로 되돌린다. 실수로 누른 선택이
                    // 그대로 굳어 2차 수량 산정에 섞이면 안 된다.
                    const next = selected ? "" : item.id;
                    setSelectedGoods(next);
                    trackEvent("goods_preview_select", {
                      goods_type: next || GOODS_UNSELECTED,
                    });
                  }}
                  aria-pressed={selected}
                  key={item.id}
                >
                  <div className="gs-goods-select">
                    <span>{selected && <Check aria-hidden="true" />}</span>
                    {selected ? "다시 눌러 취소" : "눌러서 마음에 담기"}
                  </div>
                  {item.image && item.imageAlt && (
                    <LandingImage
                      src={item.image}
                      alt={item.imageAlt}
                      className="gs-goods-image"
                    />
                  )}
                  <div className="gs-goods-content">
                    <small>{item.eyebrow}</small>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    {item.use && item.note && (
                      <dl>
                        <div>
                          <dt>권장 용도</dt>
                          <dd>{item.use}</dd>
                        </div>
                        <div>
                          <dt>{item.detailLabel}</dt>
                          <dd>{item.note}</dd>
                        </div>
                      </dl>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="gs-section gs-story-copy">
          <span className="gs-kicker">왜 설문을 부탁드리나요?</span>
          <h2>여러분의 진솔한 이야기가 필요해요.</h2>
          <LandingImage
            src="why-free.png"
            alt="소파에서 반려견과 편안한 시간을 보내는 보호자"
            className="gs-why-free-image"
          />
          <p>
            저희는 반려견과 함께 있는 오늘에 더 집중하고 추억을 남기는 걸 미루지
            않도록,
          </p>
          <p>
            훗날 “조금 더 해줄걸” 하는 후회를 줄이는 서비스를 만들고 있어요.
          </p>
          <strong>
            함께 있는 오늘에 더 집중하고
            <br />
            추억을 남기는 걸 미루지 않도록
          </strong>
          <p>
            언제 아이의 변화를 처음 느꼈는지, 그때 무엇을 찾아보고 어떤 도움이
            필요했는지 들려주세요. 여러분의 응답은 더 많은 반려인이 도움이
            필요한 순간을 찾는 데 쓰입니다.
          </p>
          <div className="gs-soft-callout">
            설문 후반에는 노화·아픔·마지막 돌봄에 관한 질문이 일부 포함됩니다.
            답하기 어려운 문항은 건너뛰어도 괜찮아요.
          </div>
          <PrimaryCta
            onClick={() => startSurvey("goods_options")}
            label="설문 시작하기"
            disabled={!surveyAvailable}
          />
        </section>

        {/* 남은 자리는 굿즈를 실제로 받을 수 있을 때만 뜻이 있다.
            굿즈가 닫힌 채로 "0명 남았어요"를 띄우면서 버튼을 열어 두면
            줄 수 없는 것을 준다고 말하는 화면이 된다. */}
        <section className="gs-section">
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
            <div className="gs-remaining-card" data-remaining={0}>
              <span>
                <Hourglass aria-hidden="true" />
                1차 무료 제작 마감
              </span>
              <h2>
                지금은 <em>설문만</em> 받고 있어요.
              </h2>
              <p>
                <span>1차 무료 체험단 {CAMPAIGN.capacity}명 마감</span>
                <span>2차 제작 준비 중</span>
              </p>
            </div>
          )}
        </section>

        <section className="gs-section gs-timeline-section">
          <span className="gs-kicker">누르면 이렇게 진행돼요</span>
          <h2>참여는 3단계</h2>
          <div className="gs-timeline">
            {[
              [
                "1",
                "약 15분 설문",
                "아이의 일상·변화·돌봄 경험을 객관식으로 체크합니다.",
              ],
              [
                "2",
                "사연 남기기 (선택)",
                "체크만으로 담기 어려운 이야기를 남길 수 있어요. 선정되면 인스타그램에 익명으로 소개됩니다. 쓰지 않아도 아무 불이익이 없습니다.",
              ],
              [
                "3",
                "2차 안내 받기",
                "2차 제작이 확정되면 이 페이지와 인스타그램으로 먼저 알려드립니다.",
              ],
            ].map(([number, title, description]) => (
              <div className="gs-timeline-item" key={number}>
                <span>{number}</span>
                <div>
                  <small>참여 과정 {number}/3</small>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="gs-fine-print">
            객관식 중심이라 빠르게 체크할 수 있어요. 긴 사연 작성은 선택입니다.
          </p>
        </section>

        <section className="gs-section gs-privacy-summary">
          <h2>
            설문 단계에서는
            <br />
            신원 정보를 받지 않습니다.
          </h2>
          <ul>
            <li>
              설문 중에는 사진, 이름, 연락처, 주소를 받지 않습니다. 응답과
              사연만 저장합니다.
            </li>
            <li>
              2차 안내를 원하시면 설문을 마친 뒤 이메일만 선택으로 받습니다.
              남기지 않아도 설문 참여에 아무 영향이 없습니다.
            </li>
            <li>
              응답은 반려인이 언제 어떤 도움을 필요로 하는지 파악하는 데 쓰이며,
              익명으로 분석합니다.
            </li>
            <li>
              사연 공개에 별도 동의하고 선정된 경우에만 인스타그램에 익명으로
              소개합니다.
            </li>
            <li>
              2차 제작이 열려 사진·배송 정보를 받게 되면, 그때 수집 항목과 보유
              기간을 다시 안내하고 동의를 받습니다.
            </li>
          </ul>
        </section>

        <section className="gs-section gs-faq-section">
          <span className="gs-kicker">미리 답해드릴게요</span>
          <h2>신청 전에 궁금한 점</h2>
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

        <section className="gs-section">
          <div className="gs-recruit">
            <span>진행 상황</span>
            <h2>1차 무료 제작은 마감됐어요.</h2>
            <p>
              한 분씩 사진을 확인해 손으로 만들기 때문에, 생산 가능한 수량까지만
              받았습니다.
            </p>
            <dl>
              <div>
                <dt>1차 무료 체험단</dt>
                <dd>{CAMPAIGN.capacity}명 마감</dd>
              </div>
              <div>
                <dt>1차 모집 기간</dt>
                <dd>{CAMPAIGN.firstRoundPeriod}</dd>
              </div>
              <div>
                <dt>2차 제작</dt>
                <dd>판매로 준비 중 · 금액·수량 미정</dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="gs-section gs-final" id="survey-start">
          <LandingImage
            src="final-banner.png"
            alt="반려견 원본 사진과 완성된 얼굴 키링 두 종류"
            className="gs-final-image"
          />
          <h2>
            15분을 들려주시면,
            <br />
            2차에는 더 나은 모습으로 만들어드릴게요.
          </h2>
          <p>
            함께 있는 오늘을 더 잘 기억할 수 있는 서비스를 만드는 데, 여러분의
            경험이 필요합니다!
          </p>
          <PrimaryCta
            onClick={() => startSurvey("final")}
            disabled={!surveyAvailable}
          />
        </section>

        <footer className="gs-footer">
          <nav aria-label="페이지 내 안내">
            <a
              href="#goods-options"
              onClick={event => scrollToSection(event, "goods-options")}
            >
              굿즈 종류 다시보기
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
            onClick={() => startSurvey("sticky")}
            disabled={!surveyAvailable}
          >
            <span>
              {surveyAvailable ? "15분 설문 참여하기" : "설문 접수 마감"}
              <small>
                {CAMPAIGN.duration} · 결제 없음 ·{" "}
                {goodsAvailable ? "굿즈 신청 진행 중" : "2차 소식 우선 안내"}
              </small>
            </span>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
