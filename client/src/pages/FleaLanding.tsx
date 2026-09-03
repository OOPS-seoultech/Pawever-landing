import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { setSurveyPhaseContext, trackEvent } from "@/lib/analytics/analytics";
import { usePageEngagement, useScrollDepth } from "@/lib/analytics/react";
import { getSurveyCampaign, type SurveyCampaign } from "@/lib/goodsSurveyApi";
import { saveGoodsSurveyPhotoHandoff } from "@/lib/goodsSurveyPhotoHandoff";
import { PhotoIntakeCard, PrimaryCta } from "./goodsSurveyIntake";
import { wonText } from "./goodsSurveyContent";
import "./GoodsSurvey.css";
import "./FleaLanding.css";

/**
 * 서울과학기술대학교 대동제 플리마켓 전용 랜딩.
 *
 * 피그마 `8-2. Rending Page`(0uW99BqaTJKUVlowzQswli / 5472:1444) 그대로다.
 * 현장에 QR 을 두고 그 자리에서 주문을 받는 화면이라, 상시 랜딩과 달리 설문을
 * 거치지 않는다. CTA 는 모두 사진·정보 등록으로 바로 간다 —
 *
 *   [카톡 나혜님] "CTA 버튼들 클릭 시 바로 사진 및 정보 등록하는 페이지로
 *                 엔드포인트 설정해주세요!"
 *   [카톡 8/28 대표] "이때 QR배치해서 주문 제작 받고, 바로 제작 후 판매해볼까
 *                    합니다."
 *
 * 상시 랜딩(/goods-survey)은 건드리지 않는다. 행사가 끝나면 서버에서
 * GOODS_FLEA_CAMPAIGN_ID 를 비워 이 경로를 닫는다. 화면은 그대로 두고 값만
 * 지우면 새 주문이 들어올 길이 사라진다.
 */

const ASSET_BASE = "/goods-survey";

/** 이 화면이 파는 값. 서버가 같은 값을 계산한다(GoodsOrderService.priceFor). */
const FLEA_PRICE = 11_900;
const LIST_PRICE = 29_900;
const SHIPPING_FEE = 3_000;

/**
 * 버튼 식별자.
 *
 * 상시 랜딩의 btn_A* 와 겹치지 않게 F 로 나눈다. 같은 값을 쓰면 분석 도구에서
 * 두 랜딩의 클릭이 한 줄로 합쳐져, 플리마켓이 실제로 얼마나 눌렸는지 셀 수
 * 없다.
 */
const CTA_IDS = {
  hero: "btn_F1",
  figure: "btn_F2",
  purchase_flea: "btn_F3",
  purchase_list: "btn_F4",
  intake_price: "btn_F5",
  intake_final: "btn_F6",
} as const;

type Placement = keyof typeof CTA_IDS;

/**
 * 06 PROCESS 의 네 단계(5472:1600).
 *
 * boxHeight 는 디자인이 정한 그림 상자의 높이다. 원본 비율에 맡기면 3D 제작이
 * 347px, 검수가 426px 로 늘어나 카드가 화면을 삼킨다. 상자를 정해 두고 넘치는
 * 부분은 잘라 낸다 — 디자인도 그렇게 잘라 두었다.
 */
