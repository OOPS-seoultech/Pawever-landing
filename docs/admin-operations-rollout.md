# 관리자 운영 화면 배포 · 2026-11-04

## 범위와 보존

- 운영 저장소: OOPS-seoultech/Pawever-landing. 기존 Cloudflare Pages 배포 사용.
- 배포 전 main: `4584c9300a0c0ef80cb8364e106f3c9bfaa8a8c4`.
- 보존 태그: `backup/admin-before-20261104-4584c93`.
- 기존 `/admin/orders`, `/admin/workflow`, `/admin/my-work`와 처리 화면은 유지한다.
- 신규 `/admin/operations`가 기존 인증/권한과 주문 API를 사용한다. 별도 주문 DB를 만들지 않는다.
- 백엔드, 주문 신청 화면/API, SMS, Aligo, Telegram, 환경변수, DB 스키마를 변경하지 않는다.
- 로컬 review 서버/가상 주문/역할 헤더/비밀값은 배포하지 않는다.

## 구현 순서

1. 기준 버전 Git bundle·소스 아카이브·태그 보존.
2. 현재 상태를 중복 없이 분류하는 단계별 작업 공간, 권한별 전체/내 작업 조회, 검색과 30초 갱신.
3. 기존 제작 상세/변경 API 재사용. 고객 사진·4면도 비교와 필라멘트 조합을 별도 영역에 표시.
4. 타입 검사, 단위 테스트, 브라우저 E2E, 빌드. 신청/알림 경로 변경 없음 확인.
5. PR 검사 통과 후 기존 Cloudflare 배포. 운영 로그인 화면과 정적 배포 확인. 실제 고객 주문을 테스트로 생성하거나 변경하지 않는다.

## 상태와 권한

입금 → 작업 준비 → 이미지·모델링 → 모델 검수 → 색상 → 플레이트 → 출력 → 후가공·검수 → 포장 → 발송·수령 → 완료·종료.

서버에 독립 이미지 승인 상태가 없으므로 이미지 자동 생성/승인 완료를 꾸며 표시하지 않는다. 모델링 대기/등록 중은 같은 업무 목록에 모은다. 이전·이후 단계는 해당 목록에서 제외한다. 확인 필요는 경고 필터이며 단계별 합계와 중복 합산하지 않는다. 알 수 없는 상태는 분류 확인 목록에 남겨 숨기지 않는다.

전체 주문은 `VIEW_ALL_ORDERS`와 `VIEW_ORDER_BASIC`이 있는 계정만 `/api/admin/workflow/orders`로 읽는다. 그 외 제작 계정은 `/api/production/my-tasks`만 읽는다. 보호자명·사진·제작 파일은 각각 기존 서버 권한을 따른다. 권한 회수/403 후 화면 자료를 지운다. 30초 갱신은 목록 조회만 실행하며 주문 상태/알림을 변경하지 않는다.

## 아직 별도 운영 구현이 필요한 로컬 시안 항목

독립 이미지 생성/승인 상태와 OpenAI 생성 API, GPT/Codex 결과 등록 종류·작업 ZIP 확장, 프로필 스냅샷, 휴지통·임의 단계 복구 및 알림 이력 경고는 이 프론트 배포로 새로 구현했다고 주장하지 않는다. 실제 운영 API·권한·트랜잭션·백업 설계가 필요한 항목이다. 기존 필라멘트/플레이트/후가공/준등기/계정 화면은 운영 API를 그대로 사용한다. Tripo 수동 작업을 유지한다.

## 부분 복구

태그에서 필요한 파일만 복원하고 동일 검증·PR 절차로 main에 반영한다. 운영 주문 데이터를 과거로 돌리는 작업이 아니다.

```bash
git restore --source backup/admin-before-20261104-4584c93 -- client/src/pages/AdminLogin.tsx
git restore --source backup/admin-before-20261104-4584c93 -- client/src/components/AdminShell.tsx
```

- 진입점만 복원: `AdminLogin.tsx`. 기존 로그인 후 작업 화면으로 돌아간다.
- 메뉴만 복원: `AdminShell.tsx`. 신규 화면 주소 자체는 유지된다.
- 신규 화면 전체 제거: 위 두 파일과 `App.tsx` 복원 후 신규 `AdminOperations.tsx`, `AdminMaterialComparison.tsx`, `lib/adminOperations.ts` 및 대응 테스트 삭제. 다른 기능 파일은 복원하지 않는다.
- 전체 프론트 복구: 이 PR만 revert. 다른 개발자가 이후 반영한 커밋을 reset/force push 하지 않는다.
- 전체 이력은 로컬 `docs/operations/backups/2026-11-04-admin-rollout/Pawever-landing-before.bundle`, 기준 소스는 같은 폴더 `Pawever-landing-before.tar.gz`에도 보존한다.

DB를 변경하지 않아 DB 롤백은 필요 없다. 이것은 주문 DB 백업을 만들었다는 뜻이 아니다. 배포 후 생성된 실제 주문/파일/발송 이력은 그대로 남는다.
