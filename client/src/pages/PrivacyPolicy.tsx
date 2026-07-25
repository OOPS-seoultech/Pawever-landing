import { Button } from "@/components/ui/button";
import { ChevronUp } from "lucide-react";
import { useEffect, useState } from "react";
import { AnalyticsPreferenceControls } from "@/components/AnalyticsConsent";

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
      <main className="container py-12">
        <div className="prose prose-sm max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <section className="bg-accent/5 p-6 rounded-lg border border-accent/20">
            <p className="text-foreground/80 leading-relaxed">
              습관적마케팅(이하 "회사")은 반려동물 추모 및 케어 서비스
              'Pawever'(이하 "서비스")를 제공함에 있어 이용자의 개인정보를
              보호하고 이와 관련한 고충을 신속하고 성실하게 처리하기 위하여
              다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>
          </section>

          {/* Section 1 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-orange-400 rounded-full"></span>
              제1조 (수집하는 개인정보 항목 및 목적)
            </h2>
            <div className="space-y-4 text-foreground/80">
              <p>회사는 서비스 제공 및 고도화를 위해 다음 정보를 수집합니다.</p>

              <div className="bg-background border border-border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-accent/10 border-b border-border">
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        구분
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        수집 항목
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        이용 목적
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-foreground">
                        보유 기간
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-border hover:bg-accent/5">
                      <td className="px-4 py-3 font-semibold text-orange-500">
                        필수
                      </td>
                      <td className="px-4 py-3">성명, 이메일 주소</td>
                      <td className="px-4 py-3">회원 식별 및 가입 확인</td>
                      <td className="px-4 py-3">탈퇴 시까지</td>
                    </tr>
                    <tr className="border-b border-border hover:bg-accent/5">
                      <td className="px-4 py-3 font-semibold text-foreground/60">
                        선택
                      </td>
                      <td className="px-4 py-3">성별, 생년월일</td>
                      <td className="px-4 py-3">
                        인구통계학적 통계 분석, 서비스 개선
                      </td>
                      <td className="px-4 py-3">탈퇴 시까지</td>
                    </tr>
                    <tr className="border-b border-border hover:bg-accent/5">
                      <td className="px-4 py-3 font-semibold text-foreground/60">
                        선택
                      </td>
                      <td className="px-4 py-3">
                        신고 로그 (원고/피고 식별값, 채팅 스냅샷)
                      </td>
                      <td className="px-4 py-3">부정이용 방지 및 사실 확인</td>
                      <td className="px-4 py-3">민원 처리 후 3년</td>
                    </tr>
                    <tr className="border-b border-border hover:bg-accent/5">
                      <td className="px-4 py-3 font-semibold text-foreground/60">
                        선택
                      </td>
                      <td className="px-4 py-3">
                        서비스 데이터 (반려동물 정보, 음성 기록, 일기)
                      </td>
                      <td className="px-4 py-3">
                        개인화 서비스, 익명화 홍보 활용
                      </td>
                      <td className="px-4 py-3">탈퇴 후 5일 이내 파기</td>
                    </tr>
                    <tr className="border-b border-border hover:bg-accent/5">
                      <td className="px-4 py-3 font-semibold text-orange-500">
                        설문
                      </td>
                      <td className="px-4 py-3">
                        반려견 돌봄 경험 설문 응답, 선택 사연, 광고 유입 경로,
                        기기 범주와 페이지·문항별 활성시간
                      </td>
                      <td className="px-4 py-3">
                        서비스 수요 조사 및 참여 흐름 개선
                      </td>
                      <td className="px-4 py-3">
                        조사 목적 달성 또는 동의 철회 시까지
                      </td>
                    </tr>
                    <tr className="border-b border-border hover:bg-accent/5">
                      <td className="px-4 py-3 font-semibold text-orange-500">
                        굿즈 확정자
                      </td>
                      <td className="px-4 py-3">
                        반려견 사진·이름, 보호자 이름·연락처, 배송지
                      </td>
                      <td className="px-4 py-3">
                        굿즈 제작·발송 및 문의 대응
                      </td>
                      <td className="px-4 py-3">배송 완료 후 3개월</td>
                    </tr>
                    <tr className="hover:bg-accent/5">
                      <td className="px-4 py-3 font-semibold text-foreground/60">
                        자동
                      </td>
                      <td className="px-4 py-3">
                        IP, 접속 로그, 서비스 이용 기록
                      </td>
                      <td className="px-4 py-3">
                        부정이용 방지, 서비스 최적화
                      </td>
                      <td className="px-4 py-3">3개월 (통신비밀보호법)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-orange-400 rounded-full"></span>웹
              분석 및 서비스 개선 측정
            </h2>
            <div className="space-y-4 text-foreground/80">
              <p>
                선택 동의한 경우에만 Google Analytics 4를 로드하여 유입
                경로(UTM), 페이지 활성 이용시간, 설문 진행 이벤트와 기기 범주를
                측정합니다. 설문 답변, 이름, 연락처, 배송지와 반려견 사진은
                Google Analytics로 전송하지 않습니다.
              </p>
              <p className="text-sm">
                외부 방문 분석 설정은 아래에서 언제든 변경할 수 있습니다. 외부
                분석을 사용하지 않아도 설문과 굿즈 신청 기능은 이용할 수
                있습니다. 설문을 시작하면 자체 연구를 위해 유입 경로, 기기
                유형과 응답 소요시간이 무작위 응답 ID와 함께 Pawever 내부에
                저장됩니다.
              </p>
              <AnalyticsPreferenceControls />
            </div>
          </section>

          {/* Section 2 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-orange-400 rounded-full"></span>
              제2조 (정보주체의 권리 보장 및 통제권 강화)
            </h2>
            <div className="space-y-4 text-foreground/80">
              <p>
                회사는 이용자의 개인정보 자기결정권을 존중하며 다음의 조치를
                시행합니다.
              </p>

              <div className="space-y-3">
                <div className="bg-background border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    열람 및 수정
                  </h3>
                  <p>
                    이용자는 앱 내 [설정 &gt; 내 정보 관리] 메뉴를 통해 자신의
                    개인정보를 언제든지 열람하고 수정할 수 있습니다.
                  </p>
                </div>

                <div className="bg-background border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    이용자 변경 시 보호
                  </h3>
                  <p>
                    기기 변경이나 재설치 시 이전 사용자의 정보가 노출되지 않도록
                    명확한 로그아웃 기능을 제공하며, 캐시 데이터 삭제 방법을
                    안내합니다.
                  </p>
                </div>

                <div className="bg-background border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    공개 범위 설정
                  </h3>
                  <p>
                    서비스 내 게시물의 기본 설정은 최소한의 정보만 노출되도록
                    구성되어 있으며, 이용자는 개별 설정을 통해 공개 범위를
                    확장할 수 있습니다.
                  </p>
                </div>

                <div className="bg-background border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    저장 최소화 및 암호화
                  </h3>
                  <p>
                    민감한 정보는 서버에 안전하게 저장하며, 기기에 임시 저장되는
                    데이터는 최신 암호화 알고리즘을 적용하여 보호합니다.
                  </p>
                </div>

                <div className="bg-background border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    앱 삭제 시 처리
                  </h3>
                  <p>
                    앱 삭제 시 기기 내 저장된 임시 정보는 자동 삭제되나, 서버에
                    저장된 회원 정보는 별도의 '회원 탈퇴' 절차를 거쳐야
                    파기됩니다. 이용자는 언제든 '잊힐 권리'를 행사하여 가입
                    데이터의 삭제를 요청할 수 있습니다.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-orange-400 rounded-full"></span>
              제3조 (기기 접근 권한에 대한 고지)
            </h2>
            <div className="space-y-4 text-foreground/80">
              <p>
                회사는 앱 기능 수행을 위해 카메라, 마이크, 사진첩 등의 접근
                권한을 사용합니다.
              </p>

              <div className="space-y-3">
                <div className="bg-background border border-border rounded-lg p-4">
                  <h3 className="font-semibold text-foreground mb-2">
                    선택적 권한
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>카메라: 사진 촬영</li>
                    <li>마이크: 음성 녹음</li>
                    <li>사진첩: 이미지 업로드</li>
                  </ul>
                </div>

                <p className="text-sm">
                  이용자는 최초 접근 시점에 동의 여부를 선택할 수 있으며, 기기
                  설정에서 언제든지 권한을 철회할 수 있습니다. 동의 거부 시에도
                  해당 기능 외의 기본 서비스 이용은 가능합니다.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-orange-400 rounded-full"></span>
              제4조 (가명정보 처리 및 신고 분석)
            </h2>
            <div className="space-y-4 text-foreground/80">
              <p>
                회사는 개인정보 보호법 제28조의2에 따라 수집된 성별, 연령 정보를
                가명처리하여 통계적으로 활용할 수 있습니다. 이는 개인 식별이
                불가능하도록 범주화하여 관리하며, 접근 권한을 엄격히 제한합니다.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-orange-400 rounded-full"></span>
              제5조 (보유 및 파기)
            </h2>
            <div className="space-y-4 text-foreground/80">
              <p>
                일반 데이터는 탈퇴 신청 후 5일 이내에 파기합니다. 단, 접속
                로그는 통신비밀보호법에 따라 3개월간 보존합니다.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-orange-400 rounded-full"></span>
              제6조 (개인정보 처리 위탁)
            </h2>
            <div className="space-y-4 text-foreground/80">
              <p>서비스 품질을 위해 다음과 같이 위탁합니다.</p>

              <div className="bg-background border border-border rounded-lg p-4 space-y-2">
                <div>
                  <h3 className="font-semibold text-foreground">서버 관리</h3>
                  <p className="text-sm">네이버 클라우드 (NCP)</p>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">메시지 발송</h3>
                  <p className="text-sm">채널톡, 솔라피 (Solapi)</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-orange-400 rounded-full"></span>
              제7조 (마케팅 정보 수신 동의)
            </h2>
            <div className="space-y-4 text-foreground/80">
              <p>
                이용자의 선택적 동의를 전제로 이벤트 정보를 전송하며,
                야간(21:00~08:00) 발송은 제한됩니다.
              </p>

              <div className="bg-background border border-border rounded-lg p-4 space-y-2">
                <h3 className="font-semibold text-foreground">동의 철회</h3>
                <p className="text-sm">
                  이용자는 언제든지 [설정 &gt; 알림] 메뉴를 통해 마케팅 정보
                  수신 여부를 변경할 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* Section 8 */}
          <section>
            <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
              <span className="w-1 h-8 bg-orange-400 rounded-full"></span>
              제8조 (책임자 및 고충 처리)
            </h2>
            <div className="space-y-4 text-foreground/80">
              <div className="bg-accent/10 border border-accent/20 rounded-lg p-4 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    개인정보 보호 책임자
                  </h3>
                  <p className="text-sm">이종무</p>
                  <p className="text-sm">전화: 0507-1314-6802</p>
                  <p className="text-sm"></p>
                </div>
              </div>

              <p className="text-sm">
                이용자는 개인정보 침해에 관한 신고 또는 상담이 필요한 경우
                개인정보 보호 책임자에게 연락할 수 있습니다. 회사는 이용자의
                문의에 대해 신속하고 성실하게 처리하겠습니다.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                <h3 className="font-semibold text-foreground mb-2">
                  서비스 관리 업체
                </h3>
                <p className="text-sm text-foreground/80">
                  본 서비스 'Pawever'는 습관적마케팅에 의해 관리되고 있습니다.
                  서비스 이용에 대한 모든 문의 및 요청은 아래의 연락처로
                  연락주시기 바랍니다.
                </p>
                <p className="text-sm text-foreground/80 mt-2">
                  회사명: 습관적마케팅
                </p>
                <p className="text-sm text-foreground/80">대표: 이종무</p>
                <p className="text-sm text-foreground/80">
                  전화: 0507-1314-6802
                </p>
              </div>
            </div>
          </section>

          {/* Footer Links */}
          <section className="pt-8 border-t border-border">
            <div className="flex flex-wrap gap-4 text-sm">
              <a
                href="/"
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                홈으로
              </a>
              <span className="text-border">|</span>
              <a
                href="/terms"
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                이용약관
              </a>
              <span className="text-border">|</span>
              <a
                href="/contact"
                className="text-orange-500 hover:text-orange-600 font-medium"
              >
                문의하기
              </a>
            </div>
          </section>
        </div>
      </main>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-orange-400 hover:bg-orange-500 text-white rounded-full p-3 shadow-lg transition-all duration-300 animate-fade-in"
          aria-label="맨 위로 이동"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
