import {
  ArrowRight,
  Check,
  ChevronDown,
  Hourglass,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { trackEvent } from "@/lib/analytics/analytics";
import { usePageEngagement } from "@/lib/analytics/react";
import { getSurveyCampaign, type SurveyCampaign } from "@/lib/goodsSurveyApi";
import "./GoodsSurvey.css";

const CAMPAIGN = {
  duration: "약 15분",
  capacity: 100,
  completed: 27,
  startDate: "2026.07.23",
  endDate: "08.05",
  shipping: "배송비 3,000원",
} as const;

const ASSET_BASE = "/goods-survey";

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
    question: "설문만 하면 정말 무료인가요?",
    answer:
      "유효 응답을 끝까지 완료하고 제작 정보를 제출한 선착순 100명께 굿즈 1개를 제작비 0원으로 제공합니다. 문 앞 배송비 3,000원은 별도입니다.",
  },
  {
    question: "15분보다 오래 걸리진 않나요?",
    answer:
      "객관식 중심으로 평균 약 15분입니다. 응답에 따라 꼬리 문항이 달라져 실제 시간은 조금 달라질 수 있고, 답하기 어려운 선택 문항은 건너뛸 수 있어요.",
  },
  {
    question: "사진과 똑같이 나오나요?",
    answer:
      "아이의 눈, 귀, 털색과 눈에 띄는 특징을 반영하지만 완전히 복제하는 방식은 아닙니다. 사진 상태와 제작 방식에 따라 색상과 형태에 차이가 생길 수 있어요.",
  },
  {
    question: "먼저 사진부터 올려야 하나요?",
    answer:
      "아니요. 설문을 먼저 마친 뒤에 사진, 원하는 굿즈, 배송 정보를 입력합니다.",
  },
  {
    question: "어떤 사진을 올리면 되나요?",
    answer:
      "밝은 곳에서 얼굴 정면과 귀가 가리지 않게 찍힌 선명한 사진이 좋아요. 전신 피규어는 몸의 무늬와 자주 짓는 자세가 보이는 사진도 함께 올려주세요.",
  },
  {
    question: "제작과 배송에는 얼마나 걸리나요?",
    answer:
      "신청 마감 후 사진 확인과 제작 수량을 확정해 개별 안내합니다. 제작 지연이나 재제작이 필요한 경우도 별도로 알려드려요.",
  },
  {
    question: "여러 마리를 키우면 여러 개 받을 수 있나요?",
    answer:
      "이번 모집은 1인 1개입니다. 여러 반려견과 함께라면 설문 기준으로 선택한 한 아이의 굿즈를 신청해 주세요.",
  },
  {
    question: "이미 이별한 아이의 사진도 가능한가요?",
    answer:
      "네. 특징을 확인할 수 있는 선명한 사진이 있다면 참여할 수 있습니다. 설문에서 답하기 어려운 문항은 건너뛰어도 괜찮아요.",
  },
  {
    question: "마음에 안 들거나 파손되어 오면요?",
    answer:
      "명백한 오제작, 파손, 배송 사고는 사진을 확인한 뒤 재제작 기준에 따라 안내합니다. 단순한 색상·질감 차이는 제작 특성상 생길 수 있어요.",
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
  label = "15분 설문하고 우리 아이 굿즈 받기",
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
      <span>{disabled ? "무료 제작 모집 마감" : label}</span>
      <ArrowRight aria-hidden="true" />
    </button>
  );
}

