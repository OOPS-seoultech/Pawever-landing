import type { Page } from "@playwright/test";

/**
 * 캠페인 응답을 화면에 먹인다.
 *
 * 화면이 갈리는 스위치는 두 개다. 서버 마이그레이션 V6 가 하나를 둘로 쪼개
 * 두었다(V6__split_goods_survey_gates.sql) —
 *
 *   surveyOpen : 설문을 받을 수 있는가
 *   goodsOpen  : 굿즈를 팔 수 있는가
 *
 * 둘을 따로 두는 이유가 화면에서 그대로 드러난다. 설문만 열린 상태에서는
 * 구매 버튼이 사라지고 설문 버튼만 남는다. 그 조합을 실제 서버로는 한 번에
 * 하나씩밖에 못 본다.
 */
export type Campaign = {
  campaignId: string;
  /** ONLINE 또는 FLEA. 서버가 그 모집에 적힌 값을 그대로 준다. */
  channel: string;
  capacity: number;
  allocated: number;
  remaining: number;
  startsAt: string;
  endsAt: string;
  open: boolean;
  surveyOpen: boolean;
  goodsOpen: boolean;
};

/**
 * 2026-08-31 기준 운영 서버가 실제로 주는 값.
 *
 *   curl https://api.pawever.kr/api/public/goods-survey/campaign
 *   {"campaignId":"goods-2026-09","capacity":100,"allocated":1,
 *    "remaining":99,"open":true,"surveyOpen":true,"goodsOpen":true}
 *
 * 여기서 값을 바꿔 각 상황을 만든다.
 */
/** 플리마켓 모집. 정원도 값도 상시 판매와 따로 센다. */
export const FLEA_CAMPAIGN: Campaign = {
  campaignId: "goods-2026-09-flea",
  channel: "FLEA",
  capacity: 70,
  allocated: 0,
  remaining: 70,
  startsAt: "2026-09-01T00:00:00Z",
  endsAt: "2026-12-31T14:59:59Z",
  open: true,
  // 플리마켓은 QR 을 찍고 바로 주문한다. 설문을 거치지 않는다.
  surveyOpen: false,
  goodsOpen: true,
};

export const LIVE_CAMPAIGN: Campaign = {
  campaignId: "goods-2026-09",
  channel: "ONLINE",
  capacity: 100,
  allocated: 1,
  remaining: 99,
  startsAt: "2026-08-29T15:00:00Z",
  endsAt: "2026-12-31T14:59:59Z",
  open: true,
  surveyOpen: true,
  goodsOpen: true,
};

const CAMPAIGN_URL = "**/api/public/goods-survey/campaign";
const FLEA_CAMPAIGN_URL = "**/api/public/goods-survey/campaign?channel=flea";

/** 캠페인 조회에 원하는 값을 물린다. 랜딩이 주기적으로 다시 부르므로 계속 산다. */
export const mockCampaign = (page: Page, overrides: Partial<Campaign> = {}) =>
  page.route(CAMPAIGN_URL, route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { ...LIVE_CAMPAIGN, ...overrides },
      }),
    })
  );

/**
 * 플리마켓 모집 조회에 값을 물린다.
 *
 * 상시 모집과 주소가 갈리므로 따로 물려야 한다. 하나만 물리면 나머지 하나가
 * blockUnmockedGoodsApi 에 걸려 500 을 받는다.
 */
export const mockFleaCampaign = (
  page: Page,
  overrides: Partial<Campaign> = {}
) =>
  page.route(FLEA_CAMPAIGN_URL, route =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        success: true,
        data: { ...FLEA_CAMPAIGN, ...overrides },
      }),
    })
  );

/**
 * 신청 제출까지 가는 길을 물린다.
 *
 * 사진 등록은 프리사인이 CONFIRMED 를 바로 주면 저장소로 올리는 단계를
 * 건너뛴다. 시험이 S3 에 실제로 쓰지 않게 이 길을 쓴다.
 *
 * 접수 응답에는 입금처가 실려 온다. 화면이 그 값을 그대로 그리는지 보려면
 * 여기서 아는 값을 넣어 줘야 한다.
 */
