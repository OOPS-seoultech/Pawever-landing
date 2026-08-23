import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Link } from "wouter";

/**
 * 포에버 홈.
 *
 * 6~11세 반려견의 일상·건강 변화를 쌓아 병원 상담 준비까지 잇는 흐름을 보여준다.
 * 방문자가 앱·굿즈·설문 중 지금 필요한 길을 고르게 하는 것이 이 화면의 일이다.
 *
 * 피그마 8. Website / Identify and Connect Home Component (5200:1448) 기준이다.
 * 화면 폭·색·여백을 그 프레임에서 그대로 가져왔다. 값을 바꿔야 하면 피그마부터
 * 바꾸고 여기를 맞춘다.
 */

/** 굿즈 줄에 깔리는 강조 배경. 피그마에서 뽑은 값이다. */
const HIGHLIGHT_BG = "#FFF9F3";
/** 조용한 버튼 배경. 강조 줄과 같은 색을 쓴다. */
const QUIET_BUTTON_BG = "#FFF9F3";
/** 향후 방향 버튼 배경. */
const SOFT_BUTTON_BG = "#FFF0E0";

const CARE_STEPS = [
  {
    step: "STEP 01",
    title: "오늘의 30초 케어 기록",
    body: "식사, 산책, 수면처럼 매일 보이는 변화를 짧게 남겨요.",
  },
  {
    step: "STEP 02",
    title: "주간 변화 비교",
    body: "지난 기록과 나란히 보며 달라진 점을 놓치지 않아요.",
  },
  {
    step: "STEP 03",
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
    href: "/goods-survey",
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
    href: "/goods-survey/survey",
    variant: "primary" as const,
    highlighted: false,
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-base font-medium text-primary">{children}</p>;
}

export default function Home() {
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

          <div className="relative mx-auto flex w-full max-w-[1360px] flex-col justify-between gap-16 px-6 py-16 lg:min-h-[720px] lg:py-[88px]">
            <div className="max-w-[658px] lg:pt-[54px]">
              <p className="mb-3 text-base font-medium text-white/90">
                함께 있는 오늘부터 시작하는 생애주기 케어
              </p>
              <h1 className="text-3xl font-bold leading-tight text-white md:text-[50px] md:leading-[1.22]">
                우리 아이, 예전과 무엇이 달라졌는지 기록으로 확인하세요.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-white/90">
                포에버(PAW-EVER)는 6~11세 반려견의 일상과 건강 변화를 쌓고, 필요한
                케어와 병원 상담 준비를 돕습니다.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/service"
                  className="rounded-[10px] bg-primary px-6 py-3 font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  나에게 맞는 서비스 찾기
                </Link>
                <Link
                  href="/goods-survey/survey"
                  className="rounded-[10px] bg-white px-6 py-3 font-medium text-foreground transition-colors hover:bg-white/90"
                >
                  15분 설문으로 의견 남기기
                </Link>
              </div>
            </div>

            <ul className="grid gap-8 sm:grid-cols-[351px_minmax(0,1fr)] sm:gap-x-[90px]">
              {HIGHLIGHTS.map(item => (
                <li key={item.title}>
                  <p className="font-semibold text-white">{item.title}</p>
                  <p className="mt-1 text-sm text-white/85">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 기록에서 케어로 이어지는 흐름 */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-20 lg:py-24">
            <Eyebrow>매일의 기록이 다음 케어로</Eyebrow>
            <h2 className="text-3xl font-bold md:text-[35px]">
              작은 변화를 알아보는 가장 쉬운 흐름
            </h2>
            {/* 카드로 감싸지 않는다. 피그마는 테두리 없이 세 칸으로 나눠 뒀다. */}
            <ol className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
              {CARE_STEPS.map(step => (
                <li key={step.step}>
                  <p className="text-sm font-semibold text-primary">
                    {step.step}
                  </p>
                  <h3 className="mt-3 text-[19px] font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-14 text-sm text-muted-foreground">
              * 포에버의 기록은 진단이나 치료 지시가 아닌, 보호자의 관찰과 병원
              상담 준비를 돕기 위한 정보입니다.
            </p>
          </div>
        </section>

        {/* 시작하는 세 가지 방법 */}
        <section className="bg-card">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-20 lg:py-24">
            <Eyebrow>지금 필요한 길을 선택하세요.</Eyebrow>
            <h2 className="text-3xl font-bold md:text-[35px]">
              포에버를 시작하는 세 가지 방법
            </h2>

            <ul className="mt-10">
              {ENTRY_POINTS.map(entry => (
                <li
                  key={entry.title}
                  // 강조 블록만 배경을 깐다. 줄 사이에 구분선은 없다 —
                  // 피그마에서 선처럼 보이던 것은 이 블록의 둥근 모서리였다.
                  className={
                    entry.highlighted ? "-mx-6 rounded-[12px] px-6" : ""
                  }
                  style={
                    entry.highlighted
                      ? { backgroundColor: HIGHLIGHT_BG }
                      : undefined
                  }
                >
                  <div className="grid items-center gap-6 py-8 md:grid-cols-[200px_minmax(0,1fr)_auto] md:gap-x-12 md:py-9">
                    <p className="text-sm text-muted-foreground">
                      {entry.category}
                    </p>

                    <div>
                      <h3 className="text-[19px] font-semibold">{entry.title}</h3>
                      <p className="mt-2 text-muted-foreground">{entry.body}</p>
                      {entry.proof && (
                        <p className="mt-3 text-sm font-semibold">
                          {entry.proof}
                          {entry.proofNote && (
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              {entry.proofNote}
                            </span>
                          )}
                        </p>
                      )}
                      {entry.secondary && (
                        <Link
                          href={entry.secondary.href}
                          className="mt-2 inline-block text-sm underline underline-offset-4 transition-colors hover:text-primary"
                        >
                          {entry.secondary.label}
                        </Link>
                      )}
                    </div>

                    <Link
                      href={entry.href}
                      className={
                        entry.variant === "primary"
                          ? "justify-self-start rounded-[10px] bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 md:justify-self-end"
                          : "justify-self-start rounded-[10px] px-5 py-3 text-sm font-medium transition-colors hover:brightness-95 md:justify-self-end"
                      }
                      style={
                        entry.variant === "quiet"
                          ? { backgroundColor: QUIET_BUTTON_BG }
                          : undefined
                      }
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
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-8 px-6 py-16 lg:flex-row lg:items-center lg:justify-between lg:py-20">
            <div className="max-w-[753px]">
              <Eyebrow>건강한 오늘에서 필요한 다음 케어까지</Eyebrow>
              <h2 className="text-3xl font-bold md:text-[35px]">
                기록을 바탕으로 아이와의 접점을 늘려요.
              </h2>
              <p className="mt-6 leading-relaxed text-muted-foreground">
                일상 기록과 병원 상담 준비에서 시작해 건강관리, 보험, 상담,
                노령기 돌봄 등 생애주기에 필요한 연결을 단계적으로 확장합니다.
              </p>
            </div>
            <Link
              href="/roadmap"
              className="shrink-0 self-start rounded-[10px] px-5 py-3 text-sm font-medium transition-colors hover:brightness-95 lg:self-auto"
              style={{ backgroundColor: SOFT_BUTTON_BG }}
            >
              향후 방향 보기 →
            </Link>
          </div>
        </section>

        {/* 문의 */}
        <section className="bg-card">
          <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-16 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[753px]">
              <h2 className="flex items-center gap-3 text-2xl font-bold md:text-[32px]">
                <span
                  aria-hidden="true"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-base font-semibold text-muted-foreground"
                >
                  ?
                </span>
                포에버에 궁금한 점이 있나요?
              </h2>
              <p className="mt-4 text-muted-foreground">
                앱, 맞춤 굿즈, 설문, 제휴에 관한 문의를 남겨 주세요.
              </p>
            </div>
            <Link
              href="/contact"
              className="shrink-0 self-start rounded-[10px] bg-background px-5 py-3 text-sm font-medium transition-colors hover:brightness-95 lg:self-auto"
            >
              문의 유형 선택하기 →
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />

      {/* 전환 바 — 화면을 가리지 않도록 본문 아래 여백을 함께 둔다 */}
      <div className="h-20" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 py-3 shadow-lg backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1024px] flex-wrap items-center justify-center gap-3">
          <Link
            href="/goods-survey"
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
