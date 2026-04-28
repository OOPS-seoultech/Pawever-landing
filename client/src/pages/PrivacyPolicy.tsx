import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * 개인정보 처리방침 페이지
 * 
 * 디자인 철학: 따뜻한 미니멀리즘
 * - 오렌지 포인트 컬러로 중요 요소 강조
 * - 충분한 여백으로 가독성 확보
 * - 부드러운 애니메이션으로 사용자 경험 개선
 */

export default function PrivacyPolicy() {
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
                개인정보 처리방침
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
              Pawever 개인정보 처리방침
            </h2>
            <p className="text-sm text-muted-foreground">
              마지막 업데이트: 2026년 2월 24일
            </p>
          </div>

          {/* 제1조 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제1조 (수집 정보 항목 및 수집 목적)
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-4">
              회사는 서비스 제공 및 개선을 위해 최소한의 개인정보를 수집합니다.
            </p>
            
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-secondary/30">
                    <th className="border border-border px-4 py-2 text-left font-semibold">구분</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">수집 항목</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">이용 목적</th>
                    <th className="border border-border px-4 py-2 text-left font-semibold">보유 및 이용 기간</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-4 py-2">필수</td>
                    <td className="border border-border px-4 py-2">성명, 이메일 주소</td>
                    <td className="border border-border px-4 py-2">회원 식별 및 가입 확인</td>
                    <td className="border border-border px-4 py-2">탈퇴 시까지 (단, 법령상 의무 기간 보존)</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2">선택</td>
                    <td className="border border-border px-4 py-2">성별, 생년월일</td>
                    <td className="border border-border px-4 py-2">인구통계학적 통계 분석, 서비스 개선</td>
                    <td className="border border-border px-4 py-2">탈퇴 시 또는 동의 철회 시</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2">서비스 데이터</td>
                    <td className="border border-border px-4 py-2">반려동물 정보, 음성 기록, 일기</td>
                    <td className="border border-border px-4 py-2">개인화 서비스 제공, 익명화 홍보 활용</td>
                    <td className="border border-border px-4 py-2">탈퇴 시까지 (탈퇴 후 5일 내 파기)</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2">자동 수집</td>
                    <td className="border border-border px-4 py-2">IP, 접속 로그, 서비스 이용 기록</td>
                    <td className="border border-border px-4 py-2">부정이용 방지, 서비스 최적화</td>
                    <td className="border border-border px-4 py-2">3개월 (통신비밀보호법)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* 제2조 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제2조 (가명정보 처리 및 신고 데이터 활용)
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-4">
              회사는 개인정보 보호법 제28조의2에 따라 서비스 내 신고 발생 시 수집된 성별, 연령 정보를 가명처리하여 통계적 분석 목적으로 활용할 수 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/70">
              <li><strong>분석 목적</strong>: 부정이용 방지 및 연령/성별에 따른 위반 행위 통계 산출</li>
              <li><strong>안전 조치</strong>: 개인 식별이 불가능하도록 범주화(예: 20대 남성)하여 관리하며, 접근 권한을 대표 및 전담 개발자(2인)로 엄격히 제한합니다.</li>
            </ul>
          </section>

          {/* 제3조 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제3조 (개인정보 처리 위탁)
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-4">
              회사는 서비스 품질 향상을 위해 다음과 같이 위탁하고 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/70">
              <li><strong>서버 관리</strong>: 네이버 클라우드 (NCP)</li>
              <li><strong>메시지 발송</strong>: 채널톡, 솔라피 (Solapi)</li>
            </ul>
          </section>

          {/* 제4조 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제4조 (보유 및 파기 기간)
            </h3>
            <ul className="list-disc list-inside space-y-2 text-foreground/70">
              <li><strong>일반 이용 정보</strong>: 회원 탈퇴 시까지 보유하며, 탈퇴 신청 후 5일 이내에 재생 불가능한 방법으로 파기합니다.</li>
              <li><strong>법령에 따른 예외 보관</strong>:
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>접속 로그 및 서비스 이용 기록: 3개월 (통신비밀보호법)</li>
                  <li>결제 및 청약철회 관련 기록: 5년 (전자상거래법) - 이후 추가</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 제5조 마케팅 */}
          <section className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제5조 (마케팅 정보 수신 동의 - 선택 사항)
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-4">
              회사는 이용자의 사전 동의를 얻어 이벤트 및 혜택 정보를 전송할 수 있습니다.
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/70">
              <li><strong>동의 철회</strong>: 이용자는 언제든지 [설정 &gt; 알림] 메뉴를 통해 수신 여부를 변경할 수 있습니다.</li>
              <li><strong>야간 발송 제한</strong>: 오후 9시부터 익일 오전 8시까지 광고 발송을 제한합니다.</li>
            </ul>
          </section>

          {/* 제6조 */}
          <section>
            <h3 className="text-2xl font-bold text-foreground mb-4">
              제6조 (정보 주체의 권리 및 고충 처리)
            </h3>
            <p className="text-foreground/70 leading-relaxed mb-4">
              회원은 개인정보의 열람, 수정, 삭제를 요구할 수 있으며 회사는 내용 확인 후 판단 하에 이를 즉시 처리합니다.
            </p>
            
            <div className="bg-secondary/30 rounded-lg p-6 mt-6">
              <h4 className="font-semibold text-foreground mb-3">개인정보 보호 책임자</h4>
              <div className="space-y-2 text-foreground/70">
                <p><strong>이름</strong>: 이종무</p>
                <p><strong>이메일</strong>: habitualmarketing@gmail.com</p>
                <p><strong>전화</strong>: 010-9004-6802</p>
              </div>
            </div>
          </section>

          {/* Footer Links */}
          <div className="border-t border-border pt-8 mt-12">
            <div className="flex flex-col sm:flex-row gap-6 justify-center text-sm">
              <a
                href="/terms"
                className="text-primary hover:text-primary/80 transition-colors"
              >
                서비스 이용약관
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
