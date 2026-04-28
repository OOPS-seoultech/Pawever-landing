import { ArrowLeft, Mail, AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function AccountDeletion() {
  const handleEmailClick = () => {
    const subject = encodeURIComponent("Pawever 계정 삭제 요청");
    const body = encodeURIComponent(
      `안녕하세요,\n\n저는 Pawever 서비스에서 계정 삭제를 요청합니다.\n\n[아래 정보를 입력해주세요]\n- 가입 이메일: \n- 반려동물 이름: \n- 삭제 사유: \n\n감사합니다.`
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
          <h1 className="text-xl font-bold text-foreground">계정 삭제 요청</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <div className="space-y-8">
          {/* Introduction */}
          <div className="bg-accent/10 border border-accent/20 rounded-lg p-6 space-y-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="font-semibold text-foreground mb-2">계정 삭제 안내</h2>
                <p className="text-foreground/70 text-sm">
                  Pawever 계정을 삭제하시려면 아래의 단계를 따라주세요. 계정 삭제 후 모든 데이터는 회사 정책에 따라 처리됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* App Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">스토어 등록정보</h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <div>
                <p className="text-sm text-foreground/60">앱 이름</p>
                <p className="font-semibold text-foreground">Pawever (포에버)</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">개발자</p>
                <p className="font-semibold text-foreground">습관적마케팅</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">서비스</p>
                <p className="font-semibold text-foreground">반려동물 추모 및 케어 서비스</p>
              </div>
            </div>
          </div>

          {/* Deletion Steps */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">계정 삭제 단계</h2>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-accent text-white font-semibold text-sm">
                    1
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">이메일 작성</h3>
                  <p className="text-foreground/70 text-sm">
                    아래의 "계정 삭제 요청 이메일 보내기" 버튼을 클릭하여 삭제 요청 양식을 작성합니다.
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
                  <h3 className="font-semibold text-foreground mb-1">필수 정보 입력</h3>
                  <p className="text-foreground/70 text-sm">
                    가입 이메일, 반려동물 이름, 삭제 사유 등 필수 정보를 입력합니다.
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
                  <h3 className="font-semibold text-foreground mb-1">이메일 발송</h3>
                  <p className="text-foreground/70 text-sm">
                    작성한 이메일을 pawever01@gmail.com으로 발송합니다.
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
                  <h3 className="font-semibold text-foreground mb-1">처리 및 확인</h3>
                  <p className="text-foreground/70 text-sm">
                    회사에서 요청을 확인한 후 계정 삭제를 처리하고 확인 이메일을 발송합니다.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Data Handling */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">삭제되거나 보관되는 데이터</h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-2">즉시 삭제되는 데이터</h3>
                <ul className="space-y-2 text-foreground/70 text-sm">
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>회원 프로필 정보 (이름, 이메일, 프로필 사진 등)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>반려동물 정보 및 기록</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>음성 녹음 및 추모 메시지</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>사진 및 개인 기록</span>
                  </li>
                </ul>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-foreground mb-2">법령에 따라 보관되는 데이터</h3>
                <ul className="space-y-2 text-foreground/70 text-sm">
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>접속 로그 및 서비스 이용 기록: 3개월 (통신비밀보호법)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-accent">•</span>
                    <span>결제 및 청약철회 관련 기록: 5년 (전자상거래법)</span>
                  </li>
                </ul>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="font-semibold text-foreground mb-2">추가 보관 기간</h3>
                <p className="text-foreground/70 text-sm">
                  일반 데이터는 탈퇴 신청 후 5일 이내에 재생 불가능한 방법으로 파기됩니다. 법령에 따른 예외 보관 데이터는 해당 법령에서 정한 기간 동안 보관됩니다.
                </p>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">문의 및 요청</h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-4">
              <p className="text-foreground/70 text-sm">
                계정 삭제 요청이나 추가 문의사항이 있으신 경우, 아래의 이메일로 연락주세요.
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
              계정 삭제 요청 이메일 보내기
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
