import { Link } from "wouter";
import SellerNotice from "@/components/SellerNotice";

/**
 * 모든 페이지가 공유하는 하단 영역.
 *
 * 이용약관과 개인정보처리방침은 어느 화면에서든 닿을 수 있어야 한다.
 */
export default function SiteFooter() {
  return (
    <footer className="w-full border-t border-border">
      <div className="mx-auto flex w-full max-w-[1248px] flex-col gap-4 px-6 py-14 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          © 2026 포에버(PAW-EVER)
        </p>
        <nav aria-label="정책 메뉴">
          <ul className="flex items-center gap-5">
            <li>
              <Link
                href="/terms"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                이용약관
              </Link>
            </li>
            <li>
              <Link
                href="/privacy"
                className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                개인정보처리방침
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      {/*
       * 판매자 정보와 취소·반품 안내. 지금 있던 줄 아래에 덧붙인다 — 값이 다
       * 차기 전에는 아무것도 그리지 않으므로 오늘 화면은 그대로다.
       *
       *   [카톡 8/24 12:03 단톡, 대표] "1. 홈 화면에 사업자 정보 노출"
       */}
      <SellerNotice />
    </footer>
  );
}
