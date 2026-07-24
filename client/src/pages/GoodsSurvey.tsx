import {
  ArrowRight,
  Check,
  ChevronDown,
  Hourglass,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trackEvent } from "@/lib/analytics/analytics";
import { usePageEngagement } from "@/lib/analytics/react";
import {
  getSurveyCampaign,
  type SurveyCampaign,
} from "@/lib/goodsSurveyApi";
import "./GoodsSurvey.css";

const CAMPAIGN = {
  duration: "약 15분",
  capacity: 100,
  completed: 27,
  startDate: "2026.07.23",
  endDate: "08.05",
  shipping: "배송비 3,000원",
} as const;

const goods = [
  {
    id: "acrylic",
    image: 1,
    eyebrow: "가장 가벼운",
    name: "아크릴 얼굴",
    description:
      "사진 속 얼굴을 깔끔하게 살린 가장 가벼운 형태예요. 일상의 소지품에 우리 아이의 미소를 담아보세요.",
    use: "보호자 키링 · 가방 장식",
    note: "가볍고 휴대가 편해요",
  },
  {
    id: "face",
    image: 2,
    eyebrow: "말랑한 입체감",
    name: "3D 얼굴 키캡형",
    description:
      "우리 아이의 얼굴만 입체적으로 표현해요. 기계식 키보드에 장착하거나 작은 장식으로 간직할 수 있어요.",
    use: "보호자 키캡 · 미니 장식",
    note: "키캡 결합 방식 확인 예정",
  },
  {
    id: "backplate",
    image: 3,
    eyebrow: "이름까지 새기는",
    name: "사각 뒷판형 3D 얼굴키링",
    description:
      "앞면엔 얼굴과 이름, 뒷면엔 아이 정보를 담아 오래 간직할 수 있어요.",
    use: "보호자 키링 · 소지품 네임택",
    note: "이름·연락처 각인 선택",
  },
  {
    id: "figure",
    image: 4,
    eyebrow: "표정과 자세까지",
    name: "3D 전신 피규어",
    description:
      "사진 속 전체 모습을 약 5~6cm 크기로 표현해요. 우리 아이의 사랑스러운 포즈를 간직해보세요.",
    use: "책상·선반 위 전시",
    note: "작은 돌출부는 충격에 약할 수 있어요",
  },
  {
    id: "custom",
    image: 5,
    eyebrow: "자유 제안",
    name: "어떤 모양도 될까요?",
    description:
      "만들고 싶은 형태를 자유롭게 적어 주세요. 제작 가능 여부를 확인한 뒤 기본 형태로 대안을 제안할 수 있어요.",
    use: "제작 가능 범위 내 협의",
    note: "가능 여부를 개별 안내해요",
  },
] as const;

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

function ProductSprite({
  index,
  className = "",
  label,
}: {
  index: number;
  className?: string;
  label: string;
}) {
  return (
    <div
      className={`gs-product-sprite gs-product-sprite--${index} ${className}`}
      role="img"
      aria-label={`${label} 제작 예시`}
    >
      <span>제작 예시</span>
    </div>
  );
}

