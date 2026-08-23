import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Link } from "wouter";

/**
 * 향후 방향.
 *
 * 2026~2028 사이에 무엇을 다듬고 무엇을 연결할지 밝힌다.
 * 해마다 제품 방향과 연결 방향을 나눠 적어, 지금 할 일과 나중에 할 일을 구분한다.
 *
 * 피그마 8. Website / Identify and Connect Home Component > Component
 * (5210:2024) 기준이다. 글자 크기·색·여백은 그 프레임의 CSS 값이다.
 *
 * 예전 화면은 카드 세 장이었다. 피그마는 그라데이션 선 하나가 가로지르고 그
 * 위에 해마다 점이 찍힌 연표다. 카드로 두면 세 해가 나란한 항목처럼 보이고,
 * 연한 색에서 진한 색으로 넘어가는 시간의 방향이 사라진다.
 */

/**
 * 연도 색은 세 개가 한 벌이다.
 *
 * 위를 지나는 선이 #FFDFBE 에서 #6A2C03 으로 어두워지고, 점과 연도 숫자가 그
 * 선의 같은 지점 색을 쓴다. 셋 다 주황(--primary)으로 두면 선만 남고 연결이
 * 끊긴다. 토큰에 없는 값이라 그대로 적는다.
 */
const MILESTONES = [
  {
    year: "2026",
    tone: "#FF9F43",
    title: "기록 기반 서비스 정비",
    product:
      "30초 일상 기록, 주간 변화 비교, 병원 상담 준비 흐름을 더 직관적으로 다듬습니다.",
    connection:
      "반려인 설문과 맞춤 굿즈 제작 경험을 바탕으로 실제 사용자의 요구를 서비스에 반영합니다.",
  },
  {
    year: "2027",
    tone: "#BF6021",
    title: "선제적 케어 기능 확장",
    product:
      "개체별 기록에 맞는 질문, 변화 요약, 다음 케어 안내를 단계적으로 확장합니다.",
    connection:
      "전문가 자문과 병원 상담에 활용할 수 있는 정보 연결 방식을 검증합니다.",
  },
  {
    year: "2028",
    tone: "#6A2C03",
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
        <section className="bg-card">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[96px]">
            <p className="text-sm font-medium leading-[19.6px] text-primary">
              2026–2028 향후 방향
            </p>
            <h1 className="pt-4 text-4xl font-bold tracking-[-1.2px] md:text-[48px] md:leading-[57.6px]">
              기록에서 필요한 케어 연결까지
            </h1>
            <p className="max-w-[680px] pt-6 text-lg leading-[29.7px] text-muted-foreground">
              포에버(PAW-EVER)는 지금의 기록 경험을 다듬고, 변화 요약과 전문가
              상담 준비를 거쳐 반려견 생애주기에 필요한 서비스를 찾기 쉽게
              연결합니다.
            </p>
          </div>
        </section>

        {/* 3개년 연표 */}
        <section className="bg-muted">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[112px]">
            <div className="relative">
              {/* 세 해를 잇는 선. 점의 한가운데(4px)를 지난다. */}
              <div
                aria-hidden="true"
                className="absolute left-1 right-1 top-1 hidden h-px bg-gradient-to-r from-[#FFDFBE] to-[#6A2C03] md:block"
              />

              <ol className="grid gap-12 md:grid-cols-3 md:gap-0">
                {MILESTONES.map((milestone, index) => (
                  <li
                    key={milestone.year}
                    className={index < 2 ? "md:pr-12" : ""}
                  >
                    <span
                      aria-hidden="true"
                      // 선 위에 얹힌다. 선보다 뒤에 그려져야 가려지지 않는다.
                      className="relative block h-2 w-2 rounded-[4px]"
                      style={{ backgroundColor: milestone.tone }}
                    />

                    <p
                      className="pt-6 text-[40px] font-black leading-[48px] tracking-[-0.72px]"
                      style={{ color: milestone.tone }}
                    >
                      {milestone.year}
                    </p>
                    <h2 className="pt-3 text-xl font-medium md:text-[22px] md:leading-[29.7px]">
                      {milestone.title}
                    </h2>

                    {/* 2027·2028 은 왼쪽에 선이 하나 더 선다. 2026 은 없다. */}
                    <div
                      className={`mt-8 ${
                        index > 0
                          ? "md:border-l-[3px] md:border-border md:pl-8"
                          : ""
                      }`}
                    >
                      <Direction label="제품 방향" body={milestone.product} />
                      <div className="pt-7">
                        <Direction
                          label="연결 방향"
                          body={milestone.connection}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* 의견 요청 */}
        <section className="bg-card">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[80px] text-center">
            <h2 className="text-2xl font-bold md:text-[30px] md:leading-9">
              여러분의 경험으로부터 시작됩니다
            </h2>
            <p className="mx-auto max-w-[672px] pt-4 text-base leading-[26px] text-muted-foreground">
              15분 설문으로 지금 필요한 케어와 포에버의 다음 방향에 의견을 더해
              주세요.
            </p>
            <div className="flex flex-wrap justify-center gap-4 pt-7">
              <Link
                href="/goods-survey/survey"
                className="inline-flex h-10 items-center rounded-[12px] bg-primary px-6 text-sm font-medium text-primary-foreground shadow-[1px_2px_2px_rgba(173,138,105,0.16)] transition-colors hover:bg-primary/90"
              >
                15분 설문 참여하기
              </Link>
              <Link
                href="/contact"
                // 피그마는 이쪽만 Bold 다. 설문 버튼은 Medium 이다.
                className="inline-flex h-10 items-center rounded-[12px] border border-border px-6 text-sm font-bold shadow-[1px_2px_4px_rgba(173,138,105,0.16)] transition-colors hover:bg-accent/10"
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

/** 한 해 안의 "제품 방향" / "연결 방향" 한 묶음. */
function Direction({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <p className="text-sm font-medium leading-[19.6px] text-muted-foreground">
        {label}
      </p>
      <p className="pt-3 text-base leading-[26.4px] text-muted-foreground">
        {body}
      </p>
    </div>
  );
}
