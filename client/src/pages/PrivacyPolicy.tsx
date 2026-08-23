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

const COLLECTION_ROWS = [
  {
    category: "앱",
    items: "소셜 계정·프로필·반려동물 기록",
    purpose: "회원·기록 기능 제공",
    retention: "탈퇴 시까지",
  },
  {
    category: "웹",
    items: "익명 설문·사연·웹 방문 기술정보",
    purpose: "서비스 개선·유입 분석",
    retention: "설문 2년 / 로그 14일",
  },
  {
    category: "제품",
    items: "배송 정보·굿즈 사진",
    purpose: "제작·발송·문의 대응",
    retention: "배송 완료 후 90일",
  },
  {
    category: "선택",
    items: "공개 동의 사연·사진, 안내 이메일",
    purpose: "웹·SNS 공개, 2차 안내",
    retention: "2년 또는 철회 / 1년",
  },
  {
    category: "자동",
    items: "IP·브라우저 정보·웹 방문 이벤트",
    purpose: "보안·페이지 전송·GA4 분석",
    retention: "로그 14일 / GA4 최대 14개월",
  },
];

const RIGHTS_ITEMS = [
  {
    title: "열람 및 수정",
    body: "앱 이용자는 [설정 > 내 정보 관리]에서 개인정보를 열람·수정할 수 있습니다.",
  },
  {
    title: "이용자 변경 시 보호",
    body: "기기 변경·재설치 시 이전 이용자 정보가 노출되지 않도록 로그아웃과 캐시 삭제 안내를 제공합니다.",
  },
  {
    title: "공개 범위 설정",
    body: "사연·사진의 웹·SNS 공개와 후기의 홍보 활용은 서비스 개선 목적과 분리한 별도 선택 동의로 관리합니다.",
  },
  {
    title: "저장 최소화 및 암호화",
    body: "이름·휴대전화번호·이메일은 암호화해 저장하고, 개인정보 접근 권한을 필요한 담당자로 제한합니다.",
  },
  {
    title: "앱 삭제 시 처리",
    body: "앱 삭제만으로 서버 정보가 삭제되지는 않습니다. 앱 내 탈퇴 또는 이메일 요청으로 삭제를 신청할 수 있습니다.",
  },
];

const PERMISSION_ITEMS = [
  "카메라·사진첩: 사진 촬영 및 업로드",
  "마이크: 음성 기록",
  "알림·위치: 서비스 알림, 주변 장례업체 검색",
];

/**
 * 여기 없는 사업자에게 개인정보를 넘기면 고지 없는 위탁이 된다.
 *
 * 굿즈 결제와 접수 알림이 붙으면서 두 줄이 늘었다. 특히 텔레그램은 이름과
 * 연락처가 국외 서버로 나가는 경로라, 붙이기 전에 여기부터 적었다.
 * 보내는 항목을 늘리려면 이 줄도 같이 봐야 한다.
 */
