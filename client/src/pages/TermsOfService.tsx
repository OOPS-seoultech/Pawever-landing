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
              <h1 className="text-3xl font-bold text-foreground">Pawever</h1>
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
              Pawever 서비스 이용약관
            </h2>
            <p className="text-sm text-muted-foreground">
              마지막 업데이트: 2026년 2월 24일
            </p>
          </div>

          {/* 제1장 총칙 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">제1장 총칙</h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제1조 (목적)
                </h4>
                <p className="text-foreground/70 leading-relaxed">
                  본 약관은 습관적마케팅(이하 "회사")이 제공하는 '포에버(Pawever)' 모바일 애플리케이션 및 관련 웹페이지(통칭하여 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제2조 (약관의 명시, 효력 및 변경)
                </h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li>회사는 본 약관을 서비스 초기화면 또는 설정 메뉴에 게시하며, 「약관의 규제에 관한 법률」 등 관련 법령을 준수합니다.</li>
                  <li>약관 개정 시 적용일 7일 전(이용자에게 불리한 변경은 30일 전)부터 공지하며, 적용일 이후에도 서비스를 계속 이용하는 경우 변경된 약관에 동의한 것으로 간주합니다.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제3조 (용어의 정의)
                </h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li><strong>"오너(Owner)"</strong> : 반려동물 프로필을 최초 생성하여 전용 권한(녹음, 데이터 확정 등)을 보유한 회원.</li>
                  <li><strong>"게스트(Guest)"</strong> : 초대코드를 통해 특정 프로필을 공동 관리 또는 조회하도록 허용된 회원.</li>
                  <li><strong>"발자국 남기기"</strong> : 반려동물과의 추억 기록을 위해 회사가 제공하는 미션 리스트.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제2장 서비스 기능 및 책임의 한계 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제2장 서비스 기능 및 책임의 한계 (특화 조항)
            </h3>
            
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제4조 (발자국 남기기 및 음성 녹음 기능)
                </h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li><strong>서비스의 성격</strong>: '발자국 남기기' 미션은 정서적 공감과 추억 기록을 돕기 위한 참고 자료일 뿐이며, 미션 수행의 당위성 및 결과에 대한 법적 책임은 이용자 본인에게 있습니다.</li>
                  <li><strong>음성 녹음의 공유</strong>: 오너가 녹음한 내용은 초대된 게스트에게 노출됩니다. 회사는 기술적 저장·전달 도구만 제공하며, 음성 정보의 내용이나 공유로 인해 발생하는 이용자 간 감정적 대립, 사생활 침해, 명예훼손 등 모든 분쟁에 대하여 회사는 개입하지 않으며 어떠한 책임도 지지 않습니다.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제5조 (이별 전 미리 살펴보기 및 행정 정보 제공)
                </h4>
                <p className="text-foreground/70 leading-relaxed mb-2">
                  회사는 사체 수습, 행정 절차, 지자체 지원 사업 등의 정보를 제공하나, 이는 공공 정보를 전달하는 단순 정보 매개 서비스입니다.
                </p>
                <p className="font-semibold text-foreground mb-2">이용자 주의사항 및 면책:</p>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li>회사는 제공되는 정보의 정확성, 최신성, 적법성을 보증하지 않으며 정보 오류로 인한 손해에 대해 책임지지 않습니다.</li>
                  <li>모든 정확한 정보와 절차의 최종 확인 책임은 이용자 본인에게 있습니다.</li>
                  <li>이용자는 행정 절차 진행 시 반드시 관할 기관의 담당자와 직접 소통하여 확인 후 진행해야 합니다.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제6조 (반려동물 장례 및 커뮤니티 분쟁)
                </h4>
                <ul className="list-disc list-inside space-y-2 text-foreground/70">
                  <li><strong>장례 서비스</strong>: 회사는 장례 업체를 단순 소개·연결할 뿐 계약의 당사자가 아닙니다. 서비스 품질, 결제, 사고 등 장례 업체와 이용자 간 발생하는 모든 문제는 당사자 간에 해결해야 합니다.</li>
                  <li><strong>별자리 추모관</strong>: 커뮤니티 내 이용자 간 분쟁은 이용자 상호 간 해결이 원칙이며, 회사는 기술적 제재(게시물 삭제, 계정 정지 등) 외에 실질적인 중재나 배상 책임을 부담하지 않습니다.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 제3장 지식재산권 및 콘텐츠 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제3장 지식재산권 및 콘텐츠
            </h3>
            
            <div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                제7조 (콘텐츠 홍보 활용)
              </h4>
              <ul className="list-disc list-inside space-y-2 text-foreground/70">
                <li>회원은 서비스 내 게시한 콘텐츠(별자리 추모관, 일기 등)를 회사가 홍보 목적으로 이용하는 것에 동의합니다.</li>
                <li>회사는 해당 콘텐츠 이용 시 반드시 익명화(가명처리) 조치를 취하며, 성명 등 이용자의 민감한 개인정보는 일절 포함하지 않습니다.</li>
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
                  <li>회사는 무료 서비스 이용과 관련하여 이용자에게 발생한 손해에 대하여 회사의 고의·중과실이 없는 한 배상 책임을 지지 않습니다.</li>
                  <li>회사가 부담하는 총 배상책임의 상한은 관련 법령이 허용하는 범위 내에서 최근 6개월간 이용자의 서비스 결제액 또는 금오십만원(₩500,000) 중 낮은 금액으로 제한합니다. (커머스 도입 시 적용)</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold text-foreground mb-2">
                  제9조 (관할법원)
                </h4>
                <p className="text-foreground/70 leading-relaxed">
                  서비스 이용과 관련한 소송은 서울북부지방법원을 제1심 관할법원으로 합니다.
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
                href="/"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                홈으로
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
