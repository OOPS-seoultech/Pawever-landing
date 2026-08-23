import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Link } from "wouter";

/**
 * 문의.
 *
 * 유형을 고르면 제목이 채워진 메일 양식이 열린다. 어느 창구로 보낼지 고민하지
 * 않아도 되게 하고, 받는 쪽도 제목만 보고 분류할 수 있게 한다.
 *
 * 피그마 8. Website / Identify and Connect Home Component > Component
 * (5210:2130) 기준이다. 글자 크기·색·여백은 그 프레임의 CSS 값이다.
 *
 * 예전 화면은 카드 다섯 장을 세 칸 격자에 늘어놓았다. 피그마는 화면 폭을 다
 * 쓰는 가로 줄 다섯 개다 — 왼쪽에 유형, 가운데 설명, 오른쪽 끝에 링크.
 * 격자로 두면 유형을 훑어 내려가는 눈길이 줄마다 끊긴다.
 */

const CONTACT_EMAIL = "pawever01@gmail.com";

const INQUIRY_TYPES = [
  {
    title: "일반 문의",
    body: "포에버 서비스와 운영 전반에 대해 궁금한 점을 남겨 주세요.",
    subject: "[일반 문의] 포에버 서비스 문의",
  },
  {
    title: "앱 문의",
    body: "앱 이용, 계정, 기능에 관한 내용을 알려 주세요.",
    subject: "[앱 문의] 포에버 앱 문의",
  },
  {
    title: "굿즈 문의",
    body: "맞춤 굿즈 신청, 제작 과정, 배송에 관한 내용을 알려 주세요.",
    subject: "[굿즈 문의] 맞춤 굿즈 문의",
  },
  {
    title: "제휴 문의",
    body: "서비스, 콘텐츠, 연구 등 함께할 제안을 남겨 주세요.",
    subject: "[제휴 문의] 포에버 제휴 제안",
  },
  {
    title: "기타 문의",
    body: "위 유형에 포함되지 않는 문의를 남겨 주세요.",
    subject: "[기타 문의] 포에버 문의",
  },
];

const OPERATOR_INFO = [
  { term: "운영", description: "습관적 마케팅" },
  { term: "담당", description: "이종무" },
  { term: "이메일", description: CONTACT_EMAIL },
  { term: "연락처", description: "0507-1314-6802" },
];

/**
 * 소셜 채널 주소.
 *
 * 스레드는 threads.net 이 아니라 threads.com 이다. 메타가 주소를 옮겼고,
 * 옛 주소도 아직 넘겨주지만 언젠가 끊긴다.
 *
 * 비면 스토어 버튼과 같게 누를 수 없는 상태로 그린다 — 자리는 피그마대로
 * 두되 아무 데도 가지 않는 링크는 걸지 않는다.
 */
const SOCIAL_LINKS = [
  { label: "Instagram", href: "https://www.instagram.com/pawever.kr/" },
  { label: "Threads", href: "https://www.threads.com/@pawever.kr" },
];

const mailtoHref = (subject: string) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

export default function Contact() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* 소개 */}
        <section className="bg-card">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[96px]">
            <p className="text-sm font-medium leading-[19.6px] text-muted-foreground">
              바로 문의하기
            </p>
            <h1 className="pt-4 text-4xl font-bold tracking-[-1.2px] md:text-[48px] md:leading-[57.6px]">
              질문할 유형을 선택하면 이메일 양식이 열려요
            </h1>
            <p className="pt-6 text-lg leading-[29.7px] text-muted-foreground">
              24시간 문의 가능 · 평일 09:00~18:00 기준 순차 회신
            </p>
          </div>
        </section>

        {/* 문의 유형 */}
        <section className="bg-card">
          <div className="mx-auto w-full max-w-[1248px] px-6 pb-[80px]">
            <ul>
              {INQUIRY_TYPES.map(type => (
                <li
                  key={type.title}
                  className="grid min-h-[88px] gap-2 border-b-[3px] border-border py-7 last:border-b-0 md:grid-cols-[288px_minmax(0,1fr)_288px] md:items-center md:gap-x-6"
                >
                  <h2 className="text-xl font-medium md:text-[22px] md:leading-[29.7px]">
                    {type.title}
                  </h2>
                  <p className="text-base leading-[26.4px] text-muted-foreground">
                    {type.body}
                  </p>
                  {/* 버튼이 아니라 주황 밑줄 글자다. 줄마다 버튼을 두면
                      다섯 줄이 다섯 번 눌러 달라고 조르는 화면이 된다. */}
                  <a
                    href={mailtoHref(type.subject)}
                    className="text-base font-medium leading-4 text-primary underline md:justify-self-end"
                  >
                    이메일 작성 ↗
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 계정과 데이터 */}
        <section className="bg-card">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[80px]">
            <p className="text-sm font-medium leading-[19.6px] text-primary">
              계정과 데이터
            </p>
            <h2 className="pt-4 text-2xl font-medium tracking-[-0.48px] md:leading-[32.4px]">
              앱 데이터 삭제가 필요한가요?
            </h2>
            <div className="flex flex-col gap-3 pt-2 md:flex-row md:items-start md:justify-between">
              <p className="max-w-[474px] text-base leading-[26.4px] text-muted-foreground">
                별도 안내 페이지에서 요청 방법과 이메일 양식을 확인할 수
                있습니다.
              </p>
              <Link
                href="/account-deletion"
                className="text-base leading-[26.4px] underline"
              >
                데이터 삭제 요청 안내 ↗
              </Link>
            </div>
          </div>
        </section>

        {/* 운영 정보 */}
        <section className="bg-background">
          <div className="mx-auto w-full max-w-[1248px] px-6 py-[70px]">
            <p className="text-sm font-medium leading-[19.6px] text-primary">
              운영 정보
            </p>
            <h2 className="pt-4 text-2xl font-medium tracking-[-0.48px] md:leading-[32.4px]">
              포에버(PAW-EVER)
            </h2>

            <dl className="pt-6">
              {OPERATOR_INFO.map(item => (
                <div key={item.term} className="flex">
                  <dt className="w-20 shrink-0 text-base leading-[26.4px] text-muted-foreground">
                    {item.term}
                  </dt>
                  <dd className="text-base leading-[26.4px]">
                    {item.description}
                  </dd>
                </div>
              ))}
            </dl>

            <ul className="flex gap-5 pt-5">
              {SOCIAL_LINKS.map(social => (
                <li key={social.label}>
                  <SocialLink social={social} />
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
 * 소셜 채널 한 줄.
 *
 * 피그마는 이름에만 밑줄을 긋고 화살표는 그대로 둔다.
 */
function SocialLink({ social }: { social: { label: string; href: string } }) {
  const body = (
    <>
      <span className="underline">{social.label}</span> ↗
    </>
  );

  if (!social.href) {
    return (
      <span
        aria-disabled="true"
        className="cursor-default text-base font-bold leading-[26.4px] opacity-60"
      >
        {body}
      </span>
    );
  }

  return (
    <a
      href={social.href}
      target="_blank"
      rel="noreferrer noopener"
      className="text-base font-bold leading-[26.4px] transition-opacity hover:opacity-80"
    >
      {body}
    </a>
  );
}
