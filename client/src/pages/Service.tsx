import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Link } from "wouter";

/**
 * 서비스 소개.
 *
 * 포에버가 무엇을 하고 무엇을 하지 않는지 밝히는 화면이다.
 * 진단이 아니라 관찰과 상담 준비라는 선은 여기서 분명히 해 둔다.
 */

const CARE_STEPS = [
  {
    step: "STEP 01",
    title: "오늘의 30초 케어 기록",
    body: "식사, 산책, 수면과 눈에 띈 변화를 짧게 남깁니다.",
  },
  {
    step: "STEP 02",
    title: "주간 변화 비교",
    body: "이번 주와 지난 기록을 나란히 보며 달라진 점을 확인합니다.",
  },
  {
    step: "STEP 03",
    title: "병원 준비 요약",
    body: "관찰한 변화를 정리해 진료 상담 전에 필요한 정보를 준비합니다.",
  },
];

const PRINCIPLES = [
  {
    label: "누구를 위한 서비스인가요?",
    title: "변화를 가장 먼저 발견하는 주 양육자",
    body: "연령이나 가구 형태만으로 한정하지 않습니다. 식사, 산책, 병원 방문처럼 실제 케어와 의사결정을 맡고 있는 보호자의 관찰을 중심에 둡니다.",
  },
  {
    label: "정보 사용 원칙",
    title: "진단이 아닌 관찰과 상담 준비",
    body: "기록과 안내는 수의사의 진단이나 치료를 대신하지 않습니다. 보호자가 변화를 놓치지 않고, 전문가와 더 구체적으로 상담할 수 있도록 돕는 정보로 사용합니다.",
  },
];

export default function Service() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* 소개 */}
        <section className="mx-auto w-full max-w-[1280px] px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-base font-medium text-primary">
              포에버 서비스 소개
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              함께 있는 오늘을 더 잘 돌보는 기록
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              포에버(PAW-EVER)는 6~11세 반려견의 주 양육자가 일상과 건강 변화를
              꾸준히 남기고, 예전과 달라진 점과 병원에서 이야기할 내용을
              준비하도록 돕습니다.
            </p>
          </div>
        </section>

        {/* 세 단계 */}
        <section className="bg-muted/60 py-20">
          <div className="mx-auto w-full max-w-[1280px] px-8">
            <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
              기록이 케어로 이어지는 세 단계
            </h2>
            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {CARE_STEPS.map(step => (
                <li
                  key={step.step}
                  className="rounded-[16px] border border-border bg-card p-6 shadow-sm"
                >
                  <p className="text-sm font-bold text-primary">{step.step}</p>
                  <h3 className="mt-5 text-xl font-semibold">{step.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {step.body}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 대상과 원칙 */}
        <section className="mx-auto grid w-full max-w-[1280px] gap-6 px-8 py-20 md:grid-cols-2">
          {PRINCIPLES.map(item => (
            <article
              key={item.label}
              className="rounded-[16px] border border-border bg-card p-7 shadow-sm"
            >
              <p className="text-base font-medium text-primary">{item.label}</p>
              <h2 className="mt-3 text-2xl font-bold">{item.title}</h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {item.body}
              </p>
            </article>
          ))}
        </section>

        {/* 앱으로 연결 */}
        <section className="mx-auto w-full max-w-[1280px] px-8 pb-20 text-center">
          <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
            앱에서 기록 흐름을 확인해 보세요
          </h2>
          <Link
            href="/app"
            className="mt-7 inline-block rounded-[10px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            앱 서비스 살펴보기
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
