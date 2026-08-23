import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import StoreButtons from "@/components/StoreButtons";

/**
 * 서비스 소개.
 *
 * 포에버가 무엇을 하고 무엇을 하지 않는지 밝히는 화면이다.
 * 진단이 아니라 관찰과 상담 준비라는 선은 여기서 분명히 해 둔다.
 *
 * 피그마 8. Website / Identify and Connect Home Component > Component
 * (5210:1808) 기준이다.
 *
 * 이 화면은 한동안 유일하게 옛 방식으로 만들어져 있었다. get_metadata 로
 * 좌표만 받아서 글자 크기를 "피그마 텍스트 폭 ÷ 브라우저 실측 폭"으로
 * 역산했다. 그 결과 크기가 1~3px 씩 어긋났고(32→33, 35→36, 13→14),
 * 색으로만 드러나는 것(구역 배경 #F5F5F3)과 굵기로만 드러나는 것(본문 강조가
 * 검정이 아니라 같은 회색)은 아예 잡히지 않았다.
 *
 * 지금 값은 전부 get_design_context 가 준 CSS 다. 잰 값이 아니다.
 */

const CARE_STEPS = [
  {
    number: "01",
    title: "오늘의 30초 케어 기록",
    body: "식사, 산책, 수면과 눈에 띈 변화를 짧게 남겨요.",
  },
  {
    number: "02",
    title: "주간 변화 비교",
    body: "이번 주와 지난 기록을 나란히 보며 달라진 점을 쉽게 확인해요.",
  },
  {
    number: "03",
    title: "병원 준비 요약",
    body: "관찰한 변화를 정리해 진료 상담 전에 필요한 정보를 준비해요.",
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
    <div className="min-h-screen bg-card text-foreground">
      <SiteHeader />

      <main>
        {/* 소개 */}
        <section className="bg-card">
          <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-10 px-6 py-[100px] lg:flex-row lg:items-stretch lg:gap-0">
            <div className="flex flex-col gap-5 lg:flex-1">
              <p className="text-[15px] font-medium leading-[22.5px] text-muted-foreground">
                포에버 서비스 소개
              </p>
              {/* 제목만 칸 전체를 쓴다. 눈썹과 본문은 672px 에서 끊긴다. */}
              <h1 className="text-3xl font-bold tracking-[-1.56px] md:text-[52px] md:leading-[66.56px]">
                함께 있는 오늘을 더 잘 돌보는 기록
              </h1>
              {/* 강조는 굵기만 바꾼다. 색은 본문과 같은 회색이다 —
                  검정으로 두면 문단 안에 검은 덩어리 둘이 생긴다. */}
              <p className="max-w-[672px] text-lg leading-[31.5px] text-muted-foreground">
                포에버(PAW-EVER)는 6-11세 반려견의 주 양육자가{" "}
                <strong className="font-bold">
                  일상과 건강 변화를 꾸준히 남기고,
                </strong>{" "}
                예전과 달라진 점과
                <strong className="font-bold">
                  {" "}
                  병원에서 이야기할 내용을 준비
                </strong>
                하도록 돕습니다.
              </p>
            </div>

            {/* 앱 화면이 준비되면 들어갈 자리. 피그마도 비워 두었다.
                높이를 고정하지 않는다 — 왼쪽 글 높이에 맞춰 늘어난다. */}
            <div className="flex min-h-[193px] w-full shrink-0 items-center justify-center rounded-[16px] border border-border bg-card shadow-[0_3px_7.5px_rgba(0,0,0,0.06)] lg:min-h-0 lg:w-[258px]">
              <p className="w-[200px] text-center text-[13px] leading-[19.5px] text-muted-foreground">
                APP 업데이트 후 추가
              </p>
            </div>
          </div>
        </section>

        {/* 세 단계 */}
        <section className="bg-muted">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[100px]">
            <h2 className="text-2xl font-bold tracking-[-0.64px] md:text-[32px] md:leading-[43.2px]">
              기록이 케어로 이어지는 세 단계
            </h2>
            {/* 카드 세 장이 아니라 가로 줄 세 개다. 왼쪽에 큰 단계 번호가
                행 높이 한가운데에 선다. */}
            <ol className="mt-10 border-t-[3px] border-border">
              {CARE_STEPS.map(step => (
                <li
                  key={step.number}
                  className="grid gap-2 border-b-[3px] border-border py-[30px] md:grid-cols-[196px_minmax(0,1fr)] md:gap-x-10"
                >
                  <div className="flex items-center">
                    <p className="text-2xl font-medium leading-[21px] text-primary md:text-[35px]">
                      STEP <span className="font-bold">{step.number}</span>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-xl font-medium tracking-[-0.24px] md:text-[26px] md:leading-9">
                      {step.title}
                    </h3>
                    <p className="pt-2.5 text-base font-medium leading-[27.2px] text-muted-foreground">
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 대상과 원칙 */}
        <section className="bg-card">
          <div className="mx-auto grid w-full max-w-[1248px] gap-12 px-6 py-[100px] md:grid-cols-2 md:gap-0">
            {PRINCIPLES.map((item, index) => (
              <article
                key={item.label}
                // 가운데 선으로 두 갈래를 나눈다. 카드로 감싸지 않는다.
                className={
                  index === 1
                    ? "md:border-l-[3px] md:border-border md:pl-[60px]"
                    : "md:pr-[60px]"
                }
              >
                <p className="text-[13px] font-medium leading-[19.5px] text-primary">
                  {item.label}
                </p>
                <h2 className="pt-5 text-2xl font-bold tracking-[-0.64px] md:text-[32px] md:leading-[43.2px]">
                  {item.title}
                </h2>
                <p className="max-w-[420px] pt-5 text-base leading-7 text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 앱으로 연결 */}
        <section className="bg-muted">
          <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-8 px-6 py-[100px] lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5">
              <h2 className="text-2xl font-bold tracking-[-0.64px] underline underline-offset-4 md:text-[32px] md:leading-[48px]">
                앱에서 기록 흐름을 확인해 보세요
              </h2>
              <p className="max-w-[576px] text-sm leading-[21.7px] text-muted-foreground">
                현재 앱은 두 가지 앱스토어 모두에서 설치할 수 있습니다.
                <br />
                포에버는 굿즈 제작과 반려인 설문 데이터 수집에도 운영 역량을
                집중하고 있습니다.
              </p>
            </div>

            <StoreButtons className="pb-5 pt-2.5" />
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
