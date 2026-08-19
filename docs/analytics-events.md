# 랜딩·설문 이벤트 명세

노션 「GTM 등 UX 사용자 트래킹 코드 구현」 요청에 대한 구현 명세입니다.
보고서를 설계하실 때 이 문서의 이벤트 이름과 파라미터를 그대로 쓰시면 됩니다.

운영 정책(개인정보·활성시간 정의·동의)은 [analytics-tracking.md](./analytics-tracking.md)에 있습니다.

---

## 0. 어떤 도구가 무엇을 보내는가

| 도구           | 상태                     | 역할                                                     |
| -------------- | ------------------------ | -------------------------------------------------------- |
| **GA4**        | 작동 중 (`G-B0FQ643PXS`) | 모든 이벤트를 **코드에서 직접** 전송                     |
| **GTM**        | 컨테이너 ID 입력 대기    | Hotjar 등 서드파티 태그를 **코드 배포 없이** 붙이는 통로 |
| **Meta Pixel** | 픽셀 ID 입력 대기        | 코드에 이미 구현됨. ID만 넣으면 켜짐                     |

> ### ⚠️ GTM 안에서 GA4 태그를 만들지 마세요
>
> GA4는 코드가 직접 보내고 있습니다. GTM에 GA4 태그를 추가하면 **같은 행동이 두 번 집계**됩니다.
> GTM은 Hotjar처럼 아직 코드에 없는 도구를 붙일 때만 쓰시면 됩니다.
>
> Meta Pixel도 마찬가지입니다. GTM에 넣지 마시고 픽셀 ID만 주세요 —
> 코드 쪽 구현에는 `Lead` 전환 매핑과 중복 제거(`event_id`)가 이미 들어 있습니다.

ID는 Cloudflare Pages 환경변수에 넣습니다: `VITE_GTM_CONTAINER_ID`, `VITE_META_PIXEL_ID`.

---

## 1. STEP 정의 (노션 STEP 1~15)

노션 본문의 구분선(`--- ---`)이 나눈 페이지를 그대로 STEP으로 씁니다.

| STEP | 화면               | 시작 문항                 |
| ---- | ------------------ | ------------------------- |
| 1~13 | 설문 질문 13페이지 | Q1 … Q31~33               |
| 14   | 사연 남기기        | 웹사이트용 정성 사연 모집 |
| 15   | 굿즈 제작 정보     | 이름·연락처·주소·사진     |

읽어야 할 두 가지가 있습니다.

**① STEP 14는 건너뛸 수 있고, STEP 15는 굿즈가 열려 있을 때만 존재합니다.**
사연을 쓰지 않은 사람은 13 다음으로 바로 넘어갑니다. 퍼널에서 14가 비어 보이는 것이 정상입니다.
굿즈가 닫혀 있으면 **STEP 15에 아무도 도달하지 않습니다** — 설문을 마치면 그대로 끝나며,
완료 화면에서 2차 안내 이메일만 선택으로 받습니다.

**② 노션에 없는 전환 화면이 하나 있습니다.**
STEP 13과 14 사이에 "설문이 끝났어요 / 사연을 남기시겠어요?" 화면(`closing`)이 있습니다.
이 화면은 STEP 번호를 갖지 않습니다. 여기서 뒤로 간 기록은 `to_step: 0`으로 표시됩니다.

**③ "완료"가 두 가지입니다.**

|           | 이벤트                 | 의미                                               |
| --------- | ---------------------- | -------------------------------------------------- |
| 설문 완료 | `survey_complete`      | STEP 13까지 끝냄 (서버 저장 완료 시점)             |
| 안내 신청 | `notice_subscribe`     | 완료 화면에서 2차 안내 이메일을 남김 (선택)        |
| 신청 완료 | `application_complete` | 굿즈 신청까지 끝냄. **굿즈가 열려 있을 때만 발생** |

