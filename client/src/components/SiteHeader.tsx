import { Link, useLocation } from "wouter";

/**
 * 모든 페이지가 공유하는 상단 내비게이션.
 *
 * 페이지마다 헤더를 따로 두면 메뉴가 하나 늘 때 어느 페이지는 빠진 채로 남는다.
 * 정책 페이지는 자체 헤더를 쓴다. 조항만 읽으러 온 사람에게 서비스 메뉴를
 * 늘어놓을 이유가 없다.
 *
 * 피그마 8. Website / PawEverHome > Header (5200:1449) 기준이다.
 * 화면마다 헤더를 다시 그리지 않으므로, 여기 값이 곧 모든 화면의 헤더다.
 * 한동안 로고가 워드마크만 16px 로 들어가 있었고 지금 보는 메뉴가 검정이었다.
 * 본문만 피그마에 맞추고 헤더는 "이미 있으니 맞겠지"로 넘겨서 생긴 일이다.
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
    <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1312px] items-center justify-between px-6 py-3.5">
        {/* shrink-0: 이 img 는 flex 아이템이라 기본값이 shrink 1, min-width 0
            이다. 메뉴 일곱 개가 374px 를 요구하면 로고가 0까지 밀려 좁은
            화면에서 아예 사라졌다(390px 에서 0×55). 피그마 값 65×55 를 어떤
            폭에서도 지킨다. */}
        <Link
          href="/"
          className="shrink-0 rounded-[10px]"
          aria-label="포에버 홈"
        >
          {/* 발바닥 아이콘과 워드마크가 한 덩어리다. 워드마크만 쓰면 피그마와
              다른 것이 된다. logo.png 는 주황 배경에 흰 글씨라 여기서 못 쓴다. */}
          <img
            src="/logo-mark.png"
            alt="PAW-EVER"
            width="132"
            height="112"
            className="h-[55px] w-auto"
          />
        </Link>

        {/* 피그마에는 데스크톱 헤더(1440px)뿐이라 좁은 화면에 둘 자리가 없다.
            메뉴를 지우지도 접지도 않고 옆으로 밀어 보게 둔다 — 지우면 그 길이
            사라지고, 접으면 피그마에 없는 모양을 지어내게 된다. 넓은 화면에서는
            다 들어가므로 아무 일도 일어나지 않는다.

            min-w-0 이 없으면 flex 아이템의 최소 크기가 내용 폭이라 overflow 가
            걸리지 않고 그대로 넘친다. */}
        <nav
          aria-label="주요 메뉴"
          className="min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <ul className="flex items-center gap-1 whitespace-nowrap">
            {NAV_ITEMS.map(item => {
              const current = location === item.href;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={current ? "page" : undefined}
                    // 지금 보는 화면은 주황이고 글자 아래에 선이 깔린다. 색만
                    // 바꾸면 나머지 메뉴와 무게가 비슷해 어디에 있는지 눈에
                    // 들어오지 않는다. 피그마는 2px 짜리 선을 함께 둔다.
                    className={`block rounded-[10px] px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/10 ${
                      current
                        ? "text-primary underline decoration-2 underline-offset-[6px]"
                        : "text-muted-foreground"
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
