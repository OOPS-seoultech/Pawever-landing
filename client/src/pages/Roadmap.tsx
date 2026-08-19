import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Link } from "wouter";

/**
 * 향후 방향.
 *
 * 2026~2028 사이에 무엇을 다듬고 무엇을 연결할지 밝힌다.
 * 해마다 제품 방향과 연결 방향을 나눠 적어, 지금 할 일과 나중에 할 일을 구분한다.
 */

const MILESTONES = [
  {
    year: "2026",
    title: "기록 기반 서비스 정비",
    product:
      "30초 일상 기록, 주간 변화 비교, 병원 상담 준비 흐름을 더 직관적으로 다듬습니다.",
    connection:
      "반려인 설문과 맞춤 굿즈 제작 경험을 바탕으로 실제 사용자의 요구를 서비스에 반영합니다.",
  },
  {
    year: "2027",
    title: "선제적 케어 기능 확장",
    product:
      "개체별 기록에 맞는 질문, 변화 요약, 다음 케어 안내를 단계적으로 확장합니다.",
    connection:
      "전문가 자문과 병원 상담에 활용할 수 있는 정보 연결 방식을 검증합니다.",
  },
  {
    year: "2028",
    title: "생애주기 케어 연결",
    product:
      "축적한 기록을 바탕으로 건강관리, 보험, 상담, 노령기 돌봄에 필요한 선택을 찾기 쉽게 연결합니다.",
    connection:
      "각 분야의 서비스 운영사와 연결 범위를 넓혀 보호자의 다음 결정을 돕습니다.",
  },
];

export default function Roadmap() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* 소개 */}
        <section className="mx-auto w-full max-w-[1280px] px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-base font-medium text-primary">
              2026–2028 향후 방향
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              기록에서 필요한 케어 연결까지
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              포에버(PAW-EVER)는 지금의 기록 경험을 다듬고, 변화 요약과 전문가
              상담 준비를 거쳐 반려견 생애주기에 필요한 서비스를 찾기 쉽게
              연결합니다.
            </p>
          </div>
        </section>

        {/* 3개년 로드맵 */}
        <section className="mx-auto w-full max-w-[1280px] px-8 pb-20">
          <ol className="grid gap-6 md:grid-cols-3">
            {MILESTONES.map(milestone => (
              <li
                key={milestone.year}
                className="rounded-[24px] border border-border bg-card p-7 shadow-sm"
              >
                <p className="text-4xl font-bold text-primary">
                  {milestone.year}
                </p>
                <h2 className="mt-4 text-2xl font-bold">{milestone.title}</h2>
                <div className="mt-7">
                  <p className="text-sm font-semibold">제품 방향</p>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {milestone.product}
                  </p>
                </div>
                <div className="mt-6">
                  <p className="text-sm font-semibold">연결 방향</p>
                  <p className="mt-2 leading-relaxed text-muted-foreground">
                    {milestone.connection}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 의견 요청 */}
        <section className="bg-muted/60 py-20">
          <div className="mx-auto w-full max-w-[1280px] px-8 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">
              사용자의 경험부터 반영합니다
            </h2>
            <p className="mx-auto mt-4 max-w-2xl leading-relaxed text-muted-foreground">
              15분 설문으로 지금 필요한 케어와 포에버의 다음 방향에 의견을 더해
              주세요.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/goods-survey/survey"
                className="rounded-[10px] bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                15분 설문 참여하기
              </Link>
              <Link
                href="/contact"
                className="rounded-[10px] border border-border bg-card px-6 py-2.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent/10"
              >
                제휴 문의하기
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
