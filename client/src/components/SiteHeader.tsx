import { Link, useLocation } from "wouter";

/**
 * 모든 페이지가 공유하는 상단 내비게이션.
 *
 * 페이지마다 헤더를 따로 두면 메뉴가 하나 늘 때 어느 페이지는 빠진 채로 남는다.
 * 정책 페이지는 자체 헤더를 쓴다. 조항만 읽으러 온 사람에게 서비스 메뉴를
 * 늘어놓을 이유가 없다.
 */

const NAV_ITEMS = [
  { href: "/", label: "홈" },
  { href: "/service", label: "서비스 소개" },
  { href: "/app", label: "앱 서비스" },
  { href: "/roadmap", label: "향후 방향" },
  { href: "/contact", label: "문의" },
  { href: "/goods-survey", label: "맞춤 굿즈" },
  { href: "/goods-survey/survey", label: "설문 참여" },
];

export default function SiteHeader() {
  const [location] = useLocation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between px-8 py-3">
        <Link href="/" className="rounded-[10px] py-1" aria-label="포에버 홈">
          <img
            src="/goods-survey/paw-ever-logo.svg"
            alt="PAW-EVER"
            width="118"
            height="16"
            className="h-4 w-auto"
          />
        </Link>

        <nav aria-label="주요 메뉴">
          <ul className="flex items-center gap-1">
            {NAV_ITEMS.map(item => {
              const current = location === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    className={`block rounded-[10px] p-2 text-sm font-medium transition-colors hover:bg-accent/10 ${
                      current ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
