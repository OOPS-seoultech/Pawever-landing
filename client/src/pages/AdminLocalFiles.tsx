import { useRef, useState } from "react";
import { Link } from "wouter";
import { AdminShell, useAdminGuard } from "@/components/AdminShell";
import { useStaffSession } from "@/components/AdminSession";
import { useLocalFolder } from "@/components/AdminLocalFolder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";
import {
  chromeDesktop,
  fileExtension,
  fileSignature,
  localKinds,
  type LocalFile,
  type LocalKind,
} from "@/lib/localFiles";
import {
  getFileTargets,
  registerLocalFile,
  targetKey,
  plateKey,
} from "@/lib/localFileApi";
import { AdminApiError, adminRequest, readAdminToken } from "@/lib/adminApi";
import { formatDateTime } from "@/lib/adminFormat";

export default function AdminLocalFiles() {
  const role = useAdminGuard();
  const local = useLocalFolder();
  const { staff } = useStaffSession();
  const [manual, setManual] = useState<LocalFile[]>([]);
  const [selected, setSelected] = useState<LocalFile | null>(null);
  const [target, setTarget] = useState("");
  const [kind, setKind] = useState<LocalKind | "PLATE">("PRINT_MODEL");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const busy = useRef(false);
  const jobs = useRef(
    new Map<
      string,
      { key: string; target: Parameters<typeof registerLocalFile>[1] }
    >()
  );
  const [page, setPage] = useState(0);
  const pickRef = useRef<HTMLInputElement>(null);
  const entryList = [...manual, ...local.files];
  const filtered = entryList.filter(entry =>
    entry.path.toLowerCase().includes(query.toLowerCase())
  );
  const lastPage = Math.max(0, Math.ceil(filtered.length / 100) - 1);
  const currentPage = Math.min(page, lastPage);
  const order = local.targets.orders.find(o => targetKey(o) === target);
  const plate = local.targets.plates.find(p => plateKey(p) === target);
  const kinds: (LocalKind | "PLATE")[] = plate
    ? ["PLATE" as const]
    : (order?.kinds ?? []);
  const canWork = chromeDesktop();
  const params = new URLSearchParams(location.search);
  const initialTarget = params.get("plate")
    ? `plate:${params.get("plate")}`
    : params.get("order")
      ? `order:${params.get("order")}:${Number(params.get("pet") ?? 0)}`
      : "";
  const choose = (entry: LocalFile) => {
    setSelected(entry);
    setError("");
    setNotice("");
    const wanted = entry.suggestedTarget ?? initialTarget ?? "";
    const matching = local.targets.orders.find(o => targetKey(o) === wanted);
    const matchedPlate = local.targets.plates.find(p => plateKey(p) === wanted);
    if (matchedPlate) {
      setTarget(wanted);
      setKind("PLATE");
    } else if (matching) {
      setTarget(wanted);
      const suggested = entry.suggestedKind;
      setKind(
        suggested && suggested !== "PLATE" && matching.kinds.includes(suggested)
          ? suggested
          : (matching.kinds.find(k =>
              localKinds[k].extensions.some(
                ext => ext === fileExtension(entry.file.name)
              )
            ) ?? matching.kinds[0])
      );
    } else if (entry.suggestedTarget) {
      setTarget("");
    } else if (!target) {
      const first = local.targets.orders[0];
      if (first) {
        setTarget(targetKey(first));
        setKind(
          first.kinds.find(k =>
            localKinds[k].extensions.some(
              ext => ext === fileExtension(entry.file.name)
            )
          ) ?? first.kinds[0]
        );
      }
    }
  };
  const upload = async () => {
    if (busy.current || !selected || !target || !canWork) return;
    busy.current = true;
    setPending(true);
    setError("");
    setNotice("");
    const login = readAdminToken();
    let fingerprint = "";
    try {
      const file = selected.handle
        ? await selected.handle.getFile()
        : selected.file;
      if (
        file.size !== selected.file.size ||
        file.lastModified !== selected.file.lastModified
      )
        throw new Error(
          "선택 후 파일이 변경됐습니다. 목록을 새로고침하고 저장이 끝난 파일을 다시 선택해 주세요."
        );
      const fresh = await getFileTargets();
      const item =
        kind === "PLATE"
          ? fresh.plates.find(p => plateKey(p) === target)
          : fresh.orders.find(o => targetKey(o) === target);
      if (!item)
        throw new Error(
          "등록 가능한 단계나 담당자가 변경됐습니다. 대상을 다시 확인해 주세요."
        );
      if (readAdminToken() !== login)
        throw new Error("로그인 계정이 변경됐습니다. 다시 선택해 주세요.");
      fingerprint = JSON.stringify([
        fileSignature(selected),
        target,
        kind,
        "taskId" in item ? item.taskId : item.layoutRevision,
      ]);
      const job = jobs.current.get(fingerprint) ?? {
        key: crypto.randomUUID(),
        target: item,
      };
      jobs.current.set(fingerprint, job);
      const artifactId = await registerLocalFile(
        file,
        job.target,
        kind,
        job.key
      );
      jobs.current.delete(fingerprint);
      try {
        await local.record({
          signature: fileSignature(selected),
          target,
          artifactId,
          at: new Date().toISOString(),
        });
        setNotice(
          "서버 등록 완료. 권한 있는 팀원이 내려받을 수 있습니다. 제작 단계와 고객 알림은 바뀌지 않았습니다."
        );
      } catch {
        setNotice(
          "서버 등록은 완료됐습니다. 이 브라우저의 등록 표시를 저장하지 못했으니 아래 서버 등록 자료에서 확인해 주세요."
        );
      }
      await local.refresh();
    } catch (e) {
      if (e instanceof AdminApiError && e.status >= 400 && e.status < 500)
        jobs.current.delete(fingerprint);
      setError(e instanceof Error ? e.message : "파일 등록에 실패했습니다.");
    } finally {
      busy.current = false;
      setPending(false);
    }
  };
  const download = async (id: string) => {
    const tab = window.open("about:blank", "_blank");
    if (tab) tab.opener = null;
    setError("");
    try {
      const path = plate
        ? `/api/production/print-batches/${plate.id}/artifacts/${id}/download-link`
        : `/api/production/artifacts/${id}/download-link`;
      const result = await adminRequest<{ url: string }>(path, {
        method: "POST",
      });
      if (tab) tab.location.href = result.url;
      else
        throw new Error(
          "팝업이 차단됐습니다. 이 사이트의 팝업을 허용한 뒤 다시 내려받아 주세요."
        );
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : "내려받지 못했습니다.");
    }
  };
  const remote = order?.artifacts ?? plate?.artifacts ?? [];
  return (
    <AdminShell title="로컬 파일 · 팀 공유" role={role} wide>
      <div className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            내 PC에서 완성한 자료를 아이·플레이트별로 등록합니다. 연결만으로
            파일이 전송되지는 않습니다.
          </p>
          <Link href="/admin/notices" className="text-primary underline">
            폴더 연결 안내 · 공지사항
          </Link>
        </div>
        {!canWork && (
          <p role="alert" className="rounded border p-4">
            파일 작업은 맥·윈도우의 데스크톱 Google Chrome에서 진행해 주세요.
            주소창에 https://www.pawever.kr/admin/local-files 를 열면 됩니다.
          </p>
        )}
        <section
          aria-label="작업 폴더 연결"
          className="flex flex-col gap-3 rounded-lg border bg-background p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">
                {local.folder
                  ? `연결 폴더: ${local.folder.handle.name}`
                  : "작업 폴더 연결"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                상위 작업 폴더를 선택하면 PAW-EVER 하위에 주문·아이·자료 종류별
                폴더가 자동 생성됩니다. 원본 파일을 수정하거나 삭제하지
                않습니다.
              </p>
            </div>
            <Button
              disabled={!local.supported || pending || local.loading}
              onClick={() =>
                void local.connect().catch(e => setError(String(e)))
              }
            >
              {local.folder ? "다른 폴더 연결" : "작업 폴더 연결"}
            </Button>
          </div>
          {local.folder && (
            <div className="flex flex-wrap gap-2">
              {local.permission !== "granted" && (
                <Button disabled={pending} onClick={() => void local.allow()}>
                  폴더 접근 허용
                </Button>
              )}
              <Button
                variant="outline"
                disabled={pending || local.loading}
                onClick={() => void local.refresh()}
              >
                목록·폴더 새로고침
              </Button>
              <Button
                variant="ghost"
                disabled={pending}
                onClick={() =>
                  void local.disconnect().catch(e => setError(String(e)))
                }
              >
                연결 해제
              </Button>
            </div>
          )}
          <details>
            <summary className="cursor-pointer text-sm">
              자동 생성 구조 보기
            </summary>
            <pre className="mt-3 overflow-x-auto rounded bg-muted p-3 text-xs">{`PAW-EVER/\n  주문/주문번호/아이번호_이름/\n    01_2D_4면도/\n    02_3D_모델원본/\n    03_출력모델/\n    04_채색3MF/\n  플레이트/PB-번호/05_슬라이서_3MF_Gcode/`}</pre>
            <p className="mt-2 text-xs text-muted-foreground">
              폴더 접근이 허용되고 관리자 페이지가 열려 있는 동안 새 작업 폴더를
              이어서 만듭니다. 로그아웃·페이지 종료·PC 절전 중에는 감시하거나
              업로드하지 않습니다.
            </p>
          </details>
          {local.loading && (
            <p role="status" className="text-sm">
              작업 폴더와 자료를 확인하는 중…
            </p>
          )}
        </section>
        {(error || local.error) && (
          <p role="alert" className="text-destructive">
            {error || local.error}
          </p>
        )}
        {notice && (
          <p role="status" className="rounded border p-3 text-sm">
            {notice}
          </p>
        )}
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <section
            aria-label="로컬 완성 파일"
            className="flex min-w-0 flex-col gap-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-semibold">로컬 파일 ({entryList.length})</h2>
              <Button
                variant="outline"
                disabled={!canWork || pending}
                onClick={() => pickRef.current?.click()}
              >
                파일 직접 선택
              </Button>
              <input
                ref={pickRef}
                aria-label="제작 파일 직접 선택"
                type="file"
                multiple
                className="sr-only"
                accept=".png,.jpg,.jpeg,.webp,.glb,.gltf,.obj,.fbx,.blend,.stl,.3mf,.gcode"
                onChange={e => {
                  const entries = Array.from(e.target.files ?? []).map(
                    (file, index) => ({
                      path: `직접 선택/${index + 1}/${file.name}`,
                      file,
                    })
                  );
                  setManual(entries);
                  if (entries[0]) choose(entries[0]);
                  e.target.value = "";
                }}
              />
            </div>
            <Input
              aria-label="로컬 파일 검색"
              placeholder="파일명·주문번호·아이 이름 검색"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                setPage(0);
              }}
            />
            <div className="max-h-[65dvh] overflow-auto rounded border bg-background">
              <table className="w-full text-sm">
                <caption className="sr-only">내 PC의 제작 파일 목록</caption>
                <thead className="sticky top-0 bg-background text-left">
                  <tr>
                    <th className="p-3">파일·폴더</th>
                    <th className="p-3">용량·수정 시각</th>
                    <th className="p-3">등록</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice(currentPage * 100, (currentPage + 1) * 100)
                    .map(entry => (
                      <tr key={entry.path} className="border-t">
                        <td className="min-w-0 p-3">
                          <button
                            className="max-w-full break-all text-left underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
                            aria-pressed={selected?.path === entry.path}
                            disabled={pending}
                            onClick={() => choose(entry)}
                          >
                            {entry.file.name}
                            <span className="mt-1 block text-xs text-muted-foreground">
                              {entry.path}
                            </span>
                          </button>
                        </td>
                        <td className="p-3 text-xs">
                          {(entry.file.size / 1024 / 1024).toFixed(2)}MB
                          <br />
                          {formatDateTime(
                            new Date(entry.file.lastModified).toISOString()
                          )}
                        </td>
                        <td className="p-3 text-xs">
                          {local.folder?.receipts.some(
                            r => r.signature === fileSignature(entry)
                          )
                            ? "등록 이력 있음"
                            : "미등록"}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
              {!entryList.length && (
                <p className="p-5 text-sm text-muted-foreground">
                  작업 폴더를 연결하거나 파일 직접 선택을 눌러 주세요.
                </p>
              )}
            </div>
            {filtered.length > 100 && (
              <nav
                aria-label="로컬 파일 페이지"
                className="flex items-center justify-between gap-2 text-sm"
              >
                <Button
                  variant="outline"
                  disabled={currentPage === 0}
                  onClick={() => setPage(currentPage - 1)}
                >
                  이전
                </Button>
                <span>
                  {currentPage + 1} / {lastPage + 1} · 검색 {filtered.length}개
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === lastPage}
                  onClick={() => setPage(currentPage + 1)}
                >
                  다음
                </Button>
              </nav>
            )}
          </section>
          <section
            aria-label="제작 파일 등록"
            className="flex min-w-0 flex-col gap-4 rounded-lg border bg-background p-5"
          >
            <h2 className="font-semibold">선택한 파일 등록</h2>
            <p className="break-all text-sm">
              {selected?.file.name ?? "왼쪽에서 파일을 선택해 주세요."}
            </p>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="file-target">
                  등록할 아이 · 플레이트
                </FieldLabel>
                <select
                  id="file-target"
                  className="w-full min-w-0 rounded border bg-background p-2 text-sm"
                  disabled={pending}
                  value={target}
                  onChange={e => {
                    setTarget(e.target.value);
                    const order = local.targets.orders.find(
                      o => targetKey(o) === e.target.value
                    );
                    setKind(order?.kinds[0] ?? "PLATE");
                  }}
                >
                  <option value="">대상 선택</option>
                  <optgroup label="아이별 자료">
                    {local.targets.orders.map(o => (
                      <option key={targetKey(o)} value={targetKey(o)}>
                        {o.orderNumber} · 아이{o.petIndex + 1} {o.petName}
                        {o.guardianName ? ` · ${o.guardianName}` : ""}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="플레이트 파일">
                    {local.targets.plates.map(p => (
                      <option key={p.id} value={plateKey(p)}>
                        PB-{p.id} · {p.orders.map(o => o.petName).join(", ")}
                      </option>
                    ))}
                  </optgroup>
                </select>
                <FieldDescription>
                  현재 등록 가능한 단계와 담당 권한의 작업만 표시합니다.
                </FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="file-kind">자료 종류</FieldLabel>
                <select
                  id="file-kind"
                  className="w-full rounded border bg-background p-2 text-sm"
                  value={kind}
                  disabled={pending || !kinds.length}
                  onChange={e => setKind(e.target.value as LocalKind | "PLATE")}
                >
                  {!kinds.length && (
                    <option value="PRINT_MODEL">대상 먼저 선택</option>
                  )}
                  {kinds.map(k => (
                    <option key={k} value={k}>
                      {k === "PLATE"
                        ? "슬라이서 3MF / G-code"
                        : localKinds[k].label}
                    </option>
                  ))}
                </select>
              </Field>
            </FieldGroup>
            {selected &&
              local.folder?.receipts.some(
                r =>
                  r.signature === fileSignature(selected) && r.target === target
              ) && (
                <p className="text-sm text-muted-foreground">
                  이 파일의 등록 이력이 있습니다. 다시 등록하면 새 자료로
                  추가되며 이전 자료는 유지됩니다.
                </p>
              )}
            <Button
              disabled={
                !canWork ||
                pending ||
                !selected ||
                (!order && !plate) ||
                !kinds.includes(kind)
              }
              onClick={() => void upload()}
            >
              {pending ? "전송·등록 중…" : "선택 파일 서버에 등록"}
            </Button>
            <p className="text-xs text-muted-foreground">
              파일당 100MB 이하 · 저장 중 파일 제외 · 업로드 성공 후에만 팀과
              공유됩니다. 아이별 3MF와 여러 아이를 합친 플레이트 파일의 대상을
              확인해 주세요.
            </p>
            {order && (
              <Link
                href={`/admin/orders/${encodeURIComponent(order.orderNumber)}?petIndex=${order.petIndex}`}
                className="text-sm text-primary underline"
              >
                {order.petName} 제작 상세 보기
              </Link>
            )}
            <div className="flex flex-col gap-2 border-t pt-4">
              <h3 className="font-medium">
                선택 대상의 서버 등록 자료 ({remote.length})
              </h3>
              {remote.map(file => (
                <div
                  key={file.id}
                  className="flex min-w-0 items-center justify-between gap-3 text-sm"
                >
                  <span className="break-all">{file.fileName}</span>
                  {staff?.permissions.includes("DOWNLOAD_PRODUCTION_FILES") && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void download(file.id)}
                    >
                      내려받기
                    </Button>
                  )}
                </div>
              ))}
              {!remote.length && (
                <p className="text-sm text-muted-foreground">
                  등록 자료가 없습니다.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>
    </AdminShell>
  );
}
