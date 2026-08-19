import { ArrowLeft, Mail, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function AccountDeletion() {
  const handleEmailClick = () => {
    const subject = encodeURIComponent("Pawever 계정·데이터 삭제 요청");
    const body = encodeURIComponent(
      `안녕하세요,\n\n저는 PAW-EVER 서비스에서 계정·데이터 삭제를 요청합니다.\n\n[아래 정보를 입력해주세요]\n- 가입 이메일 또는 소셜 로그인 종류(카카오/네이버/애플): \n- 요청 대상(앱 계정 / 굿즈 신청 정보 / 2차 안내 이메일): \n- 반려동물 이름(앱 계정인 경우): \n\n감사합니다.`
    );
    window.location.href = `mailto:pawever01@gmail.com?subject=${subject}&body=${body}`;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border">
        <div className="container max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link href="/">
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-xl font-bold text-foreground">
            데이터 삭제 요청 안내
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Introduction */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-6 space-y-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div className="space-y-2">
                <h2 className="font-semibold text-foreground">
                  앱·웹·제품 데이터 삭제 안내
                </h2>
                <p className="text-foreground/70 text-sm">
                  PAW-EVER 앱 계정, 웹사이트 요청 및 굿즈 신청 정보는 서비스
                  유형별 보유 기준에 따라 삭제 또는 보관됩니다.
                </p>
                <p className="text-foreground/70 text-sm">
                  익명 설문은 개인을 식별하지 않아 개별 응답자를 특정하기
                  어렵습니다.
                </p>
              </div>
            </div>
          </div>

          {/* App Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              스토어 등록정보
            </h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <div>
                <p className="text-sm text-foreground/60">앱 이름</p>
                <p className="font-semibold text-foreground">
                  Pawever (포에버)
                </p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">개발자</p>
                <p className="font-semibold text-foreground">습관적마케팅</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">서비스</p>
                <p className="font-semibold text-foreground">
                  반려동물 케어·기록·추모 및 굿즈 서비스
                </p>
              </div>
            </div>
          </div>

          {/* Deletion Steps */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              앱 계정 삭제 단계
            </h2>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent text-white font-semibold text-sm">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    앱에서 탈퇴 또는 이메일 요청
                  </h3>
                  <p className="text-foreground/70 text-sm">
                    앱 내 탈퇴 기능을 이용하거나 아래의 "계정 삭제 요청 이메일
                    보내기" 버튼을 클릭합니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent text-white font-semibold text-sm">
                    2
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    확인 정보 입력
                  </h3>
                  <p className="text-foreground/70 text-sm">
                    가입 이메일 또는 소셜 로그인 정보와 본인 확인에 필요한 최소
                    정보를 입력합니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent text-white font-semibold text-sm">
                    3
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    요청 발송
                  </h3>
                  <p className="text-foreground/70 text-sm">
                    작성한 요청을 pawever01@gmail.com으로 발송합니다.
                  </p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent text-white font-semibold text-sm">
                    4
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    처리 및 확인
                  </h3>
                  <p className="text-foreground/70 text-sm">
                    회사가 요청을 확인한 후 처리 결과를 이메일로 안내합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Handling */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              서비스 유형별 삭제·보관 기준
            </h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">
                  탈퇴 시 삭제되는 앱 데이터
                </h3>
                <ul className="space-y-2 text-foreground/70 text-sm">
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>앱 계정 식별정보·프로필 사진·푸시 토큰</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>반려동물 개인 기록·미션·사진</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>음성 원본 및 음성 기록</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>이별 준비·응급 안내 등 개인 설정 정보</span>
                  </li>
                </ul>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-foreground mb-2">
                  보유 기간 후 파기되는 웹·제품 데이터
                </h3>
                <ul className="space-y-2 text-foreground/70 text-sm">
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>웹 접속 로그: 보안·오류 대응 목적 14일</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>굿즈 배송 정보·사진: 배송 완료 후 90일</span>
                  </li>
                </ul>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-foreground mb-2">
                  커뮤니티 콘텐츠의 제한적 보관
                </h3>
                <p className="text-foreground/70 text-sm">
                  추모 댓글·후기 등 상호작용 콘텐츠는 작성자 식별정보를 제거한
                  뒤 서비스 종료 시까지 보관할 수 있습니다. 익명 설문·사연은
                  수집 후 2년 보관합니다.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">
              문의 및 삭제 요청
            </h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <p className="text-foreground/70 text-sm">
                앱 계정 삭제, 웹사이트 개인정보 요청 또는 굿즈 정보 삭제 문의는
                아래 이메일로 접수해 주세요.
              </p>
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-accent" />
                <a
                  href="mailto:pawever01@gmail.com"
                  className="font-semibold text-accent hover:underline"
                >
                  pawever01@gmail.com
                </a>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex flex-col gap-3 pt-6">
            <button
              onClick={handleEmailClick}
              className="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              계정·데이터 삭제 요청 이메일 보내기
            </button>
            <Link href="/">
              <button className="w-full border border-border hover:bg-accent/5 text-foreground font-semibold py-3 px-6 rounded-lg transition-colors">
                돌아가기
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