> ### 최종 전환은 `survey_complete`입니다
>
> 설문과 굿즈는 각각의 스위치로 열리고 닫힙니다. 굿즈가 닫힌 기간에는
> `application_complete`가 **한 건도 발생하지 않으므로** 완료율의 기준이 될 수 없습니다.
> 지금 랜딩의 목표가 설문 응답 수집이므로 `survey_complete`를 최종 전환으로 봅니다.
> Meta 표준 이벤트 `Lead`도 여기에 매핑돼 있습니다.
>
> `notice_subscribe`는 구매 의향에 더 가깝지만 발생 수가 적어 보조 지표로 씁니다.

### 국면 구분 — 모든 이벤트에 자동으로 실립니다

굿즈를 무료로 주던 1차와 아무것도 주지 않는 지금의 "설문 완료"는 참여 동기가
다릅니다. 한 숫자로 합치면 **2차 수량·가격을 잘못된 근거로 정하게 됩니다.**

| 파라미터      | 값                 | 뜻                             |
| ------------- | ------------------ | ------------------------------ |
| `campaign_id` | `goods-2026-07` 등 | 어느 캠페인의 이벤트인지       |
| `goods_open`  | `true` / `false`   | 그 시점에 굿즈를 받고 있었는지 |

보고서를 볼 때 **`goods_open`으로 반드시 나눠 보세요.** 두 값을 섞은 완료율은
아무 뜻이 없습니다.

---

## 2. 이벤트 목록

### 랜딩페이지

| 이벤트              | 언제              | 주요 파라미터                |
| ------------------- | ----------------- | ---------------------------- |
| `landing_view`      | 랜딩 진입         | `page_name`                  |
| `scroll_depth`      | 25/50/75/90% 도달 | `percent_scrolled`           |
| `survey_cta_click`  | CTA 클릭          | `cta_id`, `cta_placement`    |
| `member_offer_view` | 참여자 가격 노출  | `offer_placement`            |
| `page_engagement`   | 화면을 떠날 때    | `active_ms`, `report_reason` |

**CTA 식별자** — 이동 목적지는 모두 같지만 위치로 구분합니다.

| `cta_id` | 위치           | `cta_placement`    |
| -------- | -------------- | ------------------ |
| `btn_A1` | 첫 화면        | `hero`             |
| `btn_A2` | 가격 비교 아래 | `price_comparison` |
| `btn_A3` | 가격 카드 아래 | `offer`            |
| `btn_A4` | 마지막 배너    | `final`            |
| `btn_B`  | 화면 하단 고정 | `sticky`           |

이 값은 이벤트 파라미터일 뿐 아니라 버튼의 `data-cta-id` 속성으로도 나갑니다.
Meta 이벤트 설정 도구나 GTM 클릭 트리거처럼 DOM만 보는 도구에서는
`[data-cta-id="btn_A2"]` 형태로 특정 버튼만 골라 잡으시면 됩니다.
**클래스나 문구로 잡지 마세요** — 첫 화면(`btn_A1`)과 가격 비교 아래(`btn_A2`)
버튼은 클래스도 문구도 같아서 한 규칙에 두 개가 겹쳐 잡힙니다.

### 설문

