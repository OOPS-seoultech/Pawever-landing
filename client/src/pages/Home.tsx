import { Button } from "@/components/ui/button";
import { Heart, Mic, BookOpen, Package, MessageCircle, X } from "lucide-react";
import { useState, useRef } from "react";

/**
 * Pawever Landing Page
 * 
 * 디자인 철학: 따뜻한 미니멀리즘
 * - 오렌지 포인트 컬러로 기억의 온기 표현
 * - 디터 람스의 절제된 미학으로 슬픔을 배려
 * - 충분한 여백으로 사용자의 감정 존중
 * - 부드러운 애니메이션으로 강압 없는 경험
 */

export default function Home() {
  const [showEmailModal, setShowEmailModal] = useState(false);
  const appPreviewRef = useRef<HTMLDivElement>(null);

  const scrollToAppPreview = () => {
    appPreviewRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleEmailClick = () => {
    window.location.href = "mailto:pawever01@gmail.com";
    setShowEmailModal(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section
        className="relative w-full min-h-screen flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url('https://private-us-east-1.manuscdn.com/sessionFile/v05qfpJiY2BnS8goGxJSua/sandbox/nwNYvLYHDRTIKMzOGs8wx3-img-1_1771847928000_na1fn_Zm9yZXZlci1oZXJvLWJn.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdjA1cWZwSmlZMkJuUzhnb0d4SlN1YS9zYW5kYm94L253Tll2TFlIRFJUSUtNek9Hczh3eDMtaW1nLTFfMTc3MTg0NzkyODAwMF9uYTFmbl9abTl2WlhabGNpMW9aWEp2TFdKbi5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=CPcIQ5ZdVOk2JzzLLjuT4uUfYNbQE9C9WaQ69vAvgvEC5bCQA-S6JrR95ZFbC43K6b8zPFGXrTnTVtQH0s879SuItPcz-SceRcmkpuQXhTNFypWZlrkUTtRZiYK1EQs-MpcSWEJuUuPuVJe8AC0pQRWBVO1ujaSvYPFSjlesxWuP7qgpzWVA58nmWn1zX348sySV6sFqG5D0ncPTto10wCUHmPxOJzlG-76RlmX4VPoFKE20ba~3TvGHBThFM7Bts6ngUUVqs-CbCCMUK~rcYnkr8NUeExzjiBrUW4n3HshRq~HFR~B7fdvALPJof0~O-Hk0jQKl3~sgGPOF9FOg7Q__')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/20" />

        <div className="relative z-10 container max-w-4xl mx-auto px-4 py-20 text-center">
          <div className="mb-6 flex justify-center">
            <p className="text-lg md:text-xl text-foreground/70 font-medium animate-fade-in">
              우리 아이를 위한 가장 따뜻한 마지막 여정
            </p>
          </div>

          <div className="mb-8 flex justify-center">
            <img
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663308210539/LVDAepFghBqoplrU.png"
              alt="Pawever Logo"
              className="w-32 h-32 animate-fade-in"
            />
          </div>

          <div className="mb-8 flex justify-center hidden">
            <img
              src="https://private-us-east-1.manuscdn.com/sessionFile/v05qfpJiY2BnS8goGxJSua/sandbox/nwNYvLYHDRTIKMzOGs8wx3_1771847932647_na1fn_Zm9yZXZlci1wYXctaWxsdXN0cmF0aW9u.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdjA1cWZwSmlZMkJuUzhnb0d4SlN1YS9zYW5kYm94L253Tll2TFlIRFJUSUtNek9Hczh3eDNfMTc3MTg0NzkzMjY0N19uYTFmbl9abTl5WlhabGNpMXdZWGN0YVd4c2RYTjBjbUYwYVc5dS5wbmc~eC1vc3MtcHJvY2Vzcz1pbWFnZS9yZXNpemUsd18xOTIwLGhfMTkyMC9mb3JtYXQsd2VicC9xdWFsaXR5LHFfODAiLCJDb25kaXRpb24iOnsiRGF0ZUxlc3NUaGFuIjp7IkFXUzpFcG9jaFRpbWUiOjE3OTg3NjE2MDB9fX1dfQ__&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=UQ319mlweN6V61RdyfBzahSa~2y7FLALhtoQwlFPEQD8zxBqcQLVhIlmejbuY9yVih7rtbY164ZG728U63tpxqUBqYjMlOZXUIaXHKWavjAIjBsi5v4lh7b4IMKuTQR~zImHFqQDgagM1PvCTDaFhYyGtuMjtd1aXklkzEE4nHh5PoG43~CDCS6FfEVzhixeXQtfM9NATQ1sV0El1fJWANujcCgFSW6h6oBk2FqtQQ2BGXckUODF3cMfsicQI8L~pjnhXJUs1K5DPJ-JOBEG5dbYSpb6DwdOwvOwbE5rceIaGD9pwDMu6L6jdLQOBWhWZRYQsVH5D31o8vo9TonIsg__"
              alt="Pawever Paw"
              className="w-24 h-24 animate-fade-in"
            />
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in">
            함께하는 시간에 집중하고,
            <br />
            <span className="text-primary">소중했던 시간을 기억해요</span>
          </h1>

          <p className="text-lg md:text-xl text-foreground/70 mb-12 max-w-2xl mx-auto leading-relaxed animate-fade-in">
            반려친구와의 이별을 정성스러운 배웅의 과정으로 전환합니다.
            <br />
            이별 전에는 함께하는 순간을, 이별 후에는 건강한 애도를 돕습니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105"
              disabled
            >
              출시 예정
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-2 border-primary text-primary hover:bg-primary/5 font-semibold px-8 py-6 text-lg rounded-xl transition-all duration-300"
              onClick={scrollToAppPreview}
            >
              자세히 알아보기
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="w-full py-20 bg-secondary/30">
        <div className="container max-w-5xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Pawever의 핵심 기능
            </h2>
            <p className="text-lg text-foreground/60">
              반려친구와의 이별 전후를 함께하는 네 가지 서비스
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Feature 1: 발자국 남기기 */}
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Mic className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">발자국 남기기</h3>
              </div>
              <p className="text-foreground/70 leading-relaxed">
                아이의 목소리나 숨소리, 혹은 아이에게 전하고 싶은 목소리 편지를 기록하여 영원히 간직하는 기능입니다.
              </p>
            </div>

            {/* Feature 2: 맞춤형 배웅 가이드 */}
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">맞춤형 배웅 가이드</h3>
              </div>
              <p className="text-foreground/70 leading-relaxed">
                이별 직후 당황한 보호자를 위해 장례 방법, 예약, 주의사항 등을 빠르게 안내하여 심리적 안정을 돕습니다.
              </p>
            </div>

            {/* Feature 3: 가정용 추모 키트 */}
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Package className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">가정용 추모 키트</h3>
              </div>
              <p className="text-foreground/70 leading-relaxed">
                집에서 아이를 추모하고 수습할 수 있는 임시 관과 장례 용품을 제공하여 직접적인 이별 준비를 지원합니다.
              </p>
            </div>

            {/* Feature 4: 감정 케어 다이어리 */}
            <div className="bg-white rounded-2xl p-8 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Heart className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground">감정 케어 다이어리</h3>
              </div>
              <p className="text-foreground/70 leading-relaxed">
                슬픔의 단계별로 보호자의 마음을 보살피고, 아이와의 추억을 차곡차곡 정리할 수 있는 인터페이스를 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* App Preview Section */}
      <section ref={appPreviewRef} className="w-full py-20 bg-background">
        <div className="container max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Pawever 앱 미리보기
            </h2>
            <p className="text-lg text-foreground/60">
              Pawever 앱의 주요 화면을 미리 확인해보세요
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Screen 1: 반려동물 선택 */}
            <div className="flex flex-col items-center animate-fade-in">
              <div className="relative mb-6 rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 bg-white">
                <img
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663308210539/iauaTLArMwKDYLVw.png"
                  alt="Pawever 반려동물 선택 화면"
                  className="w-full h-auto max-w-xs"
                />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 text-center">
                반려동물 선택
              </h3>
              <p className="text-foreground/60 text-center text-sm">
                반려동물의 종류를 선택하고 기본 정보를 입력합니다.
              </p>
            </div>

            {/* Screen 2: 별자리 추모관 */}
            <div className="flex flex-col items-center animate-fade-in">
              <div className="relative mb-6 rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 bg-white">
                <img
                  src="public/memorial.png"
                  alt="Pawever 별자리 추모관 화면"
                  className="w-full h-auto max-w-xs"
                />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 text-center">
                별자리 추모관
              </h3>
              <p className="text-foreground/60 text-center text-sm">
                반려친구의 사진과 추모 메시지를 공유하며 함께 기억합니다.
              </p>
            </div>

            {/* Screen 3: 장례업체 선택 */}
            <div className="flex flex-col items-center animate-fade-in">
              <div className="relative mb-6 rounded-3xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-105 bg-white">
                <img
                  src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663308210539/VQNVcXFdMgLszrKX.png"
                  alt="Pawever 장례업체 선택 화면"
                  className="w-full h-auto max-w-xs"
                />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2 text-center">
                맞춤형 배웅 가이드
              </h3>
              <p className="text-foreground/60 text-center text-sm">
                예산과 선호도에 맞는 장례 방법을 선택하고 전문가의 도움을 받습니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Closing Section */}
      <section
        className="relative w-full py-20 flex items-center justify-center overflow-hidden"
        style={{
          backgroundImage: `url('https://private-us-east-1.manuscdn.com/sessionFile/v05qfpJiY2BnS8goGxJSua/sandbox/nwNYvLYHDRTIKMzOGs8wx3-img-4_1771847929000_na1fn_Zm9yZXZlci1jbG9zaW5nLWJn.png?x-oss-process=image/resize,w_1920,h_1920/format,webp/quality,q_80&Expires=1798761600&Policy=eyJTdGF0ZW1lbnQiOlt7IlJlc291cmNlIjoiaHR0cHM6Ly9wcml2YXRlLXVzLWVhc3QtMS5tYW51c2Nkbi5jb20vc2Vzc2lvbkZpbGUvdjA1cWZwSmlZMkJuUzhnb0d4SlN1YS9zYW5kYm94L253Tll2TFlIRFJUSUtNek9Hczh3eDMtaW1nLTRfMTc3MTg0NzkyOTAwMF9uYTFmbl9abTl5WlhabGNpMWpiRzl6YVc1bkxXSm4ucG5nP3gtb3NzLXByb2Nlc3M9aW1hZ2UvcmVzaXplLHdfMTkyMCxoXzE5MjAvZm9ybWF0LHdlYnAvcXVhbGl0eSxxXzgwIiwiQ29uZGl0aW9uIjp7IkRhdGVMZXNzVGhhbiI6eyJBV1M6RXBvY2hUaW1lIjoxNzk4NzYxNjAwfX19XX0_&Key-Pair-Id=K2HSFNDJXOU9YS&Signature=qcQMkANsQkWImB5nO5D4K7vzsv~qPKh~n2U0PN3XtRXAnzZ5ftudZwWgrq0FiDHL8D8omgUznMwvUCgEvLbXUep~3G66XWrG26qAz6WZn9dgRtb9WbKvNANYMbIKa21U3YF7Ct~OTxMiAfXw1CSSzQg189hLQ7J2gCOVTbG03SdSFhuHq9vUlrUwuaEWgChaS8MEUhtiLL6UKesA7LsZqapL52NzEXU7aWCSNUzsgOR4kPGXTLgEbWfJnTF9yEkUDJAuumeu~EwJx~AVBFoihjlUcvieT7qXgkrXSWcGai7KsKTM5iQZeJgCGwaGlqhLKwJBLWYFRaf1i-q-x~7tTA__')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />

        <div className="relative z-10 container max-w-3xl mx-auto px-4 py-16 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
            포에버는 당신의 모든 이별의 순간에 함께합니다
          </h2>

          <p className="text-lg text-foreground/70 mb-12 leading-relaxed">
            반려친구와의 이별은 슬프지만, 그 슬픔 속에는 함께했던 모든 순간의 소중함이 담겨 있습니다.
            <br />
            포에버와 함께 그 순간들을 영원히 기억해보세요.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105"
              disabled
            >
              App Store 출시 예정
            </Button>
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 py-6 text-lg rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-105"
              disabled
            >
              Google Play 출시 예정
            </Button>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="flex gap-6 text-sm">
              <a
                href="/terms"
                className="text-foreground/60 hover:text-primary transition-colors duration-300"
              >
                이용약관
              </a>
              <span className="text-foreground/30">|</span>
              <a
                href="/privacy"
                className="text-foreground/60 hover:text-primary transition-colors duration-300"
              >
                개인정보취급방침
              </a>
              <span className="text-foreground/30">|</span>
              <button
                onClick={() => setShowEmailModal(true)}
                className="text-foreground/60 hover:text-primary transition-colors duration-300 cursor-pointer"
              >
                문의
              </button>
            </div>

            <div className="border-t border-foreground/20 pt-6 w-full max-w-2xl">
              <div className="flex flex-col sm:flex-row justify-center gap-6 text-sm text-foreground/60 mb-4">
                <div>
                  <span className="font-semibold text-foreground/80">이메일:</span> habitualmarketing@gmail.com
                </div>
                <span className="text-foreground/30">|</span>
                <div>
                  <span className="font-semibold text-foreground/80">주소:</span> 부산 해운대구 재반로 166 2층 습관적마케팅
                </div>
              </div>
              <p className="text-xs text-foreground/50">© 2026 Pawever. All rights reserved.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Floating Action Button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button className="w-14 h-14 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center">
          <MessageCircle className="w-6 h-6" />
        </button>
      </div>

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="bg-background rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 animate-fade-in">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-foreground">문의하기</h3>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-foreground/60 hover:text-foreground transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-foreground/70 mb-6">
              Pawever 서비스에 대한 문의가 있으신가요? 아래 버튼을 클릭하면 이메일로 문의하실 수 있습니다.
            </p>

            <div className="bg-secondary/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-foreground/60 mb-2">문의 이메일:</p>
              <p className="text-lg font-semibold text-primary">pawever01@gmail.com</p>
            </div>

            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowEmailModal(false)}
              >
                취소
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
      )}
    </div>
  );
}
