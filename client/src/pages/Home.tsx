import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { getSurveyCampaign } from "@/lib/goodsSurveyApi";
import { useEffect, useState } from "react";
import { Link } from "wouter";

/**
 * 포에버 홈.
 *
 * 6~11세 반려견의 일상·건강 변화를 쌓아 병원 상담 준비까지 잇는 흐름을 보여준다.
 * 방문자가 앱·굿즈·설문 중 지금 필요한 길을 고르게 하는 것이 이 화면의 일이다.
 *
 * 피그마 8. Website / Identify and Connect Home Component > PawEverHome
 * (5200:1448) 기준이다.
 *
 * 값은 get_design_context 가 준 CSS 다. 예전에는 좌표만 받아서 글자 크기를
 * "피그마 텍스트 폭 ÷ 브라우저 실측 폭"으로 역산했고, 그래서 36→35, 23→19,
 * 34→32 처럼 크기가 조금씩 어긋나 있었다. 버튼 높이·모서리·굵기처럼
 * 좌표에 잡히지 않는 것은 아예 다른 값이었다.
 */

/** 굿즈 줄에 깔리는 강조 배경. 앱 버튼도 같은 색을 쓴다. */
const HIGHLIGHT_BG = "#FFF9F3";
/** 히어로 보조 버튼과 향후 방향 버튼 배경. */
const SOFT_BUTTON_BG = "#FFF0E0";
/**
 * 설문 버튼 배경.
 *
 * --primary(#FF9F43)와 다른 주황이다. 굿즈 버튼이 --primary 라서 나란히 두면
 * 설문 쪽이 아주 조금 밝다. 피그마가 그렇게 나눠 두었다.
 */
const SURVEY_BUTTON_BG = "#FFA94E";
/** 히어로 눈썹 글자. 흰색이 아니라 살구빛이 도는 흰색이다. */
const HERO_EYEBROW = "#FFF0E0";
/** 히어로 본문과 실적 설명. 순백보다 한 단계 낮다. */
const HERO_BODY = "#F6F6F6";

/** 공통 버튼 모양. 피그마는 일곱 버튼이 모두 같은 높이·모서리다. */
const BUTTON =
  "inline-flex h-[50px] items-center justify-center rounded-[12px] px-6 text-base font-semibold transition-colors";

/** 설문을 건너뛰고 곧장 주문으로 — 대표님 요청 3번의 첫 갈래다. */
const DIRECT_PURCHASE = "/goods-survey/survey?direct=1";
/** 굿즈를 팔지 않는 동안 신청 버튼이 대신 가는 곳. */
const GOODS_LANDING = "/goods-survey";

const CARE_STEPS = [
  {
    number: "01",
    title: "오늘의 30초 케어 기록",
    body: "식사, 산책, 수면처럼 매일 보이는 변화를 짧게 남겨요.",
  },
  {
    number: "02",
    title: "주간 변화 비교",
    body: "지난 기록과 나란히 보며 달라진 점을 놓치지 않아요.",
  },
  {
    number: "03",
    title: "병원 준비 요약",
    body: "관찰한 내용을 정리해 진료 상담 전 정보를 준비해요.",
  },
];

/**
 * 히어로 아래에 깔리는 실적.
 *
 * 사진 위에 흰 글씨로 얹는다. 카드로 감싸지 않는다 — 피그마가 배경 사진을
 * 그대로 살리고 글자만 올렸다.
 */
const HIGHLIGHTS = [
  {
    title: "반려인 731명 조사 완료",
    body: "반려견 생애주기에 따른 보호자의 행동 데이터를 모았습니다.",
  },
  {
    title: "우리 아이 완전 맞춤 3D굿즈 100건 제작 중",
    body: "보호자의 사진과 이야기를 바탕으로 한 맞춤 제작을 이어가고 있습니다.",
  },
];

/**
 * 세 가지 길.
 *
 * 카드 세 장이 아니라 가로 줄 세 개다. 왼쪽에 갈래 이름, 가운데 설명,
 * 오른쪽에 버튼이 선다.
 *
 * proof: 그 길이 어디까지 왔는지. 앱은 비워 둔다 — 피그마도 비워 두었고,
 * 없는 수를 지어내지 않는다.
 *
 * variant: 굿즈와 설문만 주황 버튼이다. 앱은 조용한 버튼으로 둔다. 셋 다
 * 같은 무게로 두면 지금 밀어야 할 길이 묻힌다.
 */