| 이벤트                       | 언제                     | 주요 파라미터                                                    |
| ---------------------------- | ------------------------ | ---------------------------------------------------------------- |
| `survey_intro_view`          | 안내 화면 방문           | `resumed`(이어하기 여부)                                         |
| `survey_start`               | '설문 시작하기' 클릭     | `entry_method`                                                   |
| `survey_step_view`           | **STEP 진입**            | `step_number`, `step_name`, `step_visit_count`, `question_count` |
| `survey_step_complete`       | **STEP 완료(다음)**      | `step_number`, `active_ms`, `step_visit_count`                   |
| `survey_step_back`           | **이전으로 이동**        | `step_number`(떠난 단계), `to_step`, `active_ms`                 |
| `survey_abandon`             | 창을 닫을 때 (최선 노력) | `step_number`, `furthest_step`, `survey_completed`               |
| `survey_question_view`       | 문항 표시                | `question_id`, `question_type`                                   |
| `survey_question_answered`   | 문항 응답                | `question_id`, `active_ms`, `skipped`                            |
| `survey_complete`            | STEP 13 완료             | `active_ms`, `completion_status`                                 |
| `story_start` / `story_skip` | 사연 작성/건너뛰기       | `reason`                                                         |
| `production_form_view`       | 굿즈 정보 화면           | `goods_type`                                                     |
| `member_offer_view`          | 완료 화면에서 가격 노출  | `offer_placement`                                                |
| `notice_subscribe`           | 2차 안내 이메일 남김     | —                                                                |
| `application_complete`       | 굿즈 신청 완료           | `goods_type`, `photo_count`, `furthest_step`                     |

`survey_complete`의 `completion_status`는 `RESERVED`(굿즈 자리 확보) 또는
`COMPLETED_NO_SLOT`(설문은 저장, 굿즈 자리 없음)입니다. 굿즈가 닫힌 기간에는
전부 후자이며, 이는 실패가 아니라 정상 완료입니다.

`member_offer_view`는 참여자 가격을 실제로 본 지점입니다. `offer_placement`로 둘을 나눕니다.

| `offer_placement` | 언제                                       |
| ----------------- | ------------------------------------------ |
| `cta_modal`       | CTA를 눌러 안내 모달이 열렸을 때 (설문 전) |
| `survey_complete` | 설문을 마치고 완료 화면에 닿았을 때        |

**설문 완료가 곧 가격 확인은 아닙니다.** 굿즈가 열려 있으면 완료 뒤 제작 화면으로
가므로 `survey_complete`로는 이 수를 셀 수 없습니다. 알림 신청 전환율(회의록 핵심
지표 3번)을 볼 때는 `offer_placement = survey_complete`인 `member_offer_view`를
분모로 쓰세요.

### Meta Pixel 매핑

| 이벤트                                                   | Meta 이벤트                                          | 표준 여부               |
| -------------------------------------------------------- | ---------------------------------------------------- | ----------------------- |
| `landing_view`                                           | `PageView`                                           | 표준                    |
| `survey_complete`                                        | **`Lead`**                                           | 표준 (전환 최적화 대상) |
| `application_complete`                                   | `SubmitApplication`                                  | 표준                    |
| `survey_cta_click` / `survey_start` / `notice_subscribe` | `SurveyCtaClick` / `SurveyStart` / `NoticeSubscribe` | 맞춤                    |

`Lead`는 원래 굿즈 신청에 붙어 있었으나, 굿즈가 닫힌 기간에 전환이 0이 되어
광고가 학습을 못 하므로 설문 완료로 옮겼습니다. **2026-08 이전 `Lead` 데이터는
굿즈 신청을 뜻하므로 그 앞뒤를 한 그래프에서 비교하지 마세요.**

모든 이벤트에 `visit_id`, `device_category`, `campaign_source/medium/name/content`가 함께 붙습니다.

**설문 답변값·이름·연락처·주소·사진은 어떤 이벤트에도 담기지 않습니다.**
`sanitizeAnalyticsProperties()`가 해당 이름의 파라미터를 코드 레벨에서 차단합니다.

---

## 3. UTM 규칙

링크를 만들 때 이 형식을 그대로 씁니다. **사람마다 다르게 붙이면 채널·소재별
비교가 불가능해집니다.** UTM은 랜딩에서 설문으로 넘어가도 `sessionStorage`로
유지되며 모든 이벤트에 `campaign_source` 등으로 함께 실립니다.

```
Instagram 오가닉
?utm_source=instagram&utm_medium=organic_social&utm_campaign=goods_round2_waitlist&utm_content=reel_build_01

Threads 오가닉
?utm_source=threads&utm_medium=organic_social&utm_campaign=goods_round2_waitlist&utm_content=founder_log_01

Meta 광고
?utm_source=instagram&utm_medium=paid_social&utm_campaign=goods_round2_sales&utm_content=reel_before_after_01
```