export default function GoodsSurvey() {
  const [, setLocation] = useLocation();
  const [selectedGoods, setSelectedGoods] = useState("acrylic");
  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  const capacity = campaign?.capacity ?? CAMPAIGN.capacity;
  const completed = campaign?.allocated ?? CAMPAIGN.completed;
  const remaining = campaign?.remaining ?? capacity - completed;
  const completedPercent = (completed / capacity) * 100;
  const campaignAvailable = campaign?.open ?? true;
  usePageEngagement("goods_survey_landing", "landing_view");

  const startSurvey = (placement: string) => {
    if (!campaignAvailable) return;
    trackEvent("survey_cta_click", {
      cta_placement: placement,
      goods_type: selectedGoods,
    });
    setLocation(`/goods-survey/survey?goods=${selectedGoods}`);
  };

  useEffect(() => {
    let cancelled = false;

    const refresh = () => {
      void getSurveyCampaign()
        .then(next => {
          if (!cancelled) setCampaign(next);
        })
        .catch(() => {
          // 서버 상태 조회 실패 시 대화에서 확정한 초기 수치(27/100)를 유지한다.
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
          <span>완료자 전원 제작비 0원</span>
        </header>

        <section className="gs-section gs-hero">
          <span className="gs-kicker">사진 1장이면 시작</span>
          <h1>
            하나뿐인 우리 아이 굿즈
            <br />
            <em>15분 설문하면 무료로</em>
            <br />
            만들어드려요
          </h1>
          <p className="gs-lead">
            아크릴 얼굴 키링부터 3D 전신 피규어까지.
            <br />
            원하는 형태 1개를 맞춤 제작해 드려요.
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

          <p className="gs-hero-limit">선착순 100명만 제작</p>
          <p className="gs-cta-meta">
            결제 없이 시작 · 약 15분 소요 · 설문 후 사진 제출
          </p>
          <PrimaryCta
            onClick={() => startSurvey("hero")}
            disabled={!campaignAvailable}
          />
          <p className="gs-cta-meta">
            유효 응답 완료자 전원, 1인 1개 · 배송비 별도
          </p>
        </section>

        <section className="gs-section gs-promise">
          <span className="gs-kicker">가장 먼저 드는 의심</span>
          <div className="gs-promise-question">
            <h2>설문만 하면 정말 만들어주나요? 🤔</h2>
          </div>
          <div className="gs-promise-answer">
            <strong>네. 유효 응답을 끝까지 완료하면 제작비는 0원입니다</strong>
            <p>
              사진과 배송 정보는 설문을 마친 뒤에만 받아요. 추가 결제·사진 광고
              활용 여부는 아래 참여 조건에서 투명하게 확인할 수 있습니다.
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
            그래서 이번 조사에서는
            <br />
            굿즈값 대신, 여러분의 15분을 받고 싶습니다.
          </div>
          <PrimaryCta
            onClick={() => startSurvey("price_comparison")}
            label="내 이야기 15분으로 무료 제작 신청하기"
            disabled={!campaignAvailable}
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
          <span className="gs-kicker">미대생이 수작업으로 진행해요</span>
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
          <h2>받고 싶은 굿즈를 골라보세요.</h2>

          <div className="gs-goods-list">
            {goods.map(item => {
              const selected = selectedGoods === item.id;
              return (
                <button
                  type="button"
                  className={`gs-goods-card${selected ? " is-selected" : ""}`}
                  onClick={() => {
                    setSelectedGoods(item.id);
                    trackEvent("goods_preview_select", {
                      goods_type: item.id,
                    });
                  }}
                  aria-pressed={selected}
                  key={item.id}
                >
                  <div className="gs-goods-select">
                    <span>{selected && <Check aria-hidden="true" />}</span>
                    눌러서 마음에 담기
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
          <span className="gs-kicker">왜 무료로 제작해주나요?</span>
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
            label="받고 싶은 굿즈를 골라 설문 시작하기"
            disabled={!campaignAvailable}
          />
        </section>

        <section className="gs-section">
          <div
            className="gs-remaining-card"
            data-remaining={remaining}
            aria-label={`선착순 100명 중 ${remaining}명 남음`}
          >
            <span>
              <Hourglass aria-hidden="true" />
              무료 선착순 100명 한정
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
        </section>

        <section className="gs-section gs-timeline-section">
          <span className="gs-kicker">누르면 이렇게 진행돼요</span>
          <h2>랜딩에서 제작까지 4단계</h2>
          <div className="gs-timeline">
            {[
              ["1", "혜택 확인", "굿즈 종류와 참여 조건을 확인합니다."],
              [
                "2",
                "약 15분 설문",
                "아이의 일상·변화·돌봄 경험을 체크합니다. 작성해주신 사연이 선정되면 추가 상품 제공 및 인스타그램에 사연이 익명으로 공개돼요!",
              ],
              [
                "3",
                "사진·굿즈 선택",
                "설문 완료 후 사진과 원하는 형태를 제출합니다.",
              ],
              [
                "4",
                "제작·발송",
                "정보 확인 후 평균 1.5주 이내(최대 3주) 발송합니다.",
              ],
            ].map(([number, title, description]) => (
              <div className="gs-timeline-item" key={number}>
                <span>{number}</span>
                <div>
                  <small>참여 과정 {number}/4</small>
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
            아이 사진과 연락처,
            <br />
            필요한 곳에만 사용합니다.
          </h2>
          <ul>
            <li>
              광고성 정보 수신에 동의하면 이후 서비스가 출시됐을 때 안내드릴 수
              있습니다.
            </li>
            <li>배송 정보는 굿즈 발송과 문의 대응에만 사용합니다.</li>
            <li>
              사진은 굿즈 제작을 위해서만 쓰고 배송 완료 3개월 뒤 삭제합니다.
            </li>
            <li>
              사연 공개에 별도 동의하고 선정된 경우에만 추가 상품 제공 및
              인스타그램 익명 소개를 진행합니다.
            </li>
            <li>
              광고성 정보 수신 동의는 제작 신청과 분리하며, 선택하지 않아도 굿즈
              조건은 같습니다.
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
            <span>모집 안내</span>
            <h2>무료 제작은 선착순 100명까지.</h2>
            <p>
              한 분씩 사진을 확인해 제작하기에, 생산 가능한 수량까지만 받아요.
            </p>
            <dl>
              <div>
                <dt>모집 인원</dt>
                <dd>선착순 {CAMPAIGN.capacity}명</dd>
              </div>
              <div>
                <dt>모집 기간</dt>
                <dd>
                  {CAMPAIGN.startDate} ~ {CAMPAIGN.endDate}
                </dd>
              </div>
              <div>
                <dt>마감</dt>
                <dd>100명 도달 시 조기 마감</dd>
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
            오래 남을 우리 아이의 모습을 만들어드릴게요.
          </h2>
          <p>
            함께 있는 오늘을 더 잘 기억할 수 있는 서비스를 만드는 데, 여러분의
            경험이 필요합니다!
          </p>
          <PrimaryCta
            onClick={() => startSurvey("final")}
            disabled={!campaignAvailable}
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
            disabled={!campaignAvailable}
          >
            <span>
              {campaignAvailable
                ? "15분 설문하고 우리 아이 굿즈 받기"
                : "무료 제작 모집 마감"}
              <small>
                {CAMPAIGN.duration} · 선착순 100명 · {CAMPAIGN.shipping}
              </small>
            </span>
            <ArrowRight aria-hidden="true" />
          </button>
        </div>
      </div>
    </main>
  );
}
