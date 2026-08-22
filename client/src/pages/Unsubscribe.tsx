import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { unsubscribeSurveyNotice } from "@/lib/goodsSurveyApi";

type Phase = "working" | "done" | "failed" | "missing";

/**
 * 안내 메일 수신거부.
 *
 * 메일의 링크로 들어온다. 열자마자 처리한다 — 버튼을 한 번 더 누르게 하면
 * 거부하려던 사람이 거부되지 않은 채로 나간다.
 *
 * 그런데 링크를 여는 것만으로 처리되지는 않는다. 회사 메일 검사기는 메일 안의
 * 링크를 미리 열어 보는데, 대개 자바스크립트는 돌리지 않는다. 실제 요청은
 * 여기서 스크립트로 보내므로 검사기가 대신 해지시키는 일이 없다.
 */
export default function Unsubscribe() {
  const [phase, setPhase] = useState<Phase>("working");

  const token = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("token") ?? "";
  }, []);

  useEffect(() => {
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex, nofollow";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  useEffect(() => {
    if (!token) {
      setPhase("missing");
      return;
    }

    let alive = true;
    void (async () => {
      try {
        await unsubscribeSurveyNotice(token);
        if (alive) setPhase("done");
      } catch {
        if (alive) setPhase("failed");
      } finally {
        // 값이 주소창과 방문 기록에 남지 않게 지운다. 처리는 이미 보냈다.
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", "/unsubscribe");
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md space-y-4 rounded-lg border bg-background p-8 text-center">
        {phase === "working" ? (
          <>
            <h1 className="text-lg font-semibold">수신거부를 처리하고 있습니다</h1>
            <p className="text-sm text-muted-foreground">잠시만 기다려 주세요.</p>
          </>
        ) : null}

        {phase === "done" ? (
          <>
            <h1 className="text-lg font-semibold">수신거부가 완료되었습니다</h1>
            <p className="text-sm text-muted-foreground">
              앞으로 광고성 안내 메일을 보내지 않습니다. 주문·배송처럼 서비스
              이용에 필요한 안내는 계속 전해 드립니다.
            </p>
            <p className="text-sm text-muted-foreground">
              남겨 주신 주소는 다음 정기 파기 때 삭제됩니다.
            </p>
            <Link href="/">
              <Button variant="outline" className="w-full">
                홈으로
              </Button>
            </Link>
          </>
        ) : null}

        {phase === "missing" ? (
          <>
            <h1 className="text-lg font-semibold">링크가 올바르지 않습니다</h1>
            <p className="text-sm text-muted-foreground">
              받으신 메일의 링크를 그대로 열어 주세요. 계속 같은 화면이 보이면
              pawever01@gmail.com 으로 알려 주시면 직접 처리해 드립니다.
            </p>
          </>
        ) : null}

        {phase === "failed" ? (
          <>
            <h1 className="text-lg font-semibold">처리하지 못했습니다</h1>
            <p className="text-sm text-muted-foreground">
              잠시 후 다시 시도해 주세요. 계속 안 되면 pawever01@gmail.com 으로
              알려 주시면 직접 처리해 드립니다.
            </p>
            <Button
              className="w-full"
              onClick={() => {
                setPhase("working");
                unsubscribeSurveyNotice(token)
                  .then(() => setPhase("done"))
                  .catch(() => setPhase("failed"));
              }}
            >
              다시 시도
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}