| 값                      | 뜻                                  |
| ----------------------- | ----------------------------------- |
| `goods_round2_waitlist` | 설문 참여자를 모으는 국면 (지금)    |
| `goods_round2_sales`    | 2차 판매를 여는 국면                |
| `utm_content`           | 소재 식별용. 릴스·게시물마다 다르게 |

`utm_content`는 소재를 가리키는 값입니다. 랜딩 A/B 테스트에는 쓰지 말고 별도의
실험 ID와 변형값을 따로 기록하세요.

---

## 4. GA4에서 확인하는 방법

### ⚠️ 먼저 해야 할 일 — 맞춤 정의 등록

**GA4는 등록하지 않은 파라미터를 보고서에서 보여주지 않습니다.**
이벤트는 쌓이고 있는데 보고서에 안 나온다면 십중팔구 이것 때문입니다.

`관리 → 데이터 표시 → 맞춤 정의`에서 등록하세요. (등록 시점 이후 데이터부터 보입니다)

**맞춤 측정기준** (범위: 이벤트)

| 측정기준 이름  | 이벤트 매개변수     |
| -------------- | ------------------- |
| STEP 번호      | `step_number`       |
| STEP 이름      | `step_name`         |
| CTA 버튼       | `cta_id`            |
| 굿즈 유형      | `goods_type`        |
| 스크롤 구간    | `percent_scrolled`  |
| 문항 ID        | `question_id`       |
| 캠페인 ID      | `campaign_id`       |
| 굿즈 접수 여부 | `goods_open`        |
| 설문 완료 상태 | `completion_status` |
| 가격 노출 지점 | `offer_placement`   |

**맞춤 측정항목** (범위: 이벤트)

| 측정항목 이름  | 이벤트 매개변수    | 단위   |
| -------------- | ------------------ | ------ |
| 활성 시간      | `active_ms`        | 밀리초 |
| STEP 방문 횟수 | `step_visit_count` | 표준   |
| 최대 도달 STEP | `furthest_step`    | 표준   |

### 단계별 도달·이탈 보기

`탐색 → 유입경로 탐색 분석`에서 단계를 이렇게 잡습니다.

```
1단계  survey_intro_view
2단계  survey_start
3단계  survey_step_view  +  STEP 번호 = 1
4단계  survey_step_view  +  STEP 번호 = 2
...
15단계 survey_step_view  +  STEP 번호 = 13
16단계 survey_complete            ← 굿즈가 닫힌 기간의 마지막 단계
```

"open funnel"이 아니라 **순서가 있는 유입경로**로 두면 각 단계의 이탈률이 바로 나옵니다.
STEP 14(사연)는 건너뛸 수 있으므로 퍼널 단계에 넣지 마세요.

**굿즈가 열려 있는 기간을 볼 때만** 뒤에 두 단계를 더 붙입니다.
굿즈가 닫힌 기간에는 이 두 단계가 항상 0이라 퍼널 전체가 실패한 것처럼 보입니다.

```
17단계 survey_step_view  +  STEP 번호 = 15
18단계 application_complete
```

### 이탈 지점 보기

노션 9번 요청대로, 이탈은 **마지막 진입 STEP + 이후 이벤트 없음**으로 계산합니다.

`탐색 → 자유 형식`에서

- 행: `STEP 이름`
- 값: `survey_step_view` 이벤트 수, `survey_step_complete` 이벤트 수

두 수의 차이가 그 단계에서 멈춘 사람입니다.
`survey_abandon`도 함께 보시면 좋지만, **브라우저 강제 종료 시에는 남지 않을 수 있습니다.**
전송은 `beacon` 방식이라 대부분 잡히지만 100%를 보장하지 않으니, 이탈률의 기준은 위의 뺄셈으로 잡으시는 편이 정확합니다.

