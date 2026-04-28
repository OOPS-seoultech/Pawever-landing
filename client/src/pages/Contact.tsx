import { ArrowLeft, AlertCircle, Trash2, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Contact() {
  const handleEmailClick = () => {
    const subject = encodeURIComponent("Pawever 문의");
    const body = encodeURIComponent(
      `안녕하세요,\n\nPawever 서비스에 대해 문의드립니다.\n\n[아래 정보를 입력해주세요]\n- 이름: \n- 이메일: \n- 문의 내용: \n\n감사합니다.`
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
          <h1 className="text-xl font-bold text-foreground">문의하기</h1>
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
                <h2 className="font-semibold text-foreground mb-2">문의 안내</h2>
                <p className="text-foreground/70 text-sm">
                  Pawever 서비스에 대한 문의사항이 있으신가요? 아래의 단계를 따라 담당자에게 문의하실 수 있습니다.
                </p>
              </div>
            </div>
          </div>

          {/* Google Play Data Deletion Request (Accordion) */}
          <div className="space-y-4">
            <Accordion type="single" collapsible defaultValue="data-deletion" className="w-full">
              <AccordionItem value="data-deletion" className="border border-border rounded-lg px-6 bg-card">
                <AccordionTrigger className="hover:no-underline py-6">
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-destructive" />
                    <span className="text-lg font-bold text-foreground">데이터 삭제 요청 안내</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 pb-6">
                  <p className="text-sm text-foreground/70">
                    Google Play 데이터 보안 정책에 따라, 사용자는 언제든지 자신의 데이터 삭제를 요청할 수 있습니다. 
                    아래의 절차를 통해 안전하게 데이터를 삭제하실 수 있습니다.
                  </p>
                  
                  <div className="bg-accent/5 rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold text-sm text-foreground">데이터 삭제 절차</h4>
                    <ol className="text-sm text-foreground/70 space-y-2 list-decimal list-inside">
                      <li>아래의 <span className="font-medium text-foreground">'데이터 삭제 요청 페이지'</span> 링크를 클릭합니다.</li>
                      <li>안내된 양식에 따라 계정 정보 및 삭제 사유를 작성합니다.</li>
                      <li>작성된 내용을 이메일로 발송합니다.</li>
                      <li>담당자가 확인 후 5일 이내에 데이터를 영구 삭제하고 결과를 회신드립니다.</li>
                    </ol>
                  </div>

                  <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
                    <div>
                      <p className="font-semibold text-foreground">데이터 삭제 요청 페이지</p>
                      <p className="text-xs text-foreground/50 mt-1">상세한 삭제 절차와 양식을 확인하실 수 있습니다.</p>
                    </div>
                    <Link href="/account-deletion">
                      <Button variant="outline" size="sm" className="gap-2">
                        이동하기
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* App Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">서비스 정보</h2>
            <div className="bg-card border border-border rounded-lg p-6 space-y-3">
              <div>
                <p className="text-sm text-foreground/60">앱 이름</p>
                <p className="font-semibold text-foreground">Pawever (포에버)</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">개발자</p>
                <p className="font-semibold text-foreground">습관적마케팅</p>
                <p className="text-xs text-foreground/50 mt-1">담당자: 이종무</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">서비스</p>
                <p className="font-semibold text-foreground">반려동물 추모 및 케어 서비스</p>
              </div>
            </div>
          </div>

          {/* Contact Steps */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">문의 단계</h2>
            
            <div className="space-y-3">
              <div className="bg-card border border-border rounded-lg p-6 space-y-2">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">이메일 작성</h3>
                    <p className="text-sm text-foreground/70 mt-1">
                      아래의 "이메일로 문의" 버튼을 클릭하여 문의 양식을 작성합니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-2">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">필수 정보 입력</h3>
                    <p className="text-sm text-foreground/70 mt-1">
                      이름, 이메일, 문의 내용 등 필수 정보를 입력합니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-2">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">이메일 발송</h3>
                    <p className="text-sm text-foreground/70 mt-1">
                      작성한 이메일을 pawever01@gmail.com으로 발송합니다.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-lg p-6 space-y-2">
                <div className="flex items-start gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex-shrink-0">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">처리 및 확인</h3>
                    <p className="text-sm text-foreground/70 mt-1">
                      담당자가 요청을 확인한 후 최대한 빠르게 답변을 드립니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-foreground">문의 정보</h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 space-y-3">
              <div>
                <p className="text-sm text-foreground/60">문의 이메일</p>
                <p className="font-semibold text-foreground">pawever01@gmail.com</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">담당자</p>
                <p className="font-semibold text-foreground">이종무</p>
              </div>
              <div>
                <p className="text-sm text-foreground/60">연락처</p>
                <p className="font-semibold text-foreground">0507-1314-6802</p>
              </div>
            </div>
          </div>

          {/* CTA Button */}
          <div className="flex gap-4 pt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => window.history.back()}
            >
              돌아가기
            </Button>
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={handleEmailClick}
            >
              이메일로 문의
            </Button>
          </div>
        </div>
      </div>

      {/* Scroll to Top Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
          aria-label="맨 위로 이동"
        >
          <ArrowLeft className="w-6 h-6 rotate-90" />
        </button>
      </div>
    </div>
  );
}