function StorySprite({ index, label }: { index: number; label: string }) {
  return (
    <div
      className={`gs-story-sprite gs-story-sprite--${index}`}
      role="img"
      aria-label={label}
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
    void getSurveyCampaign()
      .then(setCampaign)
      .catch(() => {
        // 서버 상태 조회 실패 시 대화에서 확정한 초기 수치(27/100)를 유지한다.
      });
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
            PAW-EVER
          </a>
          <span>우리 아이 굿즈 제작 이벤트</span>
        </header>

        <section className="gs-section gs-hero">
          <span className="gs-kicker">사진 한 장이면 시작</span>
          <h1>
            하나뿐인 우리 아이 굿즈
            <br />
            <em>15분 설문하면 무료로</em>
            <br />
            만들어드려요.
          </h1>
          <p className="gs-lead">
            아크릴 얼굴 키링부터 3D 전신 피규어까지,
            <br />
            원하는 형태 1개를 맞춤 제작해 드려요.
          </p>

          <div className="gs-hero-grid">
            {[
              [0, "원본 사진"],
              [1, "아크릴"],
              [2, "3D 얼굴"],
              [4, "3D 전신"],
            ].map(([index, label]) => (
              <div className="gs-hero-cell" key={label}>
                <ProductSprite index={Number(index)} label={String(label)} />
                <strong>{label}</strong>
              </div>
            ))}
          </div>

          <p className="gs-hero-limit">선착순 100명만 제작</p>
          <PrimaryCta
            onClick={() => startSurvey("hero")}
            disabled={!campaignAvailable}
          />
          <p className="gs-cta-meta">
            무료 참여 · 약 15분 소요 · 설문 후 사진 제출
          </p>
        </section>

        <section className="gs-section gs-promise">
          <span className="gs-kicker">가장 먼저 드는 의심</span>
          <h2>설문만 하면 정말 만들어주나요? 🤔</h2>
          <div className="gs-soft-callout">
            <strong>네. 유효 응답을 끝까지 완료하면 제작비는 0원입니다.</strong>
            <p>
              사진과 배송 정보는 설문을 마친 뒤에만 받아요. 추가 상품 결제나
              영업 연락 없이 문 앞 배송비 3,000원만 별도입니다.
            </p>
          </div>
        </section>

        <section className="gs-section gs-price-section">
          <span className="gs-kicker">우리 아이를 위한 선택</span>
          <h2>
            우리 아이만을 위한 굿즈,
            <br />
            검색하면 정말 많죠.
          </h2>
          <p className="gs-copy">
            그런데 보호자 얼굴만큼 다르게 생긴 아이를 닮게 만들려면 생각보다
            가격이 쉽게 올라갑니다.
          </p>

          <div className="gs-market-list">
            {[
              [1, "아크릴 얼굴 키링", "7,900원~"],
              [2, "3D 얼굴 커스텀", "220,000원~"],
              [4, "3D 전신 피규어", "210,000원~"],
            ].map(([image, name, price]) => (
              <div className="gs-market-item" key={String(name)}>
                <ProductSprite index={Number(image)} label={String(name)} />
                <strong>{name}</strong>
                <span>{price}</span>
              </div>
            ))}
          </div>
          <p className="gs-source-note">
            제작 방식과 판매처에 따라 가격은 달라질 수 있습니다.
          </p>

          <div className="gs-quote">
            그래서 이번 조사에서는
            <br />
            굿즈값 대신, 여러분의 15분을 받고 싶습니다.
          </div>
          <PrimaryCta
            onClick={() => startSurvey("price_comparison")}
            label="내 아이 굿즈 무료 제작 신청하기"
            disabled={!campaignAvailable}
          />
        </section>

        <section className="gs-section gs-emotion">
          <span className="gs-kicker">우리가 정말 간직하고 싶은 것</span>
          <h2>
            사실 갖고 싶은 건
            <br />
            ‘강아지 굿즈’가 아니니까요.
          </h2>
          <p className="gs-copy">
            함께한 김에, 귀 모양과 작은 점, 웃을 때 올라가는 입꼬리처럼 우리
            가족만 알아보는 우리 아이의 모습이 오래 남았으면 하는 마음일 거예요.
          </p>
          <div className="gs-story-stack">
            <StorySprite
              index={0}
              label="휴대폰 속 반려견과 완성 피규어 예시"
            />
            <StorySprite index={1} label="반려견 사진과 키링 예시" />
            <StorySprite
              index={2}
              label="공원에서 촬영한 반려견 사진과 피규어"
            />
          </div>
        </section>

        <section className="gs-section gs-process">
          <span className="gs-kicker">사진에서 시작되는 제작</span>
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
                "얼굴과 무늬가 잘 보이는 사진을 설문 후 보내주세요.",
              ],
              [
                "02",
                "특징 정리",
                "사진을 함께 살펴보고 아이만의 특징을 정리합니다.",
              ],
              ["03", "굿즈 제작", "선택한 아크릴 또는 3D 방식으로 제작합니다."],
              ["04", "검수·발송", "완성 상태를 확인한 뒤 개별 발송합니다."],
            ].map(([number, title, description]) => (
              <div className="gs-process-step" key={number}>
                <span>{number}</span>
                <div>
                  <strong>{title}</strong>
                  <p>{description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="gs-process-visual" aria-label="제작 과정 예시">
            <ProductSprite index={0} label="원본 사진" />
            <ProductSprite index={4} label="3D 모델링" />
            <ProductSprite index={5} label="완성 굿즈" />
          </div>
          <p className="gs-process-note">
            사진 상태와 제작 방식에 따라 색상과 형태에 차이가 생길 수 있으며,
            모든 이미지는 제작 예시입니다.
          </p>
        </section>

        <section className="gs-section gs-goods-section" id="goods-options">
          <span className="gs-kicker">받고 싶은 형태를 선택해요</span>
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
                    {selected ? "마음에 담은 굿즈" : "눌러서 미리 담기"}
                  </div>
                  <ProductSprite index={item.image} label={item.name} />
                  <div className="gs-goods-content">
                    <small>{item.eyebrow}</small>
                    <h3>{item.name}</h3>
                    <p>{item.description}</p>
                    <dl>
                      <div>
                        <dt>권장 용도</dt>
                        <dd>{item.use}</dd>
                      </div>
                      <div>
                        <dt>주의</dt>
                        <dd>{item.note}</dd>
                      </div>
                    </dl>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="gs-section gs-story-copy">
          <span className="gs-kicker">왜 무료로 제작하나요?</span>
          <h2>여러분의 진솔한 이야기가 필요해요.</h2>
          <StorySprite index={0} label="반려견과 굿즈를 함께 바라보는 일상" />
          <p>
            저희는 반려견과 함께 있는 오늘에 더 집중하고 추억을 남기는 길을
            만들고 있어요.
          </p>
          <p>
            훗날 “조금 더 해줄걸” 하는 후회를 줄이는 서비스를 만들고 싶어요.
          </p>
          <strong>
            함께 있는 오늘에 더 집중하고,
            <br />
            추억을 남기는 길을 찾고 있어요.
          </strong>
          <p>
            언제 아이의 변화를 처음 느꼈는지, 그때 무엇을 찾아보고 어떤 도움이
            필요했는지 들려주세요.
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
              ["1", "참여 확인", "굿즈 종류와 혜택·참여 조건을 확인합니다."],
              ["2", "약 15분 설문", "아이의 일상·변화·돌봄 경험을 체크합니다."],
              [
                "3",
                "사진·굿즈 선택",
                "설문 완료 후 사진과 원하는 형태를 제출합니다.",
              ],
              ["4", "제작·발송", "사진을 확인해 제작한 뒤 개별 발송합니다."],
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
            객관식 중심이라 빠르게 체크할 수 있어요. 답하기 어려운 선택 문항은
            건너뛸 수 있습니다.
          </p>
        </section>

        <section className="gs-section gs-privacy-summary">
          <span className="gs-kicker">개인정보는 필요한 만큼만</span>
          <h2>
            아이 사진과 연락처,
            <br />
            필요한 곳에만 사용합니다.
          </h2>
          <ul>
            <li>광고성 정보 수신이나 영업 연락에 사용하지 않습니다.</li>
            <li>이름·연락처·배송지는 굿즈 제작과 발송에만 사용합니다.</li>
            <li>사진은 굿즈 제작을 위해서만 사용하며 배송 후 삭제합니다.</li>
            <li>공개·SNS 소개는 별도 선택 동의 없이는 진행하지 않습니다.</li>
            <li>배송 정보와 설문 응답은 무작위 응답 ID로만 연결합니다.</li>
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
                <li>키링의 작은 부품과 3D 돌출부는 충격에 약할 수 있습니다.</li>
                <li>반려견 착용용으로 안내하거나 사용하지 않습니다.</li>
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
          <ProductSprite
            index={5}
            className="gs-final-image"
            label="원본 사진과 완성 피규어"
          />
          <h2>
            15분을 들려주시면,
            <br />
            오래 남을 우리 아이의 모습을 만들어드릴게요.
          </h2>
          <p>
            함께 있는 오늘을 더 잘 기억할 수 있는 서비스를 만드는 데 여러분의
            경험이 필요합니다.
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
            서울특별시공덕지원센터 만드는 반려인 서비스 · paw ever
            <br />
            문의 채널 준비 중
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