const processSteps = [
  {
    number: "01",
    title: "사진 3장",
    caption: "얼굴·전신·무늬, 꼬리가 잘 보이는 사진",
    boxHeight: 153,
    figures: [
      {
        src: "flea-step-photo-1.webp",
        alt: "반려견 얼굴 사진",
        w: 114,
        h: 153,
      },
      {
        src: "flea-step-photo-2.webp",
        alt: "반려견 전신 사진",
        w: 102,
        h: 153,
      },
      {
        src: "flea-step-photo-3.webp",
        alt: "반려견 털색과 무늬 사진",
        w: 102,
        h: 153,
      },
    ],
  },
  {
    number: "02",
    title: "특징 정리 (2D 4면도 제작)",
    caption: "귀·얼굴형·털색·체형 확인",
    boxHeight: 160,
    figures: [
      {
        src: "flea-step-4view.webp",
        alt: "반려견의 앞·옆·뒤 모습을 정리한 2D 4면도",
        w: 320,
        h: 160,
      },
    ],
  },
  {
    number: "03",
    title: "3D 제작",
    caption: "모델링부터 출력까지 여러 작업 장면",
    boxHeight: 269,
    figures: [
      {
        src: "flea-step-3d.webp",
        alt: "3D 모델링 화면과 출력 중인 피규어",
        w: 330,
        h: 358,
      },
    ],
  },
  {
    number: "04",
    title: "출력 및 수작업 검수",
    caption: "세척·표면 마감·상태 확인 후 포장",
    boxHeight: 244,
    figures: [
      {
        src: "flea-step-finish.webp",
        alt: "작은 반려견 피규어를 손으로 정교하게 마감하는 작업 장면",
        w: 320,
        h: 244,
      },
    ],
  },
] as const;

/** 02 WHY NOW 의 후기 둘(5472:1506, 5472:1520). */
const voices = [
  {
    who: "12135  님",
    avatar: "voice-avatar-1.webp",
    lines: [
      "그때 사진을 더 찍어둘걸,",
      "조금 더 많이 남겨둘걸 생각하게 되더라고요",
    ],
  },
  {
    who: "12135  님",
    avatar: "voice-avatar-2.webp",
    lines: [
      "잘받았습니다 봄이랑 비슷하게 생겨서 너무",
      "귀여워요 ㅋㅋㅋㅋㅋ",
      "책상 위에 올려두고 주기적으로 보고 있어용!",
    ],
  },
] as const;

/** 10 FAQ 의 여섯 문답(5472:1809). 디자인에 있는 것만 적는다. */
const faqs = [
  {
    question: "설문하면 무엇이 달라지나요?",
    answer:
      "약 10~15분 설문 완료 시 2차 제작비 지원가 23,900원으로 구매할 수 있습니다.",
  },
  {
    question: "사진은 어떤 걸 보내야 하나요?",
    answer: "얼굴, 전신, 털색과 무늬가 잘 보이는 사진 3장을 준비해 주세요.",
  },
  {
    question: "실제 반려견과 얼마나 비슷하게 나오나요?",
    answer:
      "사진 속 특징을 최대한 반영하지만 사진 화질과 출력 특성에 따라 일부 차이가 있을 수 있습니다.",
  },
  {
    question: "2차는 몇 개만 판매하나요?",
    answer: "안정적으로 제작 가능한 수량을 확인한 뒤 오픈 시 공개합니다.",
  },
  {
    question: "배송비와 제작 기간은 어떻게 되나요?",
    answer:
      "배송비 3,000원은 별도이며 정확한 제작 기간은 주문 단계에서 안내합니다.",
  },
  {
    question: "광고 수신에 동의해야 할인받을 수 있나요?",
    answer: "아니요. 광고성 정보 수신 동의는 선택 사항입니다.",
  },
] as const;

