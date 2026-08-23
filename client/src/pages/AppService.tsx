import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import StoreButtons from "@/components/StoreButtons";

/**
 * 앱 서비스 소개.
 *
 * 기록 → 비교 → 병원 준비로 이어지는 앱의 쓰임을 보여주고 설치로 연결한다.
 *
 * 피그마 8. Website / Identify and Connect Home Component > Component
 * (5210:1909) 기준이다. 글자 크기·색·여백은 그 프레임의 CSS 값을 그대로 옮긴
 * 것이다. 값을 바꿔야 하면 피그마부터 바꾸고 여기를 맞춘다.
 *
 * 예전 화면에는 앱 화면 자리 세 개와 번호가 붙은 기록·확인 목록이 통째로
 * 빠져 있었다. 좌표만 재는 방식으로는 없는 구역이 눈에 띄지 않는다.
 */

/** 앱의 주요 기능 카드 네 장. 피그마 5246:1529 의 배치 순서다. */
const FEATURE_CARDS = [
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

/**
 * 번호가 붙은 흐름 목록.
 *
 * 위 카드 네 장과 같은 네 가지를 다시 말한다. 피그마가 그렇게 두었다.
 * 02 만 문장 끝이 카드와 다르다("있게" 대 "있도록"). 줄여 쓰지 않고 둘 다 둔다.
 */
const RECORD_ITEMS = [
  {
    number: "01",
    title: "오늘의 30초 케어 기록",
    body: "식사, 산책, 수면과 오늘 보인 변화를 짧게 남겨 반려견의 일상을 한곳에 모아요.",
  },
  {
    number: "02",
    title: "필요한 기록을 묻는 케어 질문",
    body: "놓치기 쉬운 관찰 항목을 질문으로 확인하고, 보호자가 다음 기록을 이어갈 수 있도록 도와요.",
  },
];

const REVIEW_ITEMS = [
  {
    number: "03",
    title: "주간 변화 비교",
    body: "이번 주 기록을 이전 기록과 비교해 예전과 달라진 점을 보호자가 쉽게 살펴볼 수 있어요.",
  },
  {
    number: "04",
    title: "병원 준비 요약",
    body: "관찰한 변화와 타임라인을 정리해 진료 상담 전에 필요한 내용을 준비할 수 있어요.",
  },
];

export default function AppService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* 소개 */}
        <section className="bg-card">
          <div className="mx-auto grid w-full max-w-[1248px] items-center gap-10 px-6 py-[96px] lg:grid-cols-2 lg:gap-x-[70px]">
            <div className="max-w-[576px]">
              <p className="text-sm font-medium leading-[19.6px] text-muted-foreground">
                포에버 앱
              </p>
              <h1 className="pt-4 text-4xl font-bold tracking-[-1.2px] md:text-[48px] md:leading-[57.6px]">
                짧은 오늘 기록으로 달라진 점을 확인하세요
              </h1>
              <p className="pt-6 text-lg leading-[29.7px] text-muted-foreground">
                짧은 일상 기록부터 주간 변화 비교와 병원 상담 준비까지, 반려견의
                케어 흐름을 한곳에서 이어갑니다.
              </p>

              <StoreButtons className="pb-5 pt-[42px]" />

              <p className="text-sm leading-[21.7px] text-muted-foreground">
                현재 앱은 두 가지 앱스토어 모두에서 설치할 수 있습니다.
                <br />
                포에버는 굿즈 제작과 반려인 설문 데이터 수집에도 운영 역량을
                집중하고 있습니다.
              </p>
            </div>

            <div className="flex justify-center lg:justify-start">
              <PhonePlaceholder label="대표 앱 화면" />
            </div>
          </div>
        </section>

        {/* 앱 활용 흐름 */}
        <section className="bg-background">
          <div className="mx-auto grid w-full max-w-[1248px] gap-6 px-6 py-[80px] md:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-[200px_476px_476px] lg:items-center">
            <p className="text-sm font-medium leading-[19.6px] text-muted-foreground">
              앱 활용 흐름
            </p>
            <p className="text-2xl font-medium tracking-[-0.56px] md:text-[28px] md:leading-[36.4px]">
              기록 → 비교 → 병원 준비
            </p>
            <p className="text-base leading-[26.4px] text-muted-foreground md:col-start-2 lg:col-start-3">
              보호자가 직접 확인한 사실을 차곡차곡 쌓아 다음 케어 판단에
              활용합니다.
            </p>
          </div>
        </section>

        {/* 주요 기능 */}
        <section className="bg-muted/60">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[100px]">
            <h2 className="text-2xl font-bold md:text-[30px] md:leading-9">
              앱의 주요 기능
            </h2>
            <ul className="grid gap-5 pt-10 md:grid-cols-2">
              {FEATURE_CARDS.map(feature => (
                <li
                  key={feature.title}
                  className="rounded-[16px] border border-border bg-card p-[25px] shadow-sm"
                >
                  <h3 className="text-xl font-semibold leading-7">
                    {feature.title}
                  </h3>
                  <p className="pt-3 text-base leading-[26px] text-muted-foreground">
                    {feature.body}
                  </p>
                </li>
              ))}
            </ul>
            <p className="pt-7 text-sm leading-5 text-muted-foreground">
              * 앱의 기록과 안내는 의료 진단이나 치료 지시를 대신하지 않습니다.
            </p>
          </div>
        </section>

        {/* 기록 */}
        <section className="bg-card">
          <div className="mx-auto grid w-full max-w-[1248px] items-center gap-10 px-6 py-[96px] lg:grid-cols-2 lg:gap-x-16">
            <div className="flex justify-center lg:justify-start">
              <PhonePlaceholder label="기록 화면" />
            </div>
            <FlowList eyebrow="기록" items={RECORD_ITEMS} />
          </div>
        </section>

        {/* 확인·준비 */}
        <section className="bg-muted">
          <div className="mx-auto grid w-full max-w-[1248px] items-center gap-10 px-6 py-[96px] lg:grid-cols-2 lg:gap-x-16">
            <FlowList eyebrow="확인·준비" items={REVIEW_ITEMS} />
            <div className="flex justify-center lg:justify-end">
              <PhonePlaceholder label="비교 · 병원 준비 화면" />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

