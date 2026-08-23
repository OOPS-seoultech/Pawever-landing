import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { STORE_LINKS } from "@/lib/storeLinks";

/**
 * 서비스 소개.
 *
 * 포에버가 무엇을 하고 무엇을 하지 않는지 밝히는 화면이다.
 * 진단이 아니라 관찰과 상담 준비라는 선은 여기서 분명히 해 둔다.
 *
 * 피그마 8. Website / Identify and Connect Home Component > Component
 * (5210:1808) 기준이다. 폭·색·여백·글자 크기를 그 프레임에서 잰 값이다.
 * 값을 바꿔야 하면 피그마부터 바꾸고 여기를 맞춘다.
 */

const CARE_STEPS = [
  {
    step: "STEP 01",
    title: "오늘의 30초 케어 기록",
    body: "식사, 산책, 수면과 눈에 띈 변화를 짧게 남겨요.",
  },
  {
    step: "STEP 02",
    title: "주간 변화 비교",
    body: "이번 주와 지난 기록을 나란히 보며 달라진 점을 쉽게 확인해요.",
  },
  {
    step: "STEP 03",
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
          <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-10 px-6 py-[100px] lg:flex-row lg:items-start">
            <div className="lg:w-[942px]">
              <p className="text-base font-medium text-primary">
                포에버 서비스 소개
              </p>
              <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-[52px] md:leading-[67px]">
                함께 있는 오늘을 더 잘 돌보는 기록
              </h1>
              <p className="mt-5 text-lg leading-[31px] text-muted-foreground">
                포에버(PAW-EVER)는 6~11세 반려견의 주 양육자가{" "}
                <strong className="font-semibold text-foreground">
                  일상과 건강 변화를 꾸준히 남기고,
                </strong>{" "}
                예전과 달라진 점과{" "}
                <strong className="font-semibold text-foreground">
                  병원에서 이야기할 내용을 준비
                </strong>
                하도록 돕습니다.
              </p>
            </div>

            {/* 앱 화면이 준비되면 들어갈 자리. 피그마도 비워 두었다. */}
            <div className="flex h-[193px] w-full shrink-0 items-center justify-center rounded-[16px] border border-border text-sm text-muted-foreground lg:w-[258px]">
              APP 업데이트 후 추가
            </div>
          </div>
        </section>

        {/* 세 단계 */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[100px]">
            <h2 className="text-2xl font-bold md:text-[33px] md:leading-[44px]">
              기록이 케어로 이어지는 세 단계
            </h2>
            {/* 카드 세 장이 아니라 가로 줄 세 개다. 왼쪽에 큰 단계 번호가 선다. */}
            <ol className="mt-10">
              {CARE_STEPS.map(step => (
                <li
                  key={step.step}
                  className="grid gap-2 border-t border-border py-[30px] last:border-b md:grid-cols-[196px_minmax(0,1fr)] md:items-start md:gap-x-10"
                >
                  <p className="text-2xl font-semibold text-primary md:text-[36px]">
                    {step.step}
                  </p>
                  <div>
                    <h3 className="text-xl font-semibold md:text-[26px] md:leading-9">
                      {step.title}
                    </h3>
                    <p className="mt-2 text-[17px] leading-7 text-muted-foreground">
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
                    ? "md:border-l md:border-border md:pl-[63px]"
                    : "md:pr-[63px]"
                }
              >
                <p className="text-sm font-medium text-primary">{item.label}</p>
                <h2 className="mt-1 text-2xl font-bold md:text-[33px] md:leading-[44px]">
                  {item.title}
                </h2>
                <p className="mt-4 max-w-[420px] leading-7 text-muted-foreground">
                  {item.body}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 앱으로 연결 */}
        <section className="bg-background">
          <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-8 px-6 py-[100px] lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-[576px]">
              <h2 className="text-2xl font-bold underline underline-offset-4 md:text-[33px] md:leading-[48px]">
                앱에서 기록 흐름을 확인해 보세요
              </h2>
              <p className="mt-5 leading-[22px] text-muted-foreground">
                현재 앱은 두 가지 앱스토어 모두에서 설치할 수 있습니다.
                <br />
                포에버는 굿즈 제작과 반려인 설문 데이터 수집에도 운영 역량을
                집중하고 있습니다.
              </p>
            </div>

            <ul className="flex flex-wrap gap-3">
              {STORE_LINKS.map(store => (
                <li key={store.label}>
                  <StoreButton store={store} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * 앱스토어 버튼.
 *
 * 주소를 아직 받지 못했다. 자리를 비우면 피그마와 화면이 달라지고, 빈 링크를
 * 걸면 눌렀을 때 아무 데도 가지 않는다. 주소가 없으면 누를 수 없는 상태로
 * 그려 둔다 — 주소가 들어오면 그대로 링크가 된다.
 */
function StoreButton({
  store,
}: {
  store: { label: string; href: string; primary: boolean };
}) {
  const skin = store.primary
    ? "bg-primary text-primary-foreground"
    : "bg-foreground text-background";
  const shape =
    "inline-flex items-center gap-2 rounded-[10px] px-6 py-3 text-base font-semibold";

  if (!store.href) {
    return (
      <span
        aria-disabled="true"
        className={`${shape} ${skin} cursor-default opacity-60`}
      >
        {store.label}
        <Launch />
      </span>
    );
  }
  return (
    <a
      href={store.href}
      target="_blank"
      rel="noreferrer noopener"
      className={`${shape} ${skin} transition-opacity hover:opacity-90`}
    >
      {store.label}
      <Launch />
    </a>
  );
}

function Launch() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path d="M11 3h6v6M17 3l-8 8" strokeLinecap="round" />
      <path d="M15 12v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
    </svg>
  );
}