export default function FleaLanding() {
  const [, setLocation] = useLocation();
  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  // 조회 전에는 닫힌 것으로 본다. 못 줄 것을 준다고 적는 쪽이 더 나쁘다.
  const goodsAvailable = campaign?.goodsOpen ?? false;

  usePageEngagement("flea_landing", "landing_view");
  useScrollDepth("flea_landing");

  useEffect(() => {
    let cancelled = false;
    void getSurveyCampaign("flea")
      .then(next => {
        if (cancelled) return;
        setCampaign(next);
        setSurveyPhaseContext({
          campaignId: next.campaignId,
          goodsOpen: next.goodsOpen,
        });
      })
      .catch(() => {
        // 경로가 닫혀 있으면 서버가 404 를 준다. 그때는 닫힌 채로 둔다.
      });
    return () => {
      cancelled = true;
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
    document.title = "과기대 플리마켓 전용가 | Pawever";
    // 현장 QR 로만 여는 화면이다. 검색으로 들어와 한정가를 보게 두지 않는다.
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

  /**
   * 사진·정보 등록으로 바로 간다.
   *
   * 설문을 거치지 않고, 어느 경로로 들어왔는지를 주소에 실어 보낸다. 값이
   * 갈리는 판정은 서버가 하지만, 화면이 알려 주지 않으면 서버는 이 사람을
   * 상시 판매로 본다.
   */
  const startOrder = (placement: Placement, channel: "flea" | "online") => {
    trackEvent("survey_cta_click", {
      cta_id: CTA_IDS[placement],
      cta_placement: `flea_${placement}`,
    });
    setLocation(
      channel === "flea"
        ? "/goods-survey/survey?direct=1&channel=flea"
        : "/goods-survey/survey?direct=1"
    );
  };

  /** 굿즈가 열려 있을 때만 버튼을 그린다. */
  const buyCta = (
    placement: Placement,
    label: string,
    channel: "flea" | "online" = "flea"
  ) =>
    goodsAvailable ? (
      <PrimaryCta
        ctaId={CTA_IDS[placement]}
        onClick={() => startOrder(placement, channel)}
        label={label}
        showArrow={false}
      />
    ) : (
      <p className="gs-note">지금은 신청을 받지 않아요</p>
    );

  const intake = (placement: Placement) =>
    goodsAvailable ? (
      <PhotoIntakeCard
        ctaId={CTA_IDS[placement]}
        onSubmit={files => {
          // 서버로 보내지 않고 다음 화면까지만 들고 간다.
          saveGoodsSurveyPhotoHandoff(files);
          startOrder(placement, "flea");
        }}
      />
    ) : (
      <p className="gs-note">지금은 신청을 받지 않아요</p>
    );

  return (
    <main className="goods-survey-page flea-page">
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
          <span>플리마켓 전용 할인 페이지</span>
        </header>

        {/* 01 — 킥커가 없다. 사러 온 사람에게 값부터 보여 준다(5472:1465). */}
        <section className="gs-section flea-hero" id="order">
          <h1>
            오늘의 모습은
            <br />
            지금만 남길 수 있으니까.
          </h1>
          <p className="gs-lead">
            우리 아이 사진으로 만드는
            <br />
            <strong>세상에 ‘하나뿐인’ </strong>3D 전신 피규어
          </p>

          <img
            className="gs-figure gs-figure--wide"
            src={`${ASSET_BASE}/flea-hero.webp`}
            alt="크림색 포메라니안과 같은 모습을 본뜬 작은 전신 피규어"
            width="366"
            height="286"
            decoding="async"
          />

          {/* 취소선 가격은 Cafe24 Ohsquare 다(5472:1486). 필요한 글자만 잘라
              1.6KB 로 담았다 — FleaLanding.css 의 @font-face. */}
          <p className="flea-was">기존 판매가 {wonText(LIST_PRICE)}</p>

          <img
            className="gs-hero-arrow"
            src={`${ASSET_BASE}/down-arrow.webp`}
            alt=""
            width="197"
            height="84"
            decoding="async"
          />

          <div className="flea-price-card">
            <span>서울과학기술대학교 플리마켓 전용가</span>
            <strong>
              {wonText(FLEA_PRICE)}
              <em>
                <b>60.2%</b> 할인
              </em>
            </strong>
            <small>
              <b>미대생 눈물의 수작업</b> · 사진 3장 제출
              <br />
              방문수령 외 택배 시 배송비 {wonText(SHIPPING_FEE)} 별도
            </small>
          </div>

          {buyCta("hero", "바로 예약 주문 걸기")}
        </section>

        {/* 02 */}
        <section className="gs-section flea-why-now">
          <span className="gs-kicker">02 WHY NOW</span>
          <h2>
            300장도 넘는 아이 사진.
            <br />
            그중 가장 <em>우리 아이다운 모습</em>을
            <br />
            실물로 남겨보세요!
          </h2>
          <p className="gs-copy">
            매일 보던 표정, 살짝 접힌 귀, 털끝의 작은 무늬.
            <br />
            지금은 너무 익숙해서 지나치는 모습들이
            <br />
            언젠가 가장 보고싶은 장면이 되기도 합니다.
          </p>

          <img
            className="gs-figure gs-figure--wide"
            src={`${ASSET_BASE}/flea-why-now.webp`}
            alt="사진 속 반려견과 같은 특징으로 출력한 피규어"
            width="365"
            height="274"
            decoding="async"
          />
          <p className="flea-caption">* 실제 출력 이미지</p>

          <div className="gs-voice-list flea-voices">
            {voices.map(({ who, avatar, lines }, index) => (
              <article className="gs-voice" key={index}>
                <header>
                  <img
                    className="gs-voice-avatar"
                    src={`${ASSET_BASE}/${avatar}`}
                    alt=""
                    width="34"
                    height="34"
                    decoding="async"
                  />
                  <div>
                    <strong>{who}</strong>
                  </div>
                  <span className="gs-voice-stars" aria-label="별점 5점">
                    ★★★★★
                  </span>
                </header>
                <p>
                  {lines.map((line, lineIndex) => (
                    <span key={lineIndex}>
                      {line}
                      {lineIndex < lines.length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </article>
            ))}
          </div>

          <img
            className="flea-ticket"
            src={`${ASSET_BASE}/flea-ticket.webp`}
            alt="영화 티켓"
            width="274"
            height="137"
            decoding="async"
          />
          <p className="flea-punch flea-punch--sm">
            영화 티켓보다 저렴한 가격으로,
            <br />
            <u>세상에 하나뿐인 우리 아이의 모습</u>을 만듭니다.
          </p>
        </section>

        {/* 03 */}
        <section className="gs-section flea-real-price">
          <span className="gs-kicker">03 REAL PRICE</span>
          <h2>
            원래, <em>43만 원</em>짜리예요
          </h2>
          <p className="gs-copy">
            강아지 간식 한 봉지 값입니다. 근데 이건 평생 남아요
          </p>

          <img
            className="flea-plain-figure"
            src={`${ASSET_BASE}/flea-real-price.webp`}
            alt="같은 크기의 반려동물 피규어가 43만 원에 팔리는 시중 상품 화면"
            width="376"
            height="327"
            decoding="async"
          />

          <p className="flea-hand" aria-hidden="true">
            ✋
          </p>

          <div className="flea-wait-card">
            <span>잠깐!</span>
            <h3>왜 가격이 이정도나 할까요?</h3>
            <p>
              <b>AI 딸깍! 그리고 3D 프린팅 위~잉···</b>
              <br />
              <b>
                ··으로 하면 <u>문제가 되게 많아요.</u> 😭
              </b>
            </p>
            <p className="flea-wait-detail">
              결국 오류, 색상 확인 등 모델링 수작업이 필요하고,
              <br />긴 시간 3D 출력에 사람이 붙어서 확인해야해요.
            </p>
          </div>

          <div className="flea-cost">
            <figure>
              <img
                src={`${ASSET_BASE}/flea-modeling.webp`}
                alt="모니터 위에서 반려견 3D 모델을 다듬는 작업 화면"
                width="366"
                height="219"
                decoding="async"
              />
              <figcaption>
                산디생의 눈물 먹은 모델링 (시급 11,200원*2)
              </figcaption>
            </figure>
            <img
              className="flea-plus"
              src={`${ASSET_BASE}/flea-plus.webp`}
              alt=""
              width="22"
              height="22"
              decoding="async"
            />
            <figure>
              <img
                src={`${ASSET_BASE}/flea-printing.webp`}
                alt="열 시간 넘게 돌아가는 3D 출력기"
                width="366"
                height="200"
                decoding="async"
              />
              <figcaption>평균 10시간 출력(PLA)</figcaption>
            </figure>
          </div>

          <p className="flea-dots" aria-hidden="true">
            <span>·</span>
            <span>·</span>
            <span>·</span>
          </p>

          <p className="flea-punch">
            <u>과기대 플리마켓 한정</u>으로만
            <br />
            <em>시중 단가 기준 약 97% 저렴</em>하게 드려요{" "}
          </p>

          {intake("intake_price")}
        </section>

        {/* 04 */}
        <section className="gs-section flea-figure-section">
          <span className="gs-kicker">04 THE FIGURE</span>
          <h2>
            가족끼리만 알아보는
            <br />
            우리 아이만의 특징까지.
          </h2>
          <p className="gs-copy">
            같은 견종이어도 귀, 얼굴, 털색과 무늬, 체형은 모두 다르니까,
            <br />
            사진 속 특징을 최대한 찾아 3D 형태로 담습니다.
          </p>

          <div className="flea-compare">
            <img
              src={`${ASSET_BASE}/flea-figure-real.webp`}
              alt="실제 반려견 사진"
              width="145"
              height="193"
              decoding="async"
            />
            <img
              className="flea-compare-arrow"
              src={`${ASSET_BASE}/flea-figure-arrow.webp`}
              alt=""
              width="29"
              height="29"
              decoding="async"
            />
            <img
              src={`${ASSET_BASE}/flea-figure-3d.webp`}
              alt="같은 특징을 살려 만든 3D 피규어 네 방향 모습"
              width="194"
              height="193"
              decoding="async"
            />
          </div>
          <p className="flea-caption flea-caption--left">
            * 실제 강아지 이미지 : 좌측 하단 (초상권 문제로 AI 대체)
          </p>

          <img
            className="gs-hero-arrow flea-arrow--sm"
            src={`${ASSET_BASE}/down-arrow.webp`}
            alt=""
            width="141"
            height="60"
            decoding="async"
          />

          <img
            className="flea-plain-figure flea-plain-figure--round"
            src={`${ASSET_BASE}/flea-hand.webp`}
            alt="손 위에 올려둔 완성 피규어 넷"
            width="328"
            height="206"
            decoding="async"
          />
          <p className="flea-caption">* 실제 출력 이미지</p>

          <article className="flea-buy-card">
            <span>과기대 플리마켓 전용 60.2% 할인가</span>
            <strong>{wonText(FLEA_PRICE)}</strong>
            <small>선착순 70개 한정수량</small>
            {buyCta("figure", "대동제 맞이 60.2% 저렴하게")}
          </article>
        </section>

        {/* 05 */}
        <section className="gs-section flea-proof">
          <span className="gs-kicker">05 PROOF</span>
          <h2>
            1차 모집 선착순 100명,
            <br />
            하루 만에 마감됐습니다.
          </h2>
          <p className="gs-copy">
            100개의 피규어를 직접 제작하며 소중한 모습을 담기 위해 사진 선택,
            모델링, 출력과 검수 방식을 지속해서 발전시키고 있습니다.
          </p>

          <div className="gs-closed-card">
            <span>1차 체험단</span>
            <strong>100명 모집 완료</strong>
            <small>오픈 하루 만에 신청이 마감됐어요</small>
            <img
              className="gs-closed-stamp"
              src={`${ASSET_BASE}/closed-stamp.webp`}
              alt=""
              width="318"
              height="199"
              decoding="async"
            />
          </div>

          <div className="gs-stats">
            {[
              ["100명", "1차 체험단"],
              ["1일", "모집 마감"],
              ["100개", "직접 제작"],
            ].map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <img
            className="gs-figure gs-figure--wide"
            src={`${ASSET_BASE}/flea-proof-overlay.webp`}
            alt="책상 위 사진 곁에 놓인 작은 반려견 피규어"
            width="376"
            height="282"
            decoding="async"
          />

          <p className="gs-note">
            ※ 사진의 화질·각도와 3D 출력 특성에 따라 실제 반려견과 색상 및
            형태에 일부 차이가 있을 수 있습니다.
          </p>
        </section>

        {/* 06 */}
        <section className="gs-section flea-process" id="process">
          <span className="gs-kicker">06 PROCESS</span>
          <h2>한 아이씩 한땀한땀, 천천히.</h2>
          <p className="gs-copy">
            빠르게 많이 만드는 것보다, 사진 속 특징을 놓치지 않는 과정을
            우선합니다.
          </p>

          <div className="gs-steps">
            {processSteps.map(
              ({ number, title, caption, figures, boxHeight }) => (
                <article className="gs-step" key={number}>
                  <span className="gs-step-number">{number}</span>
                  <h3>{title}</h3>
                  <p>{caption}</p>
                  <div
                    className={`gs-step-figures${
                      figures.length > 1 ? " is-triple" : ""
                    }`}
                  >
                    {figures.map(({ src, alt, w, h }) => (
                      <img
                        key={src}
                        className="gs-figure"
                        src={`${ASSET_BASE}/${src}`}
                        alt={alt}
                        width={w}
                        height={h}
                        style={{ height: boxHeight }}
                        decoding="async"
                      />
                    ))}
                  </div>
                </article>
              )
            )}
          </div>
        </section>

        {/* 07 */}
        <section className="gs-section flea-limited">
          <span className="gs-kicker">07 LIMITED</span>
          <h2>
            이번에도 선착순
            <br />
            <em>
              <u>70개만</u> 제작
            </em>
            합니다.
          </h2>
          <p className="gs-copy">
            사진을 보고 특징을 정리하고, 출력 상태를 하나씩 확인해야 하는 맞춤
            제작입니다. 그래서 2차 역시 제대로 만들 수 있는 수량만 오픈합니다.
          </p>

          <div className="gs-limit-card">
            <span>2차 준비 수량</span>
            <strong>70개</strong>
            <small>
              2주 동안 안정적으로 제작 가능한 수량에서
              <br />
              재제작 여유분을 제외해 확정합니다.
            </small>
          </div>

          <img
            className="gs-figure gs-figure--wide"
            src={`${ASSET_BASE}/flea-limited.webp`}
            alt="여러 종류의 완성 반려견 피규어가 진열된 모습"
            width="390"
            height="223"
            decoding="async"
          />
        </section>

        {/* 08 — 두 갈래. 현장가가 위, 정가가 아래다(5472:1742). */}
        <section className="gs-section flea-purchase" id="offer">
          <span className="gs-kicker">08 PURCHASE</span>
          <p className="gs-copy">
            플리마켓이 끝나면 {wonText(LIST_PRICE)}으로 금액이 원상복구됩니다.
          </p>

          <article className="flea-buy-card">
            <span>플리마켓 한정 판매가</span>
            <h3>바로 주문하기</h3>
            <strong>{wonText(FLEA_PRICE)}</strong>
            <small>선착순 70명 예약하고, 과기대에서 수령하기</small>
            {buyCta("purchase_flea", `${wonText(FLEA_PRICE)}에 구매하기`)}
          </article>

          {/* 과기대 밖 지인에게 보내는 길이다. 여기만 상시 판매로 간다. */}
          <article className="flea-buy-card flea-buy-card--list">
            <h3>기존 가격대로 주문하기</h3>
            <strong>{wonText(LIST_PRICE)}</strong>
            <small>온라인 배송비 별도, 과기대 외 다른 지인에게 소개용</small>
            {buyCta(
              "purchase_list",
              `정가 ${wonText(LIST_PRICE)}에 구매하기`,
              "online"
            )}
          </article>

          <p className="gs-note">
            배송비 {wonText(SHIPPING_FEE)} 별도 · 두 방식 모두 동일한 맞춤 3D
            전신 피규어 제작
          </p>
        </section>

        {/* 09 */}
        <section className="gs-section flea-final" id="survey-start">
          <span className="gs-kicker">09 FINAL</span>
          <h2>
            지금의 우리 아이를,
            <br />
            지금 남겨두세요.
          </h2>
          <p className="gs-copy">
            오래 곁에 두고 싶은 모습 하나를 작은 피규어로 만들어드립니다.
          </p>

          <img
            className="gs-figure gs-figure--wide"
            src={`${ASSET_BASE}/flea-final.webp`}
            alt="반려견 사진과 함께 책상 위에 놓인 작은 맞춤 피규어"
            width="366"
            height="229"
            decoding="async"
          />
          <p className="gs-note">배송비 별도 · 준비 수량 소진 시 마감</p>

          {intake("intake_final")}
        </section>

        {/* 10 */}
        <section className="gs-section gs-faq-section" id="faq">
          <span className="gs-kicker">10 FAQ</span>
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
      </div>
    </main>
  );
}
