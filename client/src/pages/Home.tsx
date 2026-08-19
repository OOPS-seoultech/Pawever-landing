import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Link } from "wouter";

/**
 * 포에버 홈.
 *
 * 6~11세 반려견의 일상·건강 변화를 쌓아 병원 상담 준비까지 잇는 흐름을 보여준다.
 * 방문자가 앱·굿즈·설문 중 지금 필요한 길을 고르게 하는 것이 이 화면의 일이다.
 */

const CARE_STEPS = [
  {
    step: "STEP 01",
    title: "오늘의 30초 케어 기록",
    body: "식사, 산책, 수면처럼 매일 보이는 변화를 짧게 남겨요.",
  },
  {
    step: "STEP 02",
    title: "주간 변화 비교",
    body: "지난 기록과 나란히 보며 예전과 달라진 점을 놓치지 않아요.",
  },
  {
    step: "STEP 03",
    title: "병원 준비 요약",
    body: "관찰한 내용을 정리해 진료 상담 전에 필요한 정보를 준비해요.",
  },
];

const ENTRY_POINTS = [
  {
    category: "기록과 케어",
    title: "포에버 앱",
    body: "오늘의 변화를 기록하고 반려견의 일상과 건강 흐름을 한곳에서 확인하세요.",
    action: "앱 서비스 살펴보기",
    href: "/app",
  },
  {
    category: "우리 아이 맞춤 제작",
    title: "3D 맞춤 굿즈 얼리버드",
    body: "사진 속 우리 아이의 특징을 담은 맞춤 굿즈 제작 흐름을 확인하세요.",
    action: "맞춤 굿즈 얼리버드 보기",
    href: "/goods-survey",
  },
  {
    category: "함께 만드는 다음 서비스",
    title: "반려인 설문",
    body: "15분 설문으로 지금 필요한 케어와 서비스에 대한 경험을 들려주세요.",
    action: "15분 설문 참여하기",
    href: "/goods-survey/survey",
  },
];

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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-sm font-medium text-primary">{children}</p>;
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* 히어로 */}
        <section className="mx-auto grid w-full max-w-[1280px] items-center gap-10 px-8 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <Eyebrow>함께 있는 오늘부터 시작하는 생애주기 케어</Eyebrow>
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              우리 아이, 예전과 무엇이 달라졌는지 기록으로 확인하세요.
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
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
                className="rounded-[10px] border border-border bg-card px-6 py-3 font-medium shadow-sm transition-colors hover:bg-accent/10"
              >
                15분 설문으로 의견 남기기
              </Link>
            </div>
          </div>

          <div className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
            <img
              src="/home/app-preview.png"
              alt="반려견의 일상 기록과 건강 변화 기능이 보이는 포에버 앱 화면"
              width="1024"
              height="500"
              className="w-full rounded-[16px]"
            />
            <div className="mt-5 flex items-end gap-4">
              <img
                src="/home/mascot.png"
                alt=""
                aria-hidden="true"
                width="390"
                height="373"
                className="hidden w-28 shrink-0 sm:block"
              />
              <ul className="flex-1 space-y-3">
                {HIGHLIGHTS.map(item => (
                  <li key={item.title} className="rounded-[16px] bg-muted p-4">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.body}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 기록에서 케어로 이어지는 흐름 */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-[1280px] px-8 py-20">
            <Eyebrow>매일의 기록이 다음 케어로</Eyebrow>
            <h2 className="text-3xl font-bold md:text-4xl">
              작은 변화를 알아보는 가장 쉬운 흐름
            </h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {CARE_STEPS.map(step => (
                <li
                  key={step.step}
                  className="rounded-[16px] border border-border bg-card p-6"
                >
                  <p className="text-sm font-semibold text-primary">
                    {step.step}
                  </p>
                  <h3 className="mt-3 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 text-muted-foreground">{step.body}</p>
                </li>
              ))}
            </ol>
            <p className="mt-8 text-sm text-muted-foreground">
              * 포에버의 기록은 진단이나 치료 지시가 아닌, 보호자의 관찰과 병원
              상담 준비를 돕기 위한 정보입니다.
            </p>
          </div>
        </section>

        {/* 시작하는 세 가지 방법 */}
        <section className="border-t border-border bg-muted/30">
          <div className="mx-auto w-full max-w-[1280px] px-8 py-20 text-center">
            <Eyebrow>지금 필요한 길을 선택하세요</Eyebrow>
            <h2 className="text-3xl font-bold md:text-4xl">
              포에버를 시작하는 세 가지 방법
            </h2>
            <ul className="mt-10 grid gap-5 text-left md:grid-cols-3">
              {ENTRY_POINTS.map(entry => (
                <li
                  key={entry.title}
                  className="flex flex-col rounded-[16px] border border-border bg-card p-6"
                >
                  <p className="text-sm font-medium text-primary">
                    {entry.category}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold">{entry.title}</h3>
                  <p className="mt-2 flex-1 text-muted-foreground">
                    {entry.body}
                  </p>
                  <Link
                    href={entry.href}
                    className="mt-6 rounded-[10px] border border-border px-4 py-2.5 text-center text-sm font-medium transition-colors hover:bg-accent/10"
                  >
                    {entry.action}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 향후 방향 */}
        <section className="border-t border-border">
          <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-8 px-8 py-20 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Eyebrow>건강한 오늘에서 필요한 다음 케어까지</Eyebrow>
              <h2 className="text-3xl font-bold md:text-4xl">
                기록을 바탕으로 아이와의 접점을 늘려요.
              </h2>
              <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">
                일상 기록과 병원 상담 준비에서 시작해 건강관리, 보험, 상담,
                노령기 돌봄 등 생애주기에 필요한 연결을 단계적으로 확장합니다.
              </p>
            </div>
            <Link
              href="/roadmap"
              className="shrink-0 self-start rounded-[10px] border border-border bg-card px-5 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent/10 lg:self-auto"
            >
              향후 방향 보기
            </Link>
          </div>
        </section>

        {/* 문의 */}
        <section className="border-t border-border">
          <div className="mx-auto w-full max-w-[1280px] px-8 py-20 text-center">
            <h2 className="text-3xl font-bold md:text-4xl">
              포에버에 궁금한 점이 있나요?
            </h2>
            <p className="mt-4 text-muted-foreground">
              앱, 맞춤 굿즈, 설문, 제휴에 관한 문의를 남겨 주세요.
            </p>
            <Link
              href="/contact"
              className="mt-8 inline-block rounded-[10px] bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              문의 유형 선택하기
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