const PROCESSOR_ROWS = [
  {
    category: "인프라·알림",
    detail: "AWS, Firebase, Cloudflare (서버·알림·웹 전송·보안)",
  },
  {
    category: "결제대행",
    detail:
      "포트원, KG이니시스, 토스페이먼츠 (굿즈 결제 승인·취소·정산). 카드번호 등 결제수단 정보는 결제대행사가 직접 처리하며 포에버는 보관하지 않습니다.",
  },
  {
    category: "주문 접수 알림 (국외 이전)",
    detail:
      "Telegram · 이전 항목: 주문번호, 신청자 이름·연락처, 반려견 이름, 굿즈·결제 금액, 유입경로 · 이전 목적: 굿즈 신청 접수 시 담당자 즉시 확인 · 이전 시점과 방법: 접수 완료 시 네트워크를 통해 자동 전송 · 보유 기간: 담당자 확인 후 삭제 시까지",
  },
  {
    category: "웹 분석·광고",
    detail: "Google Analytics 4(GTM), Meta Pixel(광고 집행 시)",
  },
];

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-2xl font-bold text-foreground mb-4 flex items-center gap-2">
      {/* 피그마가 #FF8904 로 지정했고 Tailwind orange-400 이 정확히 그
          값이다. 이 페이지에서 --primary(#FF9F43)가 아닌 색을 쓰는
          유일한 곳이라 일부러 남긴다. */}
      <span className="w-1 h-8 bg-orange-400 rounded-full"></span>
      {children}
    </h2>
  );
}

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
              <h1 className="text-3xl font-bold text-foreground">PAW-EVER</h1>
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
              습관적마케팅(이하 "회사")은 PAW-EVER 앱, 웹사이트 및 굿즈
              서비스에서 이용자의 개인정보를 보호하고 고충을 신속히 처리하기
              위해 본 방침을 공개합니다.
            </p>
          </section>

          {/* 제1조 */}
          <section>
            <SectionHeading>
              제1조 (수집 정보·이용 목적·보유 기간)
            </SectionHeading>
            <div className="space-y-4 text-foreground/80">
              <p>서비스 유형별로 필요한 최소한의 정보를 수집·이용합니다.</p>

              <div className="bg-background border border-border rounded-lg overflow-x-auto">
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
                    {COLLECTION_ROWS.map(row => (
                      <tr
                        key={row.category}
                        className="border-b border-border last:border-b-0 hover:bg-accent/5"
                      >
                        <td className="px-4 py-3 font-medium text-primary whitespace-nowrap">
                          {row.category}
                        </td>
                        <td className="px-4 py-3">{row.items}</td>
                        <td className="px-4 py-3">{row.purpose}</td>
                        <td className="px-4 py-3">{row.retention}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* 제2조 */}
          <section>
            <SectionHeading>제2조 (정보주체의 권리와 통제)</SectionHeading>
            <div className="space-y-4 text-foreground/80">
              <p>
                이용자는 서비스 유형별 개인정보의 열람·정정·삭제·동의 철회를
                요청할 수 있습니다.
              </p>

              <div className="space-y-3">
                {RIGHTS_ITEMS.map(item => (
                  <div
                    key={item.title}
                    className="bg-background border border-border rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-foreground mb-1">
                      {item.title}
                    </h3>
                    <p className="text-sm">{item.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 제3조 */}
          <section>
            <SectionHeading>제3조 (앱 접근 권한과 위치 정보)</SectionHeading>
            <div className="space-y-4 text-foreground/80">
              <p>
                앱 기능을 위해 카메라·사진첩·마이크·알림·위치 권한을 이용자의
                선택 동의 아래 사용합니다.
              </p>

              <div className="bg-background border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  선택적 권한
                </h3>
                <ul className="space-y-2 text-sm">
                  {PERMISSION_ITEMS.map(item => (
                    <li key={item} className="flex gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <p>
                위치는 주변 장례업체 검색에만 실시간 사용하며 DB에 저장하거나
                이동을 추적하지 않습니다.
              </p>
              <p>
                접속 로그에는 보안·오류 대응을 위한 기술 정보만 14일 보관하며,
                이용자의 외부 URL 정보를 수집·활용하지 않습니다.
              </p>
            </div>
          </section>

          {/* 제4조 */}
          <section>
            <SectionHeading>
              제4조 (연구·서비스 개선 및 공개 동의)
            </SectionHeading>
            <div className="space-y-4 text-foreground/80">
              <p>
                설문은 서비스 개선·내부 분석에 사용합니다. 개인을 식별할 수 없는
                통계 결과는 사업 고도화와 지원사업 신청·수행·성과보고에 활용할
                수 있습니다. 사연·사진의 웹·SNS 공개는 별도 동의한 경우에만
                진행합니다.
              </p>
            </div>
          </section>

          {/* 제5조 */}
          <section>
            <SectionHeading>제5조 (보유 및 파기)</SectionHeading>
            <div className="space-y-4 text-foreground/80">
              <p>
                앱 정보는 탈퇴 시, 제품 배송 정보·사진은 배송 완료 후 90일, 익명
                설문·사연은 수집 후 2년 보관합니다. 접속 로그는 14일 보관합니다.
              </p>
            </div>
          </section>

          {/* 제6조 */}
          <section>
            <SectionHeading>제6조 (처리 위탁 및 국외 처리)</SectionHeading>
            <div className="space-y-4 text-foreground/80">
              <p>서비스 제공에 필요한 범위에서 다음 사업자를 이용합니다.</p>

              <div className="space-y-3">
                {PROCESSOR_ROWS.map(row => (
                  <div
                    key={row.category}
                    className="bg-background border border-border rounded-lg p-4"
                  >
                    <h3 className="font-semibold text-foreground mb-1">
                      {row.category}
                    </h3>
                    <p className="text-sm">{row.detail}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 제7조 */}
          <section>
            <SectionHeading>제7조 (서비스 알림과 광고성 정보)</SectionHeading>
            <div className="space-y-4 text-foreground/80">
              <p>
                서비스 알림과 광고성 정보 수신 동의는 분리합니다. 광고성 정보는
                별도 동의한 이용자에게만 발송합니다.
              </p>

              <div className="bg-background border border-border rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-1">
                  동의 철회
                </h3>
                <p className="text-sm">
                  이용자는 앱 설정에서 언제든 광고성 정보 수신 동의를 철회할 수
                  있으며, 이메일에는 수신 거부 방법을 제공합니다.
                </p>
              </div>
            </div>
          </section>

          {/* 제8조 */}
          <section>
            <SectionHeading>제8조 (책임자 및 고충 처리)</SectionHeading>
            <div className="space-y-4 text-foreground/80">
              <div className="bg-accent/5 border border-accent/20 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  개인정보 보호 책임자
                </h3>
                <p className="text-sm">이종무 / 대표·개인정보 보호책임자</p>
                <p className="text-sm">0507-1314-6802 · pawever01@gmail.com</p>
              </div>

              <p className="text-sm">
                개인정보 열람·정정·삭제·처리정지 및 고충처리는 개인정보
                보호책임자에게 요청할 수 있습니다.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  서비스 관리 업체
                </h3>
                <p className="text-sm text-foreground/80">
                  PAW-EVER는 습관적마케팅이 운영합니다. 앱·웹·굿즈 서비스 관련
                  문의와 요청은 아래 연락처로 접수해 주세요.
                </p>
                <p className="text-sm text-foreground/80 mt-2">
                  회사명: 습관적마케팅
                </p>
                <p className="text-sm text-foreground/80">대표: 이종무</p>
                <p className="text-sm text-foreground/80">
                  이메일: pawever01@gmail.com
                </p>
              </div>
            </div>
          </section>

          {/* Footer Links */}
          <section className="pt-8 border-t border-border">
            <div className="flex flex-wrap gap-4 text-sm">
              <a
                href="/"
                className="text-primary hover:text-primary/80 font-medium"
              >
                홈으로
              </a>
              <span className="text-border">|</span>
              <a
                href="/terms"
                className="text-primary hover:text-primary/80 font-medium"
              >
                이용약관
              </a>
              <span className="text-border">|</span>
              <a
                href="/contact"
                className="text-primary hover:text-primary/80 font-medium"
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
          className="fixed bottom-8 right-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full p-3 shadow-lg transition-all duration-300 animate-fade-in"
          aria-label="맨 위로 이동"
        >
          <ChevronUp className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
