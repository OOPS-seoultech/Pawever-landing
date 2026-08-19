import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { ExternalLink, Mail } from "lucide-react";
import { Link } from "wouter";

/**
 * 문의.
 *
 * 유형을 고르면 제목이 채워진 메일 양식이 열린다. 어느 창구로 보낼지 고민하지
 * 않아도 되게 하고, 받는 쪽도 제목만 보고 분류할 수 있게 한다.
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
 * 아직 받지 못했다. 비어 있으면 링크를 그리지 않는다. 눌러도 아무 데도 가지
 * 않는 링크를 두는 것보다 없는 편이 낫다.
 */
const SOCIAL_LINKS = [
  { label: "Instagram", href: "" },
  { label: "Threads", href: "" },
];

const mailtoHref = (subject: string) =>
  `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}`;

export default function Contact() {
  const availableSocials = SOCIAL_LINKS.filter(social => social.href);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />

      <main>
        {/* 소개 */}
        <section className="mx-auto w-full max-w-[1280px] px-8 py-20 lg:py-28">
          <div className="max-w-3xl">
            <p className="text-base font-medium text-primary">바로 문의하기</p>
            <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight md:text-5xl">
              궁금한 유형을 선택하면 이메일 양식이 열려요
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              24시간 문의 가능 · 평일 09:00~18:00 순차 회신
            </p>
          </div>
        </section>

        {/* 문의 유형 */}
        <section className="mx-auto w-full max-w-[1280px] px-8 pb-20">
          <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {INQUIRY_TYPES.map(type => (
              <li
                key={type.title}
                className="flex flex-col rounded-[16px] border border-border bg-card p-6 shadow-sm"
              >
                <h2 className="text-xl font-semibold">{type.title}</h2>
                <p className="mt-3 flex-1 leading-relaxed text-muted-foreground">
                  {type.body}
                </p>
                <a
                  href={mailtoHref(type.subject)}
                  className="mt-6 inline-flex h-9 items-center justify-center gap-2 rounded-[10px] bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  이메일 작성
                  <Mail className="h-4 w-4" aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* 운영 정보와 데이터 삭제 */}
        <section className="bg-muted/60 py-16">
          <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-8 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-primary">운영 정보</p>
              <h2 className="mt-3 text-2xl font-bold">포에버(PAW-EVER)</h2>
              <dl className="mt-5 grid grid-cols-[auto_1fr] gap-x-5 gap-y-3 text-sm">
                {OPERATOR_INFO.map(item => (
                  <div key={item.term} className="contents">
                    <dt className="text-muted-foreground">{item.term}</dt>
                    <dd>{item.description}</dd>
                  </div>
                ))}
              </dl>
              {availableSocials.length > 0 && (
                <div className="mt-6 flex gap-3">
                  {availableSocials.map(social => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm font-medium underline"
                    >
                      {social.label}
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div>
              <p className="text-sm font-medium text-primary">계정과 데이터</p>
              <h2 className="mt-3 text-2xl font-bold">
                앱 데이터 삭제가 필요한가요?
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                별도 안내 페이지에서 요청 방법과 이메일 양식을 확인할 수
                있습니다.
              </p>
              <Link
                href="/account-deletion"
                className="mt-6 inline-flex h-9 items-center justify-center rounded-[10px] border border-border bg-card px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent/10"
              >
                데이터 삭제 요청 안내
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
