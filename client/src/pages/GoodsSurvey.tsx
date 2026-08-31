import { ArrowRight, Hourglass, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { setSurveyPhaseContext, trackEvent } from "@/lib/analytics/analytics";
import { usePageEngagement, useScrollDepth } from "@/lib/analytics/react";
import {
  GOODS_SURVEY_CAPACITY,
  getSurveyCampaign,
  type SurveyCampaign,
} from "@/lib/goodsSurveyApi";
import { saveGoodsSurveyPhotoHandoff } from "@/lib/goodsSurveyPhotoHandoff";
import {
  GOODS_PRICE,
  GOODS_SURVEY_DISCOUNT,
  wonText,
} from "./goodsSurveyContent";
import "./GoodsSurvey.css";

const CAMPAIGN = {
  duration: "약 10~15분",
  capacity: GOODS_SURVEY_CAPACITY,
  // 서버 응답이 오기 전에 쓰는 값이다. 실제 신청 수를 그대로 보여주기로 했으므로
  // 여기에 임의의 숫자를 두면 화면이 잠깐 사실과 다른 수를 보여준다.
  completed: 0,
} as const;

// 금액은 goodsSurveyContent.ts 한 곳에서만 관리한다. 설문 완료 화면도 같은 값을 쓴다.
const PRICE = GOODS_PRICE;
const won = wonText;

const ASSET_BASE = "/goods-survey";

/**
 * 버튼 식별자. 이동 목적지가 같아도 어느 자리의 버튼이 눌리는지 따로 봐야 한다.
 *
 * 이벤트 파라미터로만 쓰지 않고 data-cta-id로 DOM에도 내보낸다. Meta 이벤트 설정
 * 도구나 GTM 클릭 트리거는 DOM만 보는데, 구매 버튼 셋은 클래스도 문구도 비슷해서
 * 식별자가 없으면 같은 규칙에 겹쳐 잡힌다.
 *
 * A1~A5는 위에서 아래 순서, B는 화면 하단 고정 버튼이다.
 */
const CTA_IDS = {
  hero: "btn_A1",
  purchase_now: "btn_A2",
  purchase_survey: "btn_A3",
  wait: "btn_A4",
  final: "btn_A5",
  sticky: "btn_B",
} as const;

type Placement = keyof typeof CTA_IDS;

/**
 * 디자인(Figma 5423:1415)의 사진 열두 칸.
 *
 * 나혜님이 "이미지를 받지 않아서 플레이스홀더로 남겨 놓은 부분도 있다"고 했는데
 * 처음에는 전부로 읽고 열두 칸을 모두 비워 놨었다. 실제로는 아홉 칸에 사진이
 * 들어 있었고, 화면에는 회색 상자가 나가고 있었다.
 *
 * ready가 false인 셋(04 책상 위 · 05 3D 제작 · 05 수작업 검수)은 디자인에도
 * 체커보드다. 사진이 오면 public/goods-survey/ 에 같은 이름으로 넣고 ready만
 * true로 바꾼다. w·h는 디자인이 정한 크기이고, 늦게 불러오는 동안에도 자리가
 * 밀리지 않도록 두 축 모두 들고 있는다.
 */
type FigureSlot = {
  src: string;
  alt: string;
  w: number;
  h: number;
  ready: boolean;
};

/**
 * 사진은 WebP 다.
 *
 * 피그마에서 2배로 내려받은 것이 무손실 PNG(RGBA, 11~14 bpp)였다. 사진을
 * 무손실로 담으면 이렇게 된다 — 랜딩 한 장이 3.85MB 였고, 그 95%가 이미지였다.
 * 같은 크기·같은 그림을 WebP 로 다시 담아 0.24MB 가 됐다(-94%). 연속 톤 사진은
 * q82~q88(PSNR 38~41dB, 육안 구분 불가), 경계가 날카로운 도장·화살표·아바타는
 * 무손실이라 픽셀이 그대로다. 도장을 q82 로 담으면 17dB 로 뭉개진다.
 *
 * 아직 사진이 없는 세 칸은 .png 이름이 남아 있다. 파일이 없으니
 * 받아 올 것도 없고, 화면에는 준비 중 무늬가 대신 들어간다. 사진이 오면 그때
 * WebP 로 만들어 넣는다.
 */
const FIGURES: Record<string, FigureSlot> = {
  hero: {
    src: "sales-hero-figure.webp",
    alt: "크림색 포메라니안과 같은 모습을 본뜬 작은 전신 피규어",
    w: 376,
    h: 286,
    ready: true,
  },
  whyNow: {
    src: "sales-why-now.webp",
    alt: "햇살이 드는 창가에서 편안하게 쉬는 크림색 포메라니안",
    w: 376,
    h: 286,
    ready: true,
  },
  figureCompare: {
    src: "sales-figure-compare.webp",
    alt: "반려견 사진과 같은 특징을 살려 제작한 맞춤 피규어 비교",
    w: 376,
    h: 286,
    ready: true,
  },
  proof: {
    src: "sales-proof-desk.png",
    alt: "책상 위 사진 곁에 놓인 작은 반려견 피규어",
    w: 376,
    h: 252,
    ready: false,
  },
  stepFace: {
    src: "sales-step-face.webp",
    alt: "반려견 얼굴 사진",
    w: 105,
    h: 158,
    ready: true,
  },
  stepBody: {
    src: "sales-step-body.webp",
    alt: "반려견 전신 사진",
    w: 105,
    h: 158,
    ready: true,
  },
  stepCoat: {
    src: "sales-step-coat.webp",
    alt: "반려견 털색과 무늬 사진",
    w: 105,
    h: 158,
    ready: true,
  },
  stepTrait: {
    src: "sales-step-trait.webp",
    alt: "반려견 사진과 피규어의 특징을 대조하는 과정",
    w: 330,
    h: 244,
    ready: true,
  },
  stepPrint: {
    src: "sales-step-print.png",
    alt: "모니터의 3D 모델과 출력기, 출력물을 검수하는 제작 스튜디오",
    w: 330,
    h: 244,
    ready: false,
  },
  stepFinish: {
    src: "sales-step-finish.png",
    alt: "작은 반려견 피규어를 손으로 정교하게 마감하는 작업 장면",
    w: 330,
    h: 244,
    ready: false,
  },
  limited: {
    src: "sales-limited-shelf.webp",
    alt: "여러 종류의 완성 반려견 피규어가 진열된 모습",
    w: 376,
    h: 252,
    ready: true,
  },
  final: {
    src: "sales-final-desk.webp",
    alt: "반려견 사진과 함께 책상 위에 놓인 작은 맞춤 피규어",
    w: 376,
    h: 270,
    ready: true,
  },
};

/** 디자인 10 FAQ의 일곱 문답. 여기에 임의로 더하지 않는다. */
const faqs = [
  {
    question: "설문을 하지 않아도 구매할 수 있나요?",
    answer: `네. ${won(PRICE.presale)}으로 바로 구매할 수 있으며 설문은 선택 사항입니다.`,
  },
  {
    question: "설문하면 무엇이 달라지나요?",
    answer: `약 10~15분 설문 완료 시 2차 제작비 지원가 ${won(PRICE.member)}으로 구매할 수 있습니다.`,
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
    answer: `배송비 ${won(PRICE.shipping)}은 별도이며 정확한 제작 기간은 주문 단계에서 안내합니다.`,
  },
  {
    question: "광고 수신에 동의해야 할인받을 수 있나요?",
    answer: "아니요. 광고성 정보 수신 동의는 선택 사항입니다.",
  },
];

/** 05 PROCESS의 네 단계. 각 단계마다 제작 장면 사진이 붙는다(코멘트 #11). */
const processSteps = [
  {
    number: "01",
    title: "사진 3장",
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
    figures: [FIGURES.stepPrint],
  },
  {
    number: "04",
    title: "수작업 검수",
    caption: "세척·표면 마감·상태 확인 후 포장",
    figures: [FIGURES.stepFinish],
  },
];

/**
 * 07 VOICES의 후기 세 개.
 *
 * 아직 검증된 후기가 아니다. 실제 문장을 확보하기 전까지는 후기처럼 보이는
 * 예시일 뿐이라, 카드마다 그 사실을 함께 적는다(코멘트 #18은 "좀 더 실제
 * 리뷰 작성된 것처럼"이지만, 확보 전에 진짜처럼 두는 것은 없는 후기를
 * 지어내는 것과 같다).
 */
const voices = [
  { who: "1차 참여자 A", text: "귀 모양 보고 바로 우리 애인 줄 알았어요." },
  {
    who: "1차 참여자 B",
    text: "책상 위에 두니까 사진이랑은 또 다른 느낌이에요.",
  },
  { who: "1차 참여자 C", text: "작은데 우리 아이 특징이 보여서 신기했어요." },
];

function LandingFigure({
  slot,
  className = "",
}: {
  slot: FigureSlot;
  className?: string;
}) {
  if (!slot.ready) {
    return (
      <div
        className={`gs-figure gs-figure--pending ${className}`.trim()}
        role="img"
        aria-label={slot.alt}
        style={{ aspectRatio: `${slot.w} / ${slot.h}` }}
      >
        <span>{slot.alt}</span>
      </div>
    );
  }

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

/**
 * 09 FINAL 의 사진 등록 카드(Figma Article 5425:1411).
 *
 * 칸마다 무엇을 찍어야 하는지가 정해져 있다. 아무 사진 세 장이 아니라
 * 얼굴·전신·털무늬 세 종이고, 그게 제작에 필요한 최소 구성이다.
 */
const INTAKE_SLOTS = [
  { key: "face", label: "정면 또는 옆모습" },
  { key: "body", label: "몸 전체가 보이게" },
  { key: "coat", label: "특징이 잘 보이게" },
] as const;

// 주문 화면(GoodsSurveyForm)이 받는 조건과 같아야 한다. 여기서 통과한
// 사진이 그쪽에서 거부되면 사람은 같은 파일을 두 번 거절당한다.
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

function PhotoIntakeCard({ onSubmit }: { onSubmit: (files: File[]) => void }) {
  const [picked, setPicked] = useState<(File | null)[]>(() =>
    INTAKE_SLOTS.map(() => null)
  );
  const [previews, setPreviews] = useState<(string | null)[]>(() =>
    INTAKE_SLOTS.map(() => null)
  );
  const [error, setError] = useState("");

  const chosen = picked.filter(Boolean).length;
  const ready = chosen === INTAKE_SLOTS.length;

  useEffect(() => {
    const urls = picked.map(file => (file ? URL.createObjectURL(file) : null));
    setPreviews(urls);
    return () => {
      urls.forEach(url => url && URL.revokeObjectURL(url));
    };
  }, [picked]);

  const choose = (index: number, file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) {
      setError("사진은 JPG·PNG·WEBP 형식, 장당 10MB 이하만 올릴 수 있어요.");
      return;
    }
    setError("");
    setPicked(previous =>
      previous.map((current, position) => (position === index ? file : current))
    );
  };

  return (
    <div className="gs-intake">
      <div className="gs-intake-head">
        <div>
          <span>사진 등록</span>
          <strong>
            우리 아이 사진을
            <br />
            추가해주세요.
          </strong>
        </div>
        <em className="gs-intake-count">
          {chosen}/{INTAKE_SLOTS.length}
        </em>
      </div>

      <p className="gs-intake-lead">
        사진을 누르면 앨범에서 바로 추가할 수 있어요.
      </p>

      <div className="gs-intake-slots">
        {INTAKE_SLOTS.map(({ key, label }, index) => (
          <label
            className={`gs-intake-slot${previews[index] ? " is-filled" : ""}`}
            key={key}
          >
            {previews[index] ? (
              <img src={previews[index] ?? ""} alt={`${label} 사진 미리보기`} />
            ) : (
              <>
                <i aria-hidden="true">+</i>
                <span>{label}</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={event => {
                choose(index, event.target.files?.[0]);
                // 같은 파일을 다시 고를 수 있어야 한다.
                event.target.value = "";
              }}
              aria-label={`${label} 사진 추가하기`}
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="gs-intake-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="gs-intake-submit"
        data-cta-id={CTA_IDS.final}
        disabled={!ready}
        onClick={() =>
          onSubmit(picked.filter((file): file is File => file !== null))
        }
      >
        사진 {INTAKE_SLOTS.length}장 등록하기
      </button>

      <small>사진은 주문 단계에서 최종 제출됩니다.</small>
    </div>
  );
}

function PrimaryCta({
  onClick,
  ctaId,
  label,
  compact = false,
  disabled = false,
  disabledLabel = "지금은 신청할 수 없어요",
}: {
  onClick: () => void;
  ctaId?: string;
  label: string;
  compact?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
}) {
  return (
    <button
      type="button"
      data-cta-id={ctaId}
      className={`gs-primary-cta${compact ? " gs-primary-cta--compact" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{disabled ? disabledLabel : label}</span>
      <ArrowRight aria-hidden="true" />
    </button>
  );
}

export default function GoodsSurvey() {
  const [, setLocation] = useLocation();
  // 열려 있으면 어느 버튼에서 왔는지 담는다. 닫혀 있으면 null이다.
  const [ctaPlacement, setCtaPlacement] = useState<Placement | null>(null);
  const [campaign, setCampaign] = useState<SurveyCampaign | null>(null);
  const capacity = campaign?.capacity ?? CAMPAIGN.capacity;
  const completed = campaign?.allocated ?? CAMPAIGN.completed;
  const remaining = campaign?.remaining ?? capacity - completed;
  // 유료로 전환하면서 수량을 막지 않는 모집이 생겼다. 그때 서버는 남은 자리를
  // 셀 수 없다는 뜻으로 -1을 준다. 선착순 화면은 정원이 있을 때만 뜻이 있다.
  const hasSlotLimit = remaining >= 0 && capacity > 0;
  const completedPercent = hasSlotLimit ? (completed / capacity) * 100 : 0;
  // 설문과 굿즈는 서로 다른 스위치로 열리고 닫힌다. 기본값을 반대로 두는 이유는
  // 각각 틀렸을 때 덜 나쁜 쪽으로 넘어지게 하기 위해서다. 설문이 잘못 열리면
  // 서버가 거부할 뿐이지만, 굿즈가 잘못 열리면 지킬 수 없는 약속이 화면에 뜬다.
  const surveyAvailable = campaign?.surveyOpen ?? true;
  const goodsAvailable = campaign?.goodsOpen ?? false;
  usePageEngagement("goods_survey_landing", "landing_view");
  useScrollDepth("goods_survey_landing");

  /**
   * 설문 CTA를 누르면 설문으로 바로 보내지 않고 안내를 한 번 보여준다.
   *
   * 설문이 10~15분짜리라, 무엇을 받는지 모른 채 들어가면 중간에 나간다.
   * 구매 CTA에는 이 단계를 두지 않는다. 사러 온 사람을 한 번 더 세우면
   * 그게 코멘트 #27이 지적한 불필요한 뎁스다.
   */
  const openCta = (placement: Placement) => {
    if (!surveyAvailable) return;
    trackEvent("survey_cta_click", {
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
   * 판매를 앞세운 화면이라 이 길이 기본이다. 설문에 답하면 더 싸다는 것을
   * 같은 화면에서 이미 보여준 뒤에 누르는 버튼이라, 여기서 다시 붙잡지 않는다.
   * 값이 갈리는 것은 서버가 판정한다.
   */
  const startDirectPurchase = (placement: Placement) => {
    trackEvent("survey_cta_click", {
      cta_id: CTA_IDS[placement],
      cta_placement: `${placement}_direct_purchase`,
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

  /** 구매 버튼은 굿즈 스위치가 켜져 있을 때만 그린다. */
  const buyCta = (placement: Placement, label: string, compact = false) =>
    goodsAvailable ? (
      <PrimaryCta
        ctaId={CTA_IDS[placement]}
        onClick={() => startDirectPurchase(placement)}
        label={label}
        compact={compact}
      />
    ) : (
      <p className="gs-note">2차 오픈 시 신청할 수 있어요</p>
    );

  return (
    <main className="goods-survey-page">
      <div className="gs-phone">
        <header className="gs-topbar">
          {/* 자기 자신(/goods-survey)을 가리키고 있었다. 랜딩으로 들어온
              사람이 웹사이트로 되돌아갈 길이 없었다. */}
          <a href="/" className="gs-wordmark">
            <img
              src={`${ASSET_BASE}/paw-ever-logo.svg`}
              alt="PAW-EVER"
              width="118"
              height="16"
            />
          </a>
          <span>2차 참여자 모집중</span>
        </header>

        {/* 01 — 사러 온 사람에게 무엇을 파는지 먼저 말한다(코멘트 #8).
            디자인의 구간 이름은 '01.구매가 1순위'라는 내부 메모였다. 다른
            구간이 전부 'NN ENGLISH'라 같은 형식으로 맞췄다. */}
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
            <strong>{won(PRICE.presale)}</strong>
            <small>
              배송비 {won(PRICE.shipping)} 별도 · 사진 3장 제출 · 수작업 검수
            </small>
          </div>

          {buyCta("hero", `${won(PRICE.presale)}에 우리 아이 피규어 구매하기`)}

          {/* 구매 버튼에서 아래 '더 싼 길' 카드로 눈을 내려 준다(5423:1457). */}
          <img
            className="gs-hero-arrow"
            src={`${ASSET_BASE}/down-arrow.webp`}
            alt=""
            width="197"
            height="84"
            decoding="async"
          />

          {/* 설문은 같은 자리에서 '더 싼 길'로만 안내한다. 코멘트 #15가 세운
              위계 — 바로 구매가 위, 설문 후 구매가 아래 — 를 여기서부터 지킨다. */}
          <div className="gs-hero-sub">
            <span>설문으로 할인은 처음이죠</span>
            <strong className="gs-hero-sub-price">
              설문 참여 시 {won(PRICE.member)}
            </strong>
            <small>설문하지 않아도 바로 구매할 수 있어요</small>
          </div>
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

          {/* 1차 참여자에게 받은 실제 메시지다. 문장을 다듬지 않고 그대로 둔다. */}
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
                // 디자인은 두 장 모두 같은 이름, 별점은 4점이다. 받은 그대로 둔다.
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
                  {/* 디자인은 못 받은 별이 앞쪽에 회색으로 남는다. */}
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

          <LandingFigure
            slot={FIGURES.figureCompare}
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
          <h2>
            1차 모집 선착순 {CAMPAIGN.capacity}명,
            <br />
            하루 만에 마감됐습니다.
          </h2>
          <p className="gs-copy">
            {CAMPAIGN.capacity}개의 피규어를 직접 제작하며 소중한 모습을 담기
            위해 사진 선택, 모델링, 출력과 검수 방식을 지속해서 발전시키고
            있습니다.
          </p>

          {/* 코멘트 #14: '하루만에' '선착순' '100명' 마감 강조.
              코멘트 #20: 마감되었다 글자 밑에 도장 이미지로 팍. */}
          <div className="gs-closed-card">
            <span>1차 체험단</span>
            <strong>{CAMPAIGN.capacity}명 모집 완료</strong>
            <small>오픈 하루 만에 신청이 마감됐어요</small>
            {/* 디자인이 카드를 가로지르게 키워 둔 실물 도장이다(5423:1520).
                문구는 위 세 줄이 이미 말하므로 그림에는 대체 텍스트를 두지 않는다. */}
            {/* lazy 로 두면 절대배치 + overflow:hidden 조합에서 브라우저가
                가시 판정을 못 해 끝내 안 불러온다. 실제로 화면에서 도장이
                통째로 사라졌다. 작은 장식이라 바로 받는다. */}
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
              [`${CAMPAIGN.capacity}명`, "1차 체험단"],
              ["1일", "모집 마감"],
              [`${CAMPAIGN.capacity}개`, "직접 제작"],
            ].map(([value, label]) => (
              <div key={label}>
                <strong>{value}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>

          <LandingFigure slot={FIGURES.proof} className="gs-figure--wide" />

          <p className="gs-note">
            ※ 사진의 화질·각도와 3D 출력 특성에 따라 실제 반려견과 색상 및
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
                    figures.length > 1 ? " is-triple" : ""
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
          <h2>이번에도 {CAMPAIGN.capacity}개만 제작합니다.</h2>
          <p className="gs-copy">
            사진을 보고 특징을 정리하고, 출력 상태를 하나씩 확인해야 하는 맞춤
            제작입니다. 그래서 2차 역시 제대로 만들 수 있는 수량만 오픈합니다.
          </p>

          <div className="gs-limit-card">
            <span>2차 준비 수량</span>
            <strong>1차 제작 데이터를 확인한 뒤 공개</strong>
            <small>
              2주 동안 안정적으로 제작 가능한 수량에서 재제작 여유분을 제외해
              확정합니다.
            </small>
          </div>

          <LandingFigure slot={FIGURES.limited} className="gs-figure--wide" />
        </section>

        <section className="gs-section gs-voices">
          <span className="gs-kicker">07 VOICES</span>
          <h2>
            가족들이 알아본
            <br />
            ‘우리 아이’의 모습.
          </h2>

          <div className="gs-voice-list">
            {voices.map(({ who, text }) => (
              <article className="gs-voice" key={who}>
                <header>
                  {/* 작성자 자리. 실제 사진을 받기 전까지는 빈 원으로 둔다. */}
                  <i className="gs-voice-avatar" aria-hidden="true" />
                  <div>
                    <strong>{who}</strong>
                    <span>구매·제작 참여 확인</span>
                  </div>
                  <span className="gs-voice-stars" aria-label="별점 5점">
                    ★★★★★
                  </span>
                </header>
                <p>{text}</p>
                <small>
                  ※ 실제 후기 확보 후 검증된 문장과 참여자 정보로 교체
                </small>
              </article>
            ))}
          </div>

          {/* 코멘트 #25: 지난번 랜딩처럼 수량이 계속 줄고 있는 모습 보여주기.
              디자인에는 1차 무료 체험단 때 쓰던 수식어가 그대로 남아 있었다.
              2차는 29,900원을 받는 판매라 옮겨 적으면 화면이 거짓말을 한다. */}
          {goodsAvailable && hasSlotLimit && (
            <div
              className="gs-remaining-card"
              data-remaining={remaining}
              aria-label={`선착순 ${capacity}명 중 ${remaining}명 남음`}
            >
              <span>
                <Hourglass aria-hidden="true" />
                선착순 {capacity}명 한정
              </span>
              <h3>
                지금 <em>{remaining}명</em>만 더 받을 수 있어요!
              </h3>
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
          )}
        </section>

        {/* 08 — 두 갈래를 나란히 놓되 바로 주문이 위다(코멘트 #15). */}
        <section className="gs-section gs-purchase" id="offer">
          <span className="gs-kicker">08 PURCHASE</span>
          <h2>설문은 구매 조건이 아닙니다. 원하는 방식으로 선택하세요.</h2>

          <div className="gs-buy-cards">
            <article className="gs-buy-card">
              <span>가장 간단하게</span>
              <h3>바로 주문하기</h3>
              <strong>{won(PRICE.presale)}</strong>
              <p>설문 없이 바로 구매</p>
              {buyCta("purchase_now", `${won(PRICE.presale)}에 구매하기`, true)}
            </article>

            <article className="gs-buy-card is-member">
              <span>조금 더 저렴하게</span>
              <h3>설문과 함께 주문하기</h3>
              <strong>{won(PRICE.member)}</strong>
              <p>
                {CAMPAIGN.duration} 설문 참여 · {won(GOODS_SURVEY_DISCOUNT)}{" "}
                할인
              </p>
              <PrimaryCta
                ctaId={CTA_IDS.purchase_survey}
                onClick={() => openCta("purchase_survey")}
                label={`설문 참여하고 ${won(PRICE.member)}에 구매하기`}
                compact
                disabled={!surveyAvailable}
                disabledLabel="설문 접수 마감"
              />
            </article>
          </div>

          <p className="gs-note">
            배송비 {won(PRICE.shipping)} 별도 · 두 방식 모두 동일한 맞춤 3D 전신
            피규어 제작
          </p>
        </section>

        {/* 코멘트 #24: 여기 위에 노란색 손모양으로 직관적이고 강렬하게 '잠깐!'.
            설문 설득은 구매 갈림길 뒤에 온다. 앞에 두면 다시 설문 랜딩이 된다. */}
        <section className="gs-section gs-wait" id="why-survey">
          <p className="gs-wait-hand" aria-hidden="true">
            ✋
          </p>

          {/* 잠깐!·제목·이유는 한 장의 카드다(5423:1750). 배경 위에 흩어 두면
              구매 갈림길을 끊고 들어오는 힘이 없다. */}
          <div className="gs-wait-card">
            <span>잠깐!</span>
            <h2>
              {/* 파는 값이 아니라 깎아 주는 액수를 묻는다. 그래야 아래 답이
                  '설문에 참여해주셔서'로 이어진다(8/30 디자인 수정). */}
              그런데 왜 {won(GOODS_SURVEY_DISCOUNT)}이나 저렴하게
              <br />
              구매할 수 있나요?
            </h2>
            <p>
              포에버는 반려동물과 함께한 오늘을 기록하고, 필요한 순간의 돌봄으로
              이어지는 서비스를 만들고 있습니다. 실제 반려인의 경험을 더 정확히
              듣기 위해 설문에 참여해주신 분께 2차 제작비 일부를 지원합니다.
            </p>
          </div>

          {/* 코멘트 #10: 가격 깎이는 걸 더 직관적으로 크게. */}
          <div className="gs-wait-drop">
            <span>{CAMPAIGN.duration} 설문 참여</span>
            <strong>
              {/* 화살표는 깎인 쪽에 붙는다. 디자인에서 주황 글자 한 덩어리다. */}
              <s>{won(PRICE.presale)}</s> <em>→ {won(PRICE.member)}</em>
            </strong>
            <small>구매 의무 없음 · 광고성 정보 수신 선택</small>
          </div>

          <PrimaryCta
            ctaId={CTA_IDS.wait}
            onClick={() => openCta("wait")}
            label={`15분 설문하고 ${won(PRICE.member)} 혜택 받기`}
            disabled={!surveyAvailable}
            disabledLabel="설문 접수 마감"
          />
        </section>

        <section className="gs-section gs-final" id="survey-start">
          <span className="gs-kicker">09 FINAL</span>
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

          {/* 디자인의 09 FINAL 은 구매 버튼이 아니라 사진 등록 카드로 끝난다
              (Article 인스턴스 5425:1470). 대표 코멘트 #27 이 가리킨 자리다. */}
          {goodsAvailable ? (
            <PhotoIntakeCard
              onSubmit={files => {
                // 서버로 보내지 않고 다음 화면까지만 들고 간다.
                saveGoodsSurveyPhotoHandoff(files);
                startDirectPurchase("final");
              }}
            />
          ) : (
            <p className="gs-note">2차 오픈 시 신청할 수 있어요</p>
          )}
        </section>

        {/* 코멘트 #13: 자주 묻는 질문 최하단 이동. */}
        <section className="gs-section gs-faq-section" id="faq">
          <span className="gs-kicker">10 FAQ</span>
          <h2>자주 묻는 질문</h2>
          {/* 디자인은 일곱 개가 전부 닫혀 있다. 하나를 열어 두면 그 답만 읽힌다. */}
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

        {/* 아래 두 단락은 디자인에 없지만 뺄 수 없다. 제품 안전 고지와 개인정보
            처리 안내는 판매 화면이 지고 있는 의무다. */}
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
            설문 응답과 연락처는
            <br />
            필요한 목적에만 사용합니다.
          </h2>
          <ul>
            <li>설문 응답: 서비스 연구와 통계 분석</li>
            <li>이메일 주소: 참여자 식별과 선택한 알림 발송</li>
            <li>반려견 사진: 구매 후 피규어 제작</li>
            <li>배송지: 구매가 확정된 뒤 배송 목적</li>
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

        {/* 화면 하단 고정 버튼도 판매를 앞세운다. 굿즈가 닫혀 있을 때만
            설문으로 보낸다 — 그때는 그게 유일하게 할 수 있는 일이다. */}
        <div className="gs-stickybar">
          {goodsAvailable ? (
            <button
              type="button"
              data-cta-id={CTA_IDS.sticky}
              onClick={() => startDirectPurchase("sticky")}
            >
              <span>
                {won(PRICE.presale)}에 구매하기
                <small>설문 참여 시 {won(PRICE.member)} · 배송비 별도</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              data-cta-id={CTA_IDS.sticky}
              onClick={() => openCta("sticky")}
              disabled={!surveyAvailable}
            >
              <span>
                {surveyAvailable
                  ? `설문하고 ${won(PRICE.member)} 혜택 받기`
                  : "설문 접수 마감"}
                <small>구매 의무 없음 · 광고성 정보 수신 선택</small>
              </span>
              <ArrowRight aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {/* 설문에 10~15분을 들이기 전에 무엇을 받는지 먼저 보여준다. */}
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
              {won(PRICE.member)}에 구매할 수 있어요
            </h2>
            <p>
              실제 반려인의 경험을 더 정확히 듣기 위한 설문입니다. 응답은 제품
              선택과 서비스 설계에 직접 쓰입니다.
            </p>
            <div className="gs-modal-price">
              <span>{CAMPAIGN.duration} 설문을 완료하면</span>
              <p>
                <s>{won(PRICE.presale)}</s>
              </p>
              <strong>설문 참여자 전용가 {won(PRICE.member)}</strong>
            </div>
            <p className="gs-modal-terms">
              배송비 별도 · 구매 의무 없음 · 광고성 정보 수신 선택
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
