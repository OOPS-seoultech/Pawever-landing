import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ExternalLink } from "lucide-react";

/**
 * 앱 서비스 소개.
 *
 * 기록 → 비교 → 병원 준비로 이어지는 앱의 쓰임을 보여주고 설치로 연결한다.
 */

/**
 * 스토어 주소.
 *
 * 아직 받지 못했다. 값이 비어 있으면 버튼을 아예 그리지 않는다.
 * 눌러도 아무 데도 가지 않는 버튼을 두는 것보다 없는 편이 낫다.
 */
const STORE_LINKS = [
  { label: "Google Play에서 설치하기", href: "", primary: true },
  { label: "App Store에서 설치하기", href: "", primary: false },
];

const FEATURES = [
  {
    title: "오늘의 30초 케어 기록",
    body: "식사, 산책, 수면과 오늘 보인 변화를 짧게 남겨 반려견의 일상을 한곳에 모아요.",
  },
  {
    title: "필요한 기록을 묻는 케어 질문",
    body: "놓치기 쉬운 관찰 항목을 질문으로 확인하고, 보호자가 다음 기록을 이어갈 수 있게 도와요.",
  },
  {
    title: "주간 변화 비교",
    body: "이번 주 기록을 이전 기록과 비교해 예전과 달라진 점을 보호자가 쉽게 살펴볼 수 있어요.",
  },
  {
    title: "병원 준비 요약",
    body: "관찰한 변화와 타임라인을 정리해 진료 상담 전에 필요한 내용을 준비할 수 있어요.",
  },
];

export default function AppService() {
  const availableStores = STORE_LINKS.filter(store => store.href);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* 소개 */}
        <section className="mx-auto grid w-full max-w-[1280px] items-center gap-10 px-8 py-20 lg:grid-cols-[1.2fr_1fr] lg:py-28">
          <div>
            <p className="text-base font-medium text-primary">포에버 앱</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              오늘의 기록으로 달라진 점을 확인하세요
            </h1>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              짧은 일상 기록부터 주간 변화 비교와 병원 상담 준비까지, 반려견의
              케어 흐름을 한곳에서 이어갑니다.
            </p>

            {availableStores.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {availableStores.map(store => (
                  <a
                    key={store.label}
                    href={store.href}
                    target="_blank"
                    rel="noreferrer"
                    className={`inline-flex items-center gap-2 rounded-[10px] px-4 py-2.5 text-sm font-medium transition-colors ${
                      store.primary
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "border border-border bg-card shadow-sm hover:bg-accent/10"
                    }`}
                  >
                    {store.label}
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            )}

            <p className="mt-4 text-sm text-muted-foreground">
              현재 앱은 설치할 수 있으며, 포에버는 굿즈 제작과 반려인 설문
              데이터 수집에도 운영 역량을 집중하고 있습니다.
            </p>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-border bg-muted shadow-sm">
            <img
              src="/home/app-preview.png"
              alt="반려견의 일상 기록과 건강 변화 기능이 보이는 포에버 앱 화면"
              width="1024"
              height="500"
              className="w-full object-cover"
            />
            <div className="p-7">
              <p className="text-sm font-medium text-primary">앱 활용 흐름</p>
              <p className="mt-3 text-2xl font-bold">기록 → 비교 → 병원 준비</p>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                보호자가 직접 확인한 사실을 차곡차곡 쌓아 다음 케어 판단에
                활용합니다.
              </p>
            </div>
          </div>
        </section>

        {/* 주요 기능 */}
        <section className="bg-muted/60 py-20">
          <div className="mx-auto w-full max-w-[1280px] px-8">
            <h2 className="text-2xl font-bold md:text-3xl">앱의 주요 기능</h2>
            <ul className="mt-10 grid gap-5 md:grid-cols-2">
              {FEATURES.map(feature => (
                <li
                  key={feature.title}
                  className="rounded-[16px] border border-border bg-card p-6 shadow-sm"
                >
                  <h3 className="text-xl font-semibold">{feature.title}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">
                    {feature.body}
                  </p>
                </li>
              ))}
            </ul>
            <p className="mt-7 text-sm text-muted-foreground">
              앱의 기록과 안내는 의료 진단이나 치료 지시를 대신하지 않습니다.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