### 유입 출처별 완료율

`탐색 → 자유 형식`에서 행에 `세션 소스/매체`, 값에 `survey_complete` 이벤트 수.
(굿즈가 열려 있던 기간을 볼 때는 `application_complete`로 바꿔 보세요.)
UTM은 랜딩에서 설문으로 넘어가도 `sessionStorage`로 유지되며, 모든 이벤트에 `campaign_source` 등으로 함께 실립니다.

### 검증

`관리 → DebugView`에서 실시간으로 확인합니다.
개발 환경에서는 브라우저 콘솔의 `window.__PAWEVER_ANALYTICS__`에 발생 이벤트가 모두 쌓입니다.

---

## 5. 노션 요청 대응표

| 노션 | 항목                                      | 상태                                      |
| ---- | ----------------------------------------- | ----------------------------------------- |
| 1    | 측정 대상 두 페이지, 하나의 흐름으로 연결 | ✅ `visit_id`로 연결                      |
| 2    | 랜딩 기본 분석 + 스크롤 25/50/75/90       | ✅                                        |
| 3    | CTA 5개 구분 (btn_A1~A4, btn_B)           | ✅                                        |
| 4    | UTM 유입 정보 유지                        | ✅ `sessionStorage` 첫/마지막 유입        |
| 5    | 안내 방문 / 시작 클릭 / 첫 단계 진입 구분 | ✅                                        |
| 6    | 단계별 진입·완료·이동·이탈                | ✅                                        |
| 7    | 단계별 소요 시간 (탭 전환 제외)           | ✅ `active_ms`                            |
| 8    | 이전 단계 이동, 재방문                    | ✅ `survey_step_back`, `step_visit_count` |
| 9    | 이탈 지점 분석                            | ✅ 위 "이탈 지점 보기" 참고               |
| 10   | 완료 = 서버 저장 시점                     | ✅                                        |
| 11   | 굿즈 유형 구분                            | ✅ 모든 주요 이벤트에 `goods_type`        |
| 12   | 세션 리코딩 (Hotjar)                      | ⬜ GTM 연결 후 직접 추가 가능             |
| 13   | 중복·누락 방지                            | ✅ 아래 참고                              |
| 14   | 검수 및 전달                              | 이 문서                                   |

### 13번 — 중복 집계를 막는 장치

| 상황                      | 대응                                            |
| ------------------------- | ----------------------------------------------- |
| '다음' 연속 클릭          | `navigationLocked`로 이동 자체를 잠금           |
| 리렌더로 같은 단계 재집계 | `trackedStepEntry`가 같은 단계 연속 발생을 무시 |
| 최종 제출 중복 클릭       | `applicationTracked` + 서버 `idempotencyKey`    |
| 설문 완료 중복            | `surveyCompletionTracked`                       |
| 같은 스크롤 구간 반복     | 구간별 1회만 전송                               |
| 이탈 중복                 | `abandonTracked`                                |
| 새로고침                  | 이어하기로 복원되며 `resumed: true`로 구분      |

의도적으로 중복이 아닌 것: **같은 STEP에 다시 들어가면 다시 셉니다.**
노션 8번이 요청한 재방문 측정이며, `step_visit_count`로 몇 번째 방문인지 구분됩니다.

---

## 6. 남은 것

- **Hotjar 등 세션 리코딩** (노션 12번, 필수 아님) — GTM 연결 후 추가.
  설문 페이지에 적용하실 경우 이름·연락처·주소·자유 입력·사진·설문 응답을
  **반드시 마스킹**하셔야 합니다.
- **동의 UI** — 현재 방문 분석·마케팅 동의가 자동 허용 상태입니다(별도 팝업 없음).
  Meta Pixel처럼 광고 목적 태그를 켜기 전에 안내·동의 절차와 개인정보 처리방침 문구를
  실제 운영 설정에 맞게 검토해야 합니다.
