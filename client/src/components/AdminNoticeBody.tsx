import { lazy, Suspense } from "react";
const Markdown = lazy(() => import("./NoticeMarkdown"));
export function AdminNoticeBody({ body }: { body: string }) {
  return (
    <Suspense fallback={<p role="status">본문을 불러오는 중…</p>}>
      <Markdown body={body} />
    </Suspense>
  );
}