/**
 * 번호가 붙은 흐름 목록 한 덩어리.
 *
 * 줄 위아래로 선이 지나간다. 카드가 아니다.
 */
function FlowList({
  eyebrow,
  items,
}: {
  eyebrow: string;
  items: { number: string; title: string; body: string }[];
}) {
  return (
    <div>
      <p className="text-xl font-medium leading-[19.6px] text-primary">
        {eyebrow}
      </p>
      <ol className="pt-11">
        {items.map(item => (
          <li
            key={item.number}
            className="border-t-[3px] border-border py-7 last:border-b-[3px]"
          >
            <p className="text-sm font-medium leading-[19.6px] text-muted-foreground">
              {item.number}
            </p>
            <h3 className="pt-3 text-xl font-medium md:text-[22px] md:leading-[29.7px]">
              {item.title}
            </h3>
            <p className="pt-3 text-base leading-[26.4px] text-muted-foreground">
              {item.body}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}

/**
 * 앱 화면이 들어갈 자리.
 *
 * 피그마도 회색 상자에 이름만 적어 두었다. 실제 화면을 받으면 여기를 바꾼다.
 * 자리를 지우면 두 칸 배치가 한 칸으로 무너져 화면 구조가 달라진다.
 */
function PhonePlaceholder({ label }: { label: string }) {
  return (
    <div className="flex h-[520px] w-[240px] items-center justify-center border-[3px] border-[#D1D5DC] bg-[#F3F4F6]">
      <p className="text-xs leading-[18px] text-[#99A1AF]">{label}</p>
    </div>
  );
}
