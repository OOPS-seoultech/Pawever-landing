import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { AdminNoticeBody } from "@/components/AdminNoticeBody";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  getNotice,
  getNotices,
  externalNoticeUrl,
  type AdminNotice,
} from "@/lib/adminNotices";
import { workflowCommand } from "@/lib/adminContracts";
import { AdminApiError } from "@/lib/adminApi";
import { formatDateTime } from "@/lib/adminFormat";
export default function AdminNotices() {
  const role = useAdminGuard();
  const { staff } = useStaffSession();
  const [, navigate] = useLocation();
  const owner =
    staff?.role === "OWNER" &&
    staff.permissions.includes("MANAGE_OPERATION_SETTINGS");
  const [rows, setRows] = useState<AdminNotice[]>([]);
  const [selected, setSelected] = useState<AdminNotice | null>(null);
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [urlLabel, setUrlLabel] = useState("");
  const [image, setImage] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(false);
  const [query, setQuery] = useState("");
  const keys = useRef(new Map<string, string>());
  const busy = useRef(false);
  const fail = (e: unknown) => {
    setError(e instanceof Error ? e.message : "공지를 불러오지 못했습니다.");
    if (e instanceof AdminApiError && e.needsSignIn)
      navigate("/admin", { replace: true });
  };
  useEffect(() => {
    let live = true;
    if (!staff) return;
    getNotices()
      .then(list => {
        if (live) setRows(list);
      })
      .catch(e => {
        if (live) fail(e);
      });
    return () => {
      live = false;
    };
  }, [staff?.id]);
  const open = async (row: AdminNotice) => {
    if (editing && !window.confirm("작성 중인 내용을 버리고 공지를 열까요?"))
      return;
    setPending(true);
    setError("");
    try {
      setSelected(await getNotice(row.id));
      setEditing(false);
    } catch (e) {
      fail(e);
    } finally {
      setPending(false);
    }
  };
  const edit = (notice: AdminNotice | null) => {
    if (editing && !window.confirm("작성 중인 내용을 버릴까요?")) return;
    setSelected(notice);
    setTitle(notice?.title ?? "");
    setBody(notice?.body ?? "");
    setEditing(true);
    setPreview(false);
    setError("");
  };
  const save = async () => {
    if (busy.current || !title.trim() || !body.trim()) return;
    busy.current = true;
    setPending(true);
    setError("");
    const payload = {
      title: title.trim(),
      body: body.trim(),
      ...(selected ? { version: selected.version } : {}),
    };
    const fingerprint = JSON.stringify([selected?.id, payload]);
    const key = keys.current.get(fingerprint) ?? crypto.randomUUID();
    keys.current.set(fingerprint, key);
    try {
      const next = await workflowCommand<AdminNotice>(
        selected ? `/api/admin/notices/${selected.id}` : "/api/admin/notices",
        payload,
        key,
        selected ? "PUT" : "POST"
      );
      setSelected(next);
      setEditing(false);
      setRows(await getNotices());
      keys.current.delete(fingerprint);
    } catch (e) {
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        keys.current.delete(fingerprint);
      fail(e);
    } finally {
      setPending(false);
      busy.current = false;
    }
  };
  return (
    <AdminShell title="공지사항" role={role} wide>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          팀 공지와 작업 안내를 언제든 확인할 수 있습니다.
        </p>
        {owner && (
          <Button disabled={pending} onClick={() => edit(null)}>
            공지 작성
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="my-3 text-destructive">
          {error}
        </p>
      )}
      <div className="mt-4 grid min-w-0 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside aria-label="공지 목록" className="flex min-w-0 flex-col gap-3">
          <Input
            aria-label="공지 제목 검색"
            placeholder="제목 검색"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          {rows
            .filter(r => r.title.includes(query))
            .map(row => (
              <Button
                key={row.id}
                variant={selected?.id === row.id ? "secondary" : "outline"}
                className="h-auto max-w-full justify-start whitespace-normal break-words p-4 text-left"
                disabled={pending}
                onClick={() => void open(row)}
              >
                <span>
                  {row.guideKey && (
                    <span className="mb-1 block text-xs">작업 안내</span>
                  )}
                  {row.title}
                  <span className="mt-2 block text-xs text-muted-foreground">
                    {formatDateTime(row.updatedAt)}
                  </span>
                </span>
              </Button>
            ))}
          {!rows.length && <p className="text-sm">등록된 공지가 없습니다.</p>}
        </aside>
        <section
          aria-label="공지 본문"
          className="flex min-w-0 flex-col gap-4 rounded-lg border bg-background p-5"
        >
          {editing && owner ? (
            <>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="notice-title">제목</FieldLabel>
                  <Input
                    id="notice-title"
                    value={title}
                    maxLength={200}
                    disabled={pending}
                    onChange={e => setTitle(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="notice-body">본문 (Markdown)</FieldLabel>
                  <Textarea
                    id="notice-body"
                    rows={16}
                    value={body}
                    maxLength={20000}
                    disabled={pending}
                    onChange={e => setBody(e.target.value)}
                  />
                  <FieldDescription>
                    제목·목록·강조·이미지·HTTPS 외부 링크를 지원합니다.
                    HTML·동영상·임베드는 실행하지 않습니다. 본문 최대 20,000자.
                  </FieldDescription>
                </Field>
              </FieldGroup>
              <details>
                <summary className="cursor-pointer text-sm">
                  이미지·외부 링크 삽입
                </summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Input
                    aria-label="링크 표시 이름"
                    placeholder="설명"
                    value={urlLabel}
                    onChange={e => setUrlLabel(e.target.value)}
                  />
                  <Input
                    aria-label="이미지 또는 외부 링크 URL"
                    placeholder="https://..."
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                  />
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={image}
                      onChange={e => setImage(e.target.checked)}
                    />
                    이미지
                  </label>
                  <Button
                    variant="outline"
                    disabled={!externalNoticeUrl(url) || pending}
                    onClick={() => {
                      setBody(
                        old =>
                          `${old}\n\n${image ? "!" : ""}[${urlLabel.replace(/[\[\]\\]/g, "") || "설명"}](<${externalNoticeUrl(url)}>)`
                      );
                      setUrl("");
                      setUrlLabel("");
                    }}
                  >
                    본문에 넣기
                  </Button>
                </div>
              </details>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setPreview(!preview)}>
                  {preview ? "미리보기 닫기" : "미리보기"}
                </Button>
                <Button
                  disabled={pending || !title.trim() || !body.trim()}
                  onClick={() => void save()}
                >
                  {selected ? "수정 저장" : "게시"}
                </Button>
                <Button
                  variant="ghost"
                  disabled={pending}
                  onClick={() => {
                    if (window.confirm("작성 중인 내용을 버릴까요?"))
                      setEditing(false);
                  }}
                >
                  취소
                </Button>
              </div>
              {preview && (
                <div className="rounded border p-4" aria-label="공지 미리보기">
                  <h2 className="mb-4 font-semibold">{title}</h2>
                  <AdminNoticeBody body={body} />
                </div>
              )}
            </>
          ) : selected ? (
            <>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="break-words text-xl font-semibold">
                    {selected.title}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {selected.authorName} · {formatDateTime(selected.updatedAt)}
                  </p>
                </div>
                {owner && (
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => edit(selected)}
                  >
                    수정
                  </Button>
                )}
              </div>
              {selected.guideKey === "local-folder-guide" && (
                <Link
                  href="/admin/local-files"
                  className="text-primary underline"
                >
                  작업 폴더 연결 바로 가기
                </Link>
              )}
              <AdminNoticeBody body={selected.body ?? ""} />
            </>
          ) : (
            <p className="text-muted-foreground">
              왼쪽에서 공지를 선택해 주세요.
            </p>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