export const mockSubmit = (
  page: Page,
  overrides: Record<string, unknown> = {}
) => {
  let issued = 0;
  return Promise.all([
    page.route(
      "**/api/public/goods-survey/responses/*/photos/presign",
      route => {
        issued += 1;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              photoId: `e2e-photo-${issued}`,
              status: "CONFIRMED",
              uploadUrl: null,
              headers: {},
            },
          }),
        });
      }
    ),
    page.route("**/api/public/goods-survey/responses/*/application", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          data: {
            responseId: "e2e-response-0001",
            applicationId: 1,
            status: "SUBMITTED",
            remaining: 69,
            surveyParticipant: false,
            orderNumber: "PE-2026-000123",
            listPriceKrw: 29_900,
            discountAmountKrw: 18_000,
            shippingFeeKrw: 0,
            paymentAmountKrw: 11_900,
            bank: {
              name: "기업은행",
              account: "000-000000-00-000",
              holder: "포에버",
            },
            paymentExpiresAt: "2026-09-07T14:00:00Z",
            ...overrides,
          },
        }),
      })
    ),
  ]);
};

/** 캠페인 조회가 실패하는 상황. 서버가 죽었거나 배포 중일 때 화면이 어떻게 되는지 본다. */
export const failCampaign = (page: Page) =>
  page.route(CAMPAIGN_URL, route => route.abort("failed"));

/**
 * 아직 부르지 않은 굿즈 API 를 전부 막는다.
 *
 * 테스트가 실수로 운영 서버에 쓰기 요청을 보내는 일을 없앤다. 프론트가
 * 부르는 곳은 goodsSurveyApi.ts 한 곳이고 전부 이 접두사 아래에 있다.
 */
export const blockUnmockedGoodsApi = (page: Page) =>
  page.route("**/api/public/goods-survey/**", route =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        success: false,
        code: "E2E_UNMOCKED",
        message: `테스트가 막지 않은 요청이다: ${route.request().method()} ${route.request().url()}`,
      }),
    })
  );

/**
 * 주문 화면이 들어오자마자 부르는 두 개를 물린다.
 *
 * `?direct=1` 로 들어오면 화면은 곧바로 초안을 만들고(POST /responses) 설문을
 * 건너뛴다고 서버에 알린다(POST /direct-purchase). 막지 않으면 테스트가 돌
 * 때마다 실제 DB 에 응답 행이 하나씩 쌓인다.
 */
export const mockDraft = (
  page: Page,
  opts: { remaining?: number; status?: string } = {}
) => {
  const responseId = "e2e-response-0001";
  const session = {
    responseId,
    editToken: "e2e-edit-token",
    status: opts.status ?? "DRAFT",
    remaining: opts.remaining ?? 99,
    reservationExpiresAt: null,
  };

  return Promise.all([
    page.route("**/api/public/goods-survey/responses", route =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data: session }),
      })
    ),
    page.route(
      "**/api/public/goods-survey/responses/*/direct-purchase",
      route =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            data: {
              responseId,
              status: "RESERVED",
              remaining: opts.remaining ?? 99,
              reservationExpiresAt: null,
            },
          }),
        })
    ),
  ]);
};

/**
 * 1x1 JPEG. 사진 슬롯이 보는 것은 MIME 타입과 바이트 수뿐이라 내용은 상관없다.
 * 파일을 저장소에 두지 않는 이유는 이 값이 테스트 밖에서 쓸 데가 없어서다.
 */
export const TINY_JPEG = Buffer.from(
  "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRof" +
    "Hh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAAB" +
    "AAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==",
  "base64"
);

/** 사진 한 장을 올린다. name 은 슬롯의 aria-label 과 맞춘다. */
export const photoFile = (name: string, bytes = TINY_JPEG) => ({
  name,
  mimeType: "image/jpeg",
  buffer: bytes,
});