const ENTRY_POINTS = [
  {
    category: "기록과 케어",
    title: "포에버 앱",
    body: "오늘의 변화를 기록하고 반려견의 일상과 건강 흐름을 한곳에서 확인하세요.",
    proof: "",
    proofNote: "",
    secondary: null,
    action: "앱 서비스 살펴보기 →",
    underlined: false,
    href: "/app",
    variant: "quiet" as const,
    highlighted: false,
  },
  {
    category: "우리 아이 맞춤 제작",
    title: "3D 맞춤 굿즈 얼리버드",
    body: "사진 속 우리 아이의 특징을 담은 맞춤 굿즈 제작 흐름을 확인하세요.",
    proof: "우리 아이 완전 맞춤 3D굿즈 100건 제작 중",
    proofNote: "",
    secondary: { label: "맞춤 굿즈 얼리버드 보기 →", href: "/goods-survey" },
    action: "굿즈 얼리버드 신청하기",
    // 일곱 버튼 중 이것만 글자에 밑줄이 있다. 확대해 보기 전에는 안 보였다.
    underlined: true,
    // 설문을 건너뛰고 곧장 신청으로 간다 — 대표님 요청 3번의 첫 갈래다.
    // 이 길은 29,900원이고 설문을 거치는 길은 23,900원이다. 바로 아래
    // '보기 →' 가 랜딩으로 가는 길을 따로 열어 둔다.
    href: DIRECT_PURCHASE,
    variant: "primary" as const,
    highlighted: true,
  },
  {
    category: "함께 만드는 다음 서비스",
    title: "반려인 설문",
    body: "15분 설문으로 지금 필요한 케어와 서비스에 대한 경험을 들려주세요.",
    proof: "반려인 731명 조사 완료",
    proofNote: "(2026. 08. 12 기준)",
    secondary: null,
    action: "15분 설문 참여하기",
    underlined: false,
    href: "/goods-survey/survey",
    variant: "survey" as const,
    highlighted: false,
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-base font-medium leading-6 text-primary">
      {children}
    </p>
  );
}

