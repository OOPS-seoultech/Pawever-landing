import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * 이용약관 페이지
 *
 * 디자인 철학: 따뜻한 미니멀리즘
 * - 오렌지 포인트 컬러로 중요 요소 강조
 * - 충분한 여백으로 가독성 확보
 * - 부드러운 애니메이션으로 사용자 경험 개선
 */

export default function TermsOfService() {
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background border-b border-border">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">PAW-EVER</h1>
              <p className="text-sm text-muted-foreground mt-1">
                서비스 이용약관
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => (window.location.href = "/")}
              className="hover:bg-accent"
            >
              홈으로
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-3xl mx-auto px-4 py-16">
        <div className="prose prose-sm max-w-none text-foreground/80 space-y-8">
          {/* Title */}
          <div className="mb-12">
            <h2 className="text-4xl font-bold text-foreground mb-2">
              PAW-EVER 서비스 이용약관
            </h2>
            <p className="text-sm text-muted-foreground">
              마지막 업데이트: 2026년 8월 19일
            </p>
          </div>

          {/* 제1장 총칙 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제1장 총칙
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제1조 (목적)
                </h4>
                <p className="text-foreground/70 leading-relaxed">
                  본 약관은 습관적마케팅(이하 "회사")이 운영하는 PAW-EVER 앱,
                  웹사이트 및 굿즈 관련 서비스(이하 "서비스")의 이용 조건과
                  회사·이용자의 권리·의무를 정합니다.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제2조 (약관의 명시, 효력 및 변경)
                </h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li>
                    회사는 본 약관을 서비스 초기화면 또는 설정 메뉴에 게시하며,
                    「약관의 규제에 관한 법률」 등 관련 법령을 준수합니다.
                  </li>
                  <li>
                    약관 개정 시 적용일 7일 전(이용자에게 불리한 변경은 30일
                    전)부터 공지하며, 적용일 이후에도 서비스를 계속 이용하는
                    경우 변경된 약관에 동의한 것으로 간주합니다.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제3조 (용어의 정의)
                </h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li>
                    <strong>"오너(Owner)"</strong> : 반려동물 프로필을 최초
                    생성하여 전용 권한(녹음, 데이터 확정 등)을 보유한 회원.
                  </li>
                  <li>
                    <strong>"게스트(Guest)"</strong> : 초대코드를 통해 특정
                    프로필을 공동 관리 또는 조회하도록 허용된 회원.
                  </li>
                  <li>
                    <strong>"발자국 남기기"</strong> : 반려동물과의 추억 기록을
                    위해 회사가 제공하는 미션 리스트.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제2장 서비스 유형 및 이용 기준 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제2장 서비스 유형 및 이용 기준
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제4조 (발자국 남기기 및 음성 녹음 기능)
                </h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li>
                    PAW-EVER 앱은 반려동물의 기록·케어·추모 기능을 제공하며,
                    의료적 진단이나 치료를 제공하지 않습니다.
                  </li>
                  <li>
                    음성 기록은 오너가 초대한 게스트에게만 공유됩니다. 이용자는
                    타인의 권리를 침해하거나 동의 없이 음성을 공유해서는 안
                    됩니다.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제5조 (장례업체 정보 및 위치기반 검색)
                </h4>
                <p className="text-foreground/70 leading-relaxed mb-2">
                  회사는 장례업체·행정 절차 등 관련 정보를 제공하며, 이용자와
                  업체 간 계약의 당사자가 아닙니다.
                </p>
                <p className="font-semibold text-foreground mb-2">
                  이용자 주의사항 및 면책:
                </p>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li>
                    회사는 정보의 정확성과 최신성 유지를 위해 노력하나, 계약 전
                    이용자가 해당 업체 또는 관할 기관에 직접 확인해야 합니다.
                  </li>
                  <li>
                    모든 정확한 정보와 절차의 최종 확인 책임은 이용자 본인에게
                    있습니다.
                  </li>
                  <li>
                    이용자는 행정 절차 진행 시 반드시 관할 기관의 담당자와 직접
                    소통하여 확인 후 진행해야 합니다.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제6조 (커뮤니티 운영)
                </h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li>
                    <strong>커뮤니티</strong>: 이용자가 게시한 추모 댓글·후기 등
                    상호작용 콘텐츠는 서비스 운영 기준을 준수해야 합니다.
                  </li>
                  <li>
                    이용자 간 분쟁은 당사자 해결이 원칙이며, 회사는 필요한 경우
                    게시물 삭제·이용 제한 등 운영 조치를 할 수 있습니다.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제3장 콘텐츠와 굿즈 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제3장 콘텐츠와 굿즈
            </h3>

            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                제7조 (콘텐츠·사진의 이용)
              </h4>
              <ul className="list-disc list-inside space-y-2 text-foreground/70">
                <li>
                  회사는 웹사이트·SNS 공개에 별도 동의한 사연과 사진에 한하여
                  해당 콘텐츠를 활용할 수 있습니다.
                </li>
                <li>
                  후기는 서비스 개선에 사용하며, 후기·사진을 홍보에 활용하려는
                  경우 별도 선택 동의를 받습니다.
                </li>
              </ul>
            </div>
          </section>

          {/* 제4장 면책 및 기타 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제4장 면책 및 기타
            </h3>

            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제8조 (손해배상 및 책임 제한)
                </h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li>
                    회사의 손해배상 책임은 관련 법령 및 본 약관에 따라
                    정해집니다.
                  </li>
                  <li>
                    회사의 책임 제한은 관련 법령이 허용하는 범위에서만
                    적용됩니다.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제9조 (관할법원)
                </h4>
                <p className="text-foreground/70 leading-relaxed">
                  서비스 이용과 관련한 분쟁의 관할법원은 관련 법령에 따라
                  정합니다.
                </p>
              </div>
            </div>
          </section>

          {/* Footer Links */}
          <div className="border-t border-border pt-8 mt-12">
            <div className="flex flex-col sm:flex-row gap-6 justify-center text-sm">
              <a
                href="/privacy"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                개인정보취급방침
              </a>
              <span className="text-foreground/30">|</span>
              <a
                href="/contact"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                문의하기
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 w-12 h-12 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