/** 구역 제목. 네 곳이 같은 값이다. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-3xl font-bold tracking-[-0.9px] md:text-[36px] md:leading-[45px]">
      {children}
    </h2>
  );
}

export default function Home() {
  /**
   * 굿즈를 지금 팔 수 있는지.
   *
   * 랜딩은 이 값을 보고 구매 버튼을 지우는데 홈은 보지 않았다. 그래서 굿즈를
   * 닫아 둔 동안에도 여기 신청 버튼이 주문 화면까지 사람을 들여보냈다. 서버가
   * 접수를 거절하니 결제까지 가지는 않지만, 사진·주소·연락처를 다 넣은 뒤에
   * 막히는 막다른 길이었다.
   *
   * 기본값은 랜딩과 같이 닫힘이다. 열려 있는데 랜딩으로 보내는 것은 한 번 더
   * 누르면 되는 일이고, 닫혀 있는데 주문으로 보내는 것은 개인정보를 받아 놓고
   * 거절하는 일이다. 틀렸을 때 덜 나쁜 쪽으로 넘어진다.
   */
  const [goodsOpen, setGoodsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void getSurveyCampaign()
      .then(campaign => {
        if (!cancelled) setGoodsOpen(campaign.goodsOpen);
      })
      .catch(() => {
        // 못 읽으면 닫힌 채로 둔다. 위 기본값 그대로다.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * 신청 버튼이 갈 곳.
   *
   * 닫혀 있으면 랜딩으로 보낸다. 랜딩은 닫힌 상태를 설명할 줄 알고
   * ("2차 오픈 시 신청할 수 있어요") 설문으로 가는 길도 함께 열어 둔다.
   * 주문 화면에는 그 말을 할 자리가 없다.
   */
  const buyHref = (href: string) =>
    href === DIRECT_PURCHASE && !goodsOpen ? GOODS_LANDING : href;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* 히어로 — 배경 사진이 화면 끝까지 간다 */}
        <section
          className="relative bg-[#B25E2A] bg-cover bg-center"
          style={{ backgroundImage: "url(/home/hero.png)" }}
        >
          {/* 좁은 화면에서는 사진 가운데가 잘려 글자가 묻힌다. 그때만 덮는다. */}
          <div
            className="absolute inset-0 bg-black/25 lg:hidden"
            aria-hidden="true"
          />

          <div className="relative mx-auto flex w-full max-w-[1360px] flex-col justify-between gap-16 px-6 py-16 lg:min-h-[720px] lg:pb-[58px] lg:pt-[88px]">
            <div className="lg:pt-[82px]">
              <p
                className="text-base font-semibold leading-6"
                style={{ color: HERO_EYEBROW }}
              >
                함께 있는 오늘부터 시작하는 생애주기 케어
              </p>
              {/* 제목만 칸(658px)보다 넓게 나간다. 오른쪽이 비어 있어서
                  피그마도 그렇게 두 줄로 흘려 두었다. */}
              <h1 className="max-w-[920px] pt-4 text-3xl font-bold tracking-[-1.3px] text-white md:text-[52px] md:leading-[60.84px]">
                우리 아이, 예전과 무엇이 달라졌는지 기록으로 확인하세요.
              </h1>
              <p
                className="max-w-[590px] pt-6 text-lg leading-[30.24px]"
                style={{ color: HERO_BODY }}
              >
                포에버(PAW-EVER)는 6~11세 반려견의 일상과 건강 변화를 쌓고
                필요한 케어와 병원 상담 준비를 돕습니다.
              </p>
              <div className="flex flex-wrap gap-3 pt-8">
                <Link
                  href="/service"
                  className={`${BUTTON} bg-primary text-xl text-white hover:bg-primary/90`}
                >
                  나에게 맞는 서비스 찾기
                </Link>
                <Link
                  href="/goods-survey/survey"
                  className={`${BUTTON} text-xl text-foreground hover:brightness-95`}
                  style={{ backgroundColor: SOFT_BUTTON_BG }}
                >
                  15분 설문으로 의견 남기기
                </Link>
              </div>
            </div>

            <ul className="grid gap-8 pt-[22px] sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-[90px]">
              {HIGHLIGHTS.map(item => (
                <li key={item.title}>
                  <p className="text-xl font-bold leading-7 tracking-[-0.3px] text-white">
                    {item.title}
                  </p>
                  <p
                    className="pt-2 text-[15px] leading-6"
                    style={{ color: HERO_BODY }}
                  >
                    {item.body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 기록에서 케어로 이어지는 흐름 */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[94px]">
            <Eyebrow>매일의 기록이 다음 케어로</Eyebrow>
            <SectionTitle>작은 변화를 알아보는 가장 쉬운 흐름</SectionTitle>
            {/* 카드로 감싸지 않는다. 피그마는 테두리 없이 세 칸으로 나눠 뒀다. */}
            <ol className="grid gap-10 pt-12 md:grid-cols-3 md:gap-14">
              {CARE_STEPS.map(step => (
                <li key={step.number}>
                  <p className="text-sm font-bold leading-[19.6px] text-primary">
                    STEP {step.number}
                  </p>
                  <h3 className="pt-[19px] text-xl font-semibold leading-7 tracking-[-0.3px]">
                    {step.title}
                  </h3>
                  <p className="pt-2.5 text-base leading-[26.4px] text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
            {/* 본문보다 흐리다. 고지이지 읽어야 할 문장이 아니다. */}
            <p className="pt-10 text-sm leading-[21.7px] text-[rgba(102,112,133,0.57)]">
              * 포에버의 기록은 진단이나 치료 지시가 아닌, 보호자의 관찰과 병원
              상담 준비를 돕기 위한 정보입니다.
            </p>
          </div>
        </section>

        {/* 시작하는 세 가지 방법 */}
        <section className="bg-card">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[94px]">
            <Eyebrow>지금 필요한 길을 선택하세요.</Eyebrow>
            <SectionTitle>포에버를 시작하는 세 가지 방법</SectionTitle>

            <ul className="pt-10">
              {ENTRY_POINTS.map(entry => (
                <li
                  key={entry.title}
                  // 강조 블록만 배경을 깐다. 줄 사이에 구분선은 없다 —
                  // 피그마에서 선처럼 보이던 것은 이 블록의 둥근 모서리였다.
                  className={
                    entry.highlighted
                      ? "-mx-6 rounded-[16px] px-6 shadow-[0_3px_7.5px_rgba(0,0,0,0.06)]"
                      : ""
                  }
                  style={
                    entry.highlighted
                      ? { backgroundColor: HIGHLIGHT_BG }
                      : undefined
                  }
                >
                  <div className="grid items-center gap-6 py-[30px] md:min-h-[154px] md:grid-cols-[210px_minmax(0,1fr)_238px] md:gap-x-[38px]">
                    <p className="text-sm font-medium leading-[21px] text-muted-foreground">
                      {entry.category}
                    </p>

                    <div>
                      <h3 className="text-[23px] font-semibold leading-[31.05px] tracking-[-0.345px]">
                        {entry.title}
                      </h3>
                      <p className="pt-2.5 text-base leading-[25.6px] text-muted-foreground">
                        {entry.body}
                      </p>
                      {entry.proof && (
                        <p className="pt-3.5 text-sm font-semibold leading-[21px]">
                          {entry.proof}
                          {entry.proofNote && (
                            // 피그마는 7px 다. 화면에서 거의 읽히지 않아
                            // 12px 로 올린다 — 이 화면에서 유일하게 피그마
                            // 값을 따르지 않는 곳이다.
                            <span className="text-xs font-normal">
                              {" "}
                              {entry.proofNote}
                            </span>
                          )}
                        </p>
                      )}
                      {entry.secondary && (
                        <Link
                          href={entry.secondary.href}
                          className="mt-[7px] inline-block text-sm font-semibold leading-[21px] text-muted-foreground underline underline-offset-4 transition-colors hover:text-primary"
                        >
                          {entry.secondary.label}
                        </Link>
                      )}
                    </div>

                    <Link
                      href={buyHref(entry.href)}
                      className={[
                        BUTTON,
                        "w-[195px] justify-self-start md:justify-self-end",
                        entry.variant === "quiet"
                          ? "text-muted-foreground hover:brightness-95"
                          : "text-white hover:brightness-95",
                        entry.underlined ? "underline underline-offset-4" : "",
                      ].join(" ")}
                      style={{
                        backgroundColor:
                          entry.variant === "quiet"
                            ? HIGHLIGHT_BG
                            : entry.variant === "survey"
                              ? SURVEY_BUTTON_BG
                              : undefined,
                      }}
                      data-variant={entry.variant}
                    >
                      {entry.action}
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 향후 방향 */}
        <section className="bg-background">
          <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-[82px]">
            <div className="max-w-[753px]">
              <Eyebrow>건강한 오늘에서 필요한 다음 케어까지</Eyebrow>
              <SectionTitle>기록을 바탕으로 아이와의 접점을 늘려요.</SectionTitle>
              <p className="max-w-[720px] pt-[18px] text-[17px] leading-[28.9px] text-muted-foreground">
                일상 기록과 병원 상담 준비에서 시작해 건강관리, 보험, 상담,
                노령기 돌봄 등 생애주기에 필요한 연결을 단계적으로 확장합니다.
              </p>
            </div>
            <Link
              href="/roadmap"
              className={`${BUTTON} shrink-0 self-start text-foreground hover:brightness-95 lg:self-auto`}
              style={{ backgroundColor: SOFT_BUTTON_BG }}
            >
              향후 방향 보기 →
            </Link>
          </div>
        </section>

        {/* 문의 */}
        <section className="bg-card">
          <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-6 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-[76px]">
            <div className="max-w-[753px]">
              <div className="flex items-center">
                {/* 피그마가 내보낸 자산 그대로다. 테두리 원에 물음표를 그려
                    넣던 것과는 다른 물건이고, 오른쪽 여백이 도형 안에 있다. */}
                <img
                  src="/home/question.svg"
                  alt=""
                  width="45"
                  height="60"
                  className="h-[60px] w-[45px] shrink-0"
                  aria-hidden="true"
                />
                <h2 className="text-2xl font-bold tracking-[-0.85px] md:text-[34px] md:leading-[42.5px]">
                  포에버에 궁금한 점이 있나요?
                </h2>
              </div>
              <p className="pt-[18px] text-[17px] leading-[28.9px] text-muted-foreground">
                앱, 맞춤 굿즈, 설문, 제휴에 관한 문의를 남겨 주세요.
              </p>
            </div>
            <Link
              href="/contact"
              className={`${BUTTON} w-[200px] shrink-0 self-start bg-background text-foreground hover:brightness-95 lg:self-auto`}
            >
              문의 유형 선택하기 →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* 전환 바 — 흐름 안에 두고 sticky 로 띄운다.
          fixed 로 띄우고 아래에 h-20 여백을 대신 두고 있었는데, 모바일에서는
          버튼 두 개가 두 줄로 접히면서 바가 151px 이 된다. 여백 80px 로는 71px
          이 모자라 푸터의 이용약관·개인정보처리방침 링크가 덮여 눌리지 않았다.
          sticky 는 자기 높이만큼 자리를 직접 차지하므로 글자가 바뀌어도 어긋나지
          않는다. */}
      <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1024px] flex-wrap items-center justify-center gap-3">
          {/* 위 굿즈 줄의 신청 버튼과 글자가 같다. 같은 곳으로 보낸다. */}
          <Link
            href={buyHref(DIRECT_PURCHASE)}
            className="rounded-[10px] bg-primary px-6 py-2.5 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            굿즈 얼리버드 신청하기
          </Link>
          <Link
            href="/goods-survey/survey"
            className="rounded-[10px] border border-border bg-card px-6 py-2.5 text-center font-medium shadow-sm transition-colors hover:bg-accent/10"
          >
            15분 설문으로 포에버의 다음 서비스를 함께 만들어 주세요
          </Link>
        </div>
      </div>
    </div>
  );
}
