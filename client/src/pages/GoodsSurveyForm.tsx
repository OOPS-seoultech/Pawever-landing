import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  LockKeyhole,
  PawPrint,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import {
  createSubmissionTrackingContext,
  setSurveyPhaseContext,
  trackEvent,
} from "@/lib/analytics/analytics";
import { usePageEngagement } from "@/lib/analytics/react";
import {
  GOODS_PET_MAX_COUNT,
  GOODS_PHOTO_MAX_COUNT,
  GOODS_SURVEY_VERSION,
  GoodsSurveyApiError,
  createSurveyDraft,
  getSurveyCampaign,
  startDirectPurchase,
  submitSurveyApplication,
  uploadSurveyPhoto,
  type GoodsDeliveryMethod,
  type SurveyDraftSession,
} from "@/lib/goodsSurveyApi";
import {
  clearGoodsSurveyDraftSnapshot,
  loadGoodsSurveyDraft,
  saveGoodsSurveyDraftSnapshot,
} from "@/lib/goodsSurveyDraftStorage";
import {
  clearGoodsSurveyPhotoHandoff,
  loadGoodsSurveyPhotoHandoff,
} from "@/lib/goodsSurveyPhotoHandoff";
import {
  GOODS_PRICE,
  applicablePriceKrw,
  payableKrw,
  formatPhoneNumber,
  wonText,
  goodsSurveyPrivacyContent,
  goodsSurveyProductionContent,
} from "./goodsSurveyContent";
import { landingPathFor } from "./goodsSurveyNavigation";
import { photoContentType, PHOTO_TYPE_HELP } from "./goodsSurveyPhotoType";
import {
  hasLowPhotoCount,
  isPetReady,
  LowPhotoWarningDialog,
  PetEditor,
  type PetDraft,
} from "./goodsSurveyPetEditor";
import "./GoodsSurveyForm.css";
const deadlineText = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const PHONE_PATTERN = /^01[016789][-\s]?\d{3,4}[-\s]?\d{4}$/;

type ProductionFields = {
  goods: string;
  guardianName: string;
  phone: string;
  postalCode: string;
  address: string;
  addressDetail: string;
};

/**
 * 2차 판매 상품.
 *
 * 회의록 2번이 주력을 3D 전신 피규어 한 종으로 좁혔다. 고를 것이 없으므로
 * 신청 화면에서도 선택을 받지 않고 무엇을 만드는지만 보여준다.
 * 1차 신청 기록에는 다른 종류 값이 남아 있다. 그때 실제로 신청한 것이라 고치지 않는다.
 */
const PRODUCTION_GOODS_ID = "figure";
const PRODUCTION_GOODS_NAME = "3D 전신 피규어";

const createClientId = () =>
  typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

const getFileKey = (file: File) =>
  `${file.name}:${file.size}:${file.lastModified}`;

function FieldLabel({
  children,
  optional = false,
}: {
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <span className="gsf-field-label">
      {children}
      <em>{optional ? "선택" : "필수"}</em>
    </span>
  );
}

export default function GoodsSurveyForm() {
  const [, setLocation] = useLocation();
  const channel = useMemo<"online" | "flea">(
    () =>
      new URLSearchParams(window.location.search).get("channel") === "flea"
        ? "flea"
        : "online",
    []
  );
  const landingPath = landingPathFor(channel);
  const [stage, setStage] = useState<"preparing" | "production" | "complete">(
    "preparing"
  );
  const [draftSession, setDraftSession] = useState<SurveyDraftSession | null>(
    null
  );
  const [prepareAttempt, setPrepareAttempt] = useState(0);
  const [apiBusy, setApiBusy] = useState(false);
  const [apiError, setApiError] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<GoodsDeliveryMethod>(
    () => (channel === "flea" ? "pickup" : "shipping")
  );
  const pickup = deliveryMethod === "pickup";
  const [pets, setPets] = useState<PetDraft[]>(() => [
    {
      key: createClientId(),
      petName: "",
      photos: loadGoodsSurveyPhotoHandoff(),
      keyringAdded: false,
      lowPhotoAcknowledged: false,
    },
  ]);
  const keyringCount = pets.filter(pet => pet.keyringAdded).length;
  const petsNeedingLowPhotoWarning = pets.filter(
    pet => hasLowPhotoCount(pet) && !pet.lowPhotoAcknowledged
  );
  const [lowPhotoWarningOpen, setLowPhotoWarningOpen] = useState(false);
  const totalPayableKrw = payableKrw({
    channel,
    deliveryMethod,
    petCount: pets.length,
    keyringAdded: keyringCount,
  });
  const [production, setProduction] = useState<ProductionFields>({
    goods: PRODUCTION_GOODS_ID,
    guardianName: "",
    phone: "",
    postalCode: "",
    address: "",
    addressDetail: "",
  });
  const [photoPublishConsent, setPhotoPublishConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [shippingConsent, setShippingConsent] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [accountCopied, setAccountCopied] = useState(false);
  const [paymentNotice, setPaymentNotice] = useState<Awaited<
    ReturnType<typeof submitSurveyApplication>
  > | null>(null);
  const fileClientIds = useRef(new Map<string, string>());
  const idempotencyKey = useRef(createClientId());
  const applicationTracked = useRef(false);
  usePageEngagement("goods_survey_form");

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "우리 아이 피규어 주문 | Pawever";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setApiBusy(true);
    void (async () => {
      try {
        const campaign = await getSurveyCampaign(channel);
        if (cancelled) return;
        setSurveyPhaseContext({
          campaignId: campaign.campaignId,
          goodsOpen: campaign.goodsOpen,
        });
        if (!campaign.goodsOpen)
          throw new GoodsSurveyApiError(
            "지금은 주문을 받지 않아요.",
            "GOODS_CLOSED",
            409
          );
        const stored = loadGoodsSurveyDraft();
        if (stored?.channel === channel) {
          setDraftSession(stored.session);
          setStage("production");
          return;
        }
        const session = await createSurveyDraft({
          questionnaireVersion: GOODS_SURVEY_VERSION,
          selectedGoods: PRODUCTION_GOODS_ID,
          tracking: createSubmissionTrackingContext(),
          channel,
        });
        if (cancelled) return;
        await startDirectPurchase(session);
        if (cancelled) return;
        saveGoodsSurveyDraftSnapshot({ session, channel });
        setDraftSession(session);
        setStage("production");
        trackEvent("survey_start", {
          entry_method: "direct_purchase",
          goods_type: PRODUCTION_GOODS_ID,
        });
      } catch (error) {
        if (!cancelled) setApiError(apiMessage(error));
      } finally {
        if (!cancelled) setApiBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [channel, prepareAttempt]);

  const apiMessage = (error: unknown) =>
    error instanceof GoodsSurveyApiError
      ? error.message
      : "네트워크 연결을 확인한 뒤 다시 시도해 주세요.";
  const copyAccount = (account: string) => {
    void navigator.clipboard
      .writeText(account)
      .then(() => setAccountCopied(true))
      .catch(() => {
        setApiError("복사하지 못했어요. 계좌번호를 길게 눌러 복사해 주세요.");
      });
  };
  const updatePet = (index: number, next: PetDraft) =>
    setPets(previous =>
      previous.map((pet, position) => (position === index ? next : pet))
    );

  const addPet = () => {
    if (pets.length >= GOODS_PET_MAX_COUNT) {
      setApiError(`한 번에 ${GOODS_PET_MAX_COUNT}마리까지 신청할 수 있어요.`);
      return;
    }
    setApiError("");
    setPets(previous => [
      ...previous,
      {
        key: createClientId(),
        petName: "",
        photos: [],
        keyringAdded: false,
        lowPhotoAcknowledged: false,
      },
    ]);
  };

  const removePet = (index: number) => {
    setApiError("");
    setPets(previous => previous.filter((_, position) => position !== index));
  };

  const removePetPhoto = (index: number, position: number) => {
    setApiError("");
    const pet = pets[index];
    updatePet(index, {
      ...pet,
      photos: pet.photos.filter((_, at) => at !== position),
      // 사진 묶음이 바뀌면 확인을 다시 받는다. 확인한 적 없는 묶음이
      // 예전 확인값을 타고 넘어가면 안 된다.
      lowPhotoAcknowledged: false,
    });
  };

  const addPhotos = (index: number, picked: File[]) => {
    const tooBig = picked.find(file => file.size > 10 * 1024 * 1024);
    if (tooBig) {
      // 이미 고른 것은 건드리지 않는다. 실수 한 번에 처음부터 고르게 만들면
      // 고칠 기회가 아니라 벌이 된다.
      setApiError("사진은 장당 10MB 이하만 올릴 수 있어요.");
      return;
    }

    // 형식은 file.type 만 보지 않는다. 인앱 브라우저는 멀쩡한 JPG 에도 빈
    // 값을 준다. 그래도 못 받는 것이면 여기서 자른다 - 다 올리고 기다린
    // 뒤에 서버가 거절하는 쪽이 더 나쁘다.
    const unsupported = picked.find(file => photoContentType(file) === null);
    if (unsupported) {
      setApiError(
        `사진은 JPG·PNG·WEBP 형식만 올릴 수 있어요. ${PHOTO_TYPE_HELP}`
      );
      return;
    }

    const pet = pets[index];
    const merged = [...pet.photos];
    let dropped = 0;
    for (const file of picked) {
      // 같은 파일을 두 번 골라도 한 장으로 센다. 두 장으로 세면 다섯 칸이
      // 같은 사진으로 찬다.
      if (merged.some(kept => getFileKey(kept) === getFileKey(file))) continue;
      if (merged.length >= GOODS_PHOTO_MAX_COUNT) {
        dropped += 1;
        continue;
      }
      merged.push(file);
    }
    updatePet(index, {
      ...pet,
      photos: merged,
      lowPhotoAcknowledged: false,
    });
    // 조용히 버리면 사람은 올린 줄 안다.
    setApiError(
      dropped > 0
        ? `사진은 아이마다 ${GOODS_PHOTO_MAX_COUNT}장까지 올릴 수 있어요. ${dropped}장은 담지 않았어요.`
        : ""
    );
  };

  const phoneInvalid =
    production.phone.trim().length > 0 &&
    !PHONE_PATTERN.test(production.phone.trim());

  // 아이마다 이름과 사진이 갖춰져야 한다. 사진이 적어도 낼 수 있고, 적을 때는
  // 낼 때 한 번 더 묻는다.
  const petsReady = pets.length > 0 && pets.every(isPetReady);

  const productionReady =
    petsReady &&
    Boolean(
      production.goods &&
        production.guardianName.trim() &&
        PHONE_PATTERN.test(production.phone.trim()) &&
        // 현장에서 받아가면 주소를 묻지 않는다. 받는 사람이 그 자리에 온다.
        (pickup || (production.postalCode.trim() && production.address.trim()))
    ) &&
    privacyConsent &&
    shippingConsent;

  const finishReview = async () => {
    if (!draftSession || !productionReady || apiBusy) return;
    if (petsNeedingLowPhotoWarning.length > 0) {
      setLowPhotoWarningOpen(true);
      return;
    }
    await submitApplicationWith(pets);
  };

  /** 확인을 받은 뒤 이어서 낸다. 확인한 사실은 서버에도 함께 보낸다. */
  const acknowledgeLowPhotosAndSubmit = () => {
    const acknowledged = pets.map(pet =>
      hasLowPhotoCount(pet) ? { ...pet, lowPhotoAcknowledged: true } : pet
    );
    setPets(acknowledged);
    setLowPhotoWarningOpen(false);
    void submitApplicationWith(acknowledged);
  };

  const submitApplicationWith = async (submitted: PetDraft[]) => {
    if (!draftSession || !productionReady || apiBusy) return;
    setApiBusy(true);
    setApiError("");
    try {
      const uploadPhoto = (file: File) => {
        const key = getFileKey(file);
        let clientFileId = fileClientIds.current.get(key);
        if (!clientFileId) {
          clientFileId = createClientId();
          fileClientIds.current.set(key, clientFileId);
        }
        // 고르는 자리에서 이미 걸렀다. 여기까지 온 것은 형식이 있다.
        return uploadSurveyPhoto(
          draftSession,
          file,
          clientFileId,
          photoContentType(file) ?? "image/jpeg"
        );
      };
      // 아이마다 자기 사진을 들고 간다. 한 장을 두 아이가 나눠 쓰면 서버가
      // 거절한다 — 어느 아이를 보고 만든 사진인지 사라지기 때문이다.
      const petPayloads = await Promise.all(
        submitted.map(async pet => {
          const photoIds = await Promise.all(pet.photos.map(uploadPhoto));
          return {
            petName: pet.petName,
            photoIds,
            // 사진 공개는 사진 단계에서 따로 물어본 답을 쓴다. 사연 공개
            // 동의를 끌어다 쓰면, 글에 동의한 사람의 사진까지 묻지도 않고
            // 공개된다.
            publicPhotoIds: photoPublishConsent ? photoIds : [],
            keyringAdded: pet.keyringAdded,
            lowPhotoAcknowledged: pet.lowPhotoAcknowledged,
          };
        })
      );

      const tracking = createSubmissionTrackingContext();
      const application = await submitSurveyApplication(
        draftSession,
        idempotencyKey.current,
        {
          goodsType: production.goods,
          // 한 종만 팔아 직접 제안을 받지 않는다. 1차 기록에는 값이 남아 있다.
          customGoods: "",
          guardianName: production.guardianName,
          phone: production.phone,
          deliveryMethod: pickup ? "pickup" : "shipping",
          // 현장 수령이면 적어 두었던 주소도 보내지 않는다. 쓰지 않을 주소를
          // 남기면 지킬 것만 늘어난다.
          postalCode: pickup ? "" : production.postalCode,
          address: pickup ? "" : production.address,
          addressDetail: pickup ? "" : production.addressDetail,
          // 금액과 정원은 마리 수만큼 매겨진다. 화면이 보낸 금액은 쓰지
          // 않고 서버가 다시 계산한다.
          pets: petPayloads,
          // 아이마다 고른 키링은 pets 가 들고 간다. 이 값은 서버에 남아 있는
          // 낱개 항목 자리를 채우는 몫이라, 빼면 서버가 요청을 읽지 못한다.
          keyringAdded: keyringCount > 0,
          conversionEventId: tracking.conversionEventId,
          tracking,
          privacyAgreed: privacyConsent,
          shippingConfirmed: shippingConsent,
          marketingAgreed: marketingConsent,
        }
      );
      // 입금 안내는 서버가 확정한 주문 금액을 그대로 쓴다.
      setPaymentNotice(application);
      // 노션 10번: 제출 버튼을 누른 시점이 아니라 서버 저장이 끝난 지금이 완료다.
      // 여기까지 온 사람은 이탈이 아니므로 pagehide 이탈 기록도 막는다.
      if (!applicationTracked.current) {
        applicationTracked.current = true;
        trackEvent(
          "application_complete",
          {
            goods_type: PRODUCTION_GOODS_ID,
            photo_count: submitted.reduce(
              (total, pet) => total + pet.photos.length,
              0
            ),
          },
          { eventId: tracking.conversionEventId }
        );
      }
      clearGoodsSurveyDraftSnapshot();
      // 사진은 서버에 올라갔다. 랜딩에서 들고 온 원본을 계속 쥐고 있으면
      // 다음에 다시 들어온 사람에게 지난번 사진이 붙은 채로 열린다.
      clearGoodsSurveyPhotoHandoff();
      setStage("complete");
    } catch (error) {
      setApiError(apiMessage(error));
    } finally {
      setApiBusy(false);
    }
  };

  return (
    <main className="goods-survey-form-page">
      <div className="gsf-shell">
        <header className="gsf-header">
          <button
            type="button"
            className="gsf-icon-button"
            onClick={() => setLocation(landingPath)}
            aria-label="이전"
          >
            <ArrowLeft aria-hidden="true" />
          </button>
          <a
            href="/"
            className="gsf-brand"
            onClick={event => {
              event.preventDefault();
              setLocation("/");
            }}
          >
            <PawPrint aria-hidden="true" />
            <span>Pawever</span>
          </a>
        </header>
        {apiError && (
          <div className="gsf-api-error" role="alert">
            <span>{apiError}</span>
            <button
              type="button"
              onClick={() => setApiError("")}
              aria-label="오류 안내 닫기"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}
        <div className="gsf-content">
          {stage === "preparing" && (
            <section className="gsf-message gsf-preparing">
              <span className="gsf-message-icon" aria-hidden="true">
                <PawPrint />
              </span>
              {apiError ? (
                <>
                  <h1>신청서를 열지 못했어요.</h1>
                  <p>{apiError}</p>
                  <button
                    type="button"
                    className="gsf-primary"
                    disabled={apiBusy}
                    onClick={() => {
                      setApiError("");
                      setPrepareAttempt(current => current + 1);
                    }}
                  >
                    {apiBusy ? "여는 중..." : "다시 시도"}
                  </button>
                </>
              ) : (
                <>
                  <h1>신청서를 준비하고 있어요.</h1>
                  <p>
                    잠시만 기다려 주세요. 곧 사진과 정보를 받는 화면이 열려요.
                  </p>
                </>
              )}
            </section>
          )}

          {stage === "production" && (
            <form
              className="gsf-long-form"
              onSubmit={event => {
                event.preventDefault();
                if (productionReady) void finishReview();
              }}
            >
              <span className="gsf-eyebrow">마지막 단계</span>
              <h1>{goodsSurveyProductionContent.title}</h1>
              <p className="gsf-form-lead">
                {goodsSurveyProductionContent.lead}
              </p>

              <section className="gsf-form-section">
                <h2>1. 제작할 굿즈</h2>
                <div className="gsf-goods-fixed">
                  <Check aria-hidden="true" />
                  <strong>{PRODUCTION_GOODS_NAME}</strong>
                </div>
              </section>

              <section className="gsf-form-section">
                <h2>2. 우리 아이</h2>
                <p className="gsf-field-help">
                  아이마다 이름과 사진을 따로 받아요. 여러 마리를 신청하면 마리
                  수만큼 제작비가 붙고, 배송은 한 번에 보내드려요.
                </p>
                {pets.map((pet, index) => (
                  <PetEditor
                    key={pet.key}
                    pet={pet}
                    index={index}
                    total={pets.length}
                    showKeyring={channel === "flea"}
                    onChange={next => updatePet(index, next)}
                    onRemove={pets.length > 1 ? () => removePet(index) : null}
                    onPickPhotos={files => addPhotos(index, files)}
                    onRemovePhoto={position => removePetPhoto(index, position)}
                    fileKeyOf={getFileKey}
                  />
                ))}
                {pets.length < GOODS_PET_MAX_COUNT && (
                  <button
                    type="button"
                    className="gsf-pet-add"
                    onClick={addPet}
                  >
                    + 아이 추가 (최대 {GOODS_PET_MAX_COUNT}마리)
                  </button>
                )}
                {lowPhotoWarningOpen && (
                  <LowPhotoWarningDialog
                    petNames={petsNeedingLowPhotoWarning.map(
                      pet => pet.petName
                    )}
                    onAddMore={() => setLowPhotoWarningOpen(false)}
                    onProceed={acknowledgeLowPhotosAndSubmit}
                  />
                )}
                <div className="gsf-consent-card">
                  <label>
                    <input
                      type="checkbox"
                      checked={photoPublishConsent}
                      onChange={event =>
                        setPhotoPublishConsent(event.target.checked)
                      }
                    />
                    <span>
                      {goodsSurveyProductionContent.photoPublishConsent}{" "}
                      <em>선택</em>
                    </span>
                  </label>
                  <p>{goodsSurveyProductionContent.photoPublishConsentNote}</p>
                </div>
              </section>

              <section className="gsf-form-section">
                <h2>3. 제작·배송 정보</h2>
                {
                  <fieldset className="gsf-delivery">
                    <legend>수령 방법</legend>
                    <label>
                      <input
                        type="radio"
                        name="deliveryMethod"
                        checked={deliveryMethod === "pickup"}
                        onChange={() => setDeliveryMethod("pickup")}
                      />
                      <span>
                        <strong>서울과학기술대학교 상상관에서 받아가기</strong>
                        <small>배송비 없음</small>
                      </span>
                    </label>
                    <label>
                      <input
                        type="radio"
                        name="deliveryMethod"
                        checked={deliveryMethod === "shipping"}
                        onChange={() => setDeliveryMethod("shipping")}
                      />
                      <span>
                        <strong>택배로 받기</strong>
                        <small>
                          배송비 {wonText(GOODS_PRICE.shipping)} 별도
                        </small>
                      </span>
                    </label>
                  </fieldset>
                }

                {(
                  [
                    ["guardianName", "보호자 이름", "받는 분 이름"],
                    ["phone", "연락처", "010-0000-0000"],
                    // 받는 사람이 그 자리에 오면 주소를 묻지 않는다.
                    ...(pickup
                      ? []
                      : [
                          ["postalCode", "우편번호", "우편번호"],
                          ["address", "배송지", "도로명 주소"],
                          [
                            "addressDetail",
                            "상세 주소",
                            "동·호수 등 상세 주소",
                          ],
                        ]),
                  ] as string[][]
                ).map(([field, label, placeholder]) => (
                  <label key={field}>
                    <FieldLabel optional={field === "addressDetail"}>
                      {label}
                    </FieldLabel>
                    <input
                      value={production[field as keyof ProductionFields]}
                      onChange={event =>
                        setProduction(previous => ({
                          ...previous,
                          // 하이픈은 화면이 넣는다. 사람은 숫자만 치면 된다.
                          [field]:
                            field === "phone"
                              ? formatPhoneNumber(event.target.value)
                              : event.target.value,
                        }))
                      }
                      placeholder={placeholder}
                      inputMode={field === "phone" ? "tel" : "text"}
                      aria-invalid={field === "phone" && phoneInvalid}
                    />
                    {field === "phone" && phoneInvalid && (
                      <span className="gsf-field-error" role="alert">
                        {goodsSurveyProductionContent.phoneFormatError}
                      </span>
                    )}
                  </label>
                ))}
              </section>

              <section className="gsf-form-section gsf-safety-summary">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <h2>제품 안전 안내</h2>
                  <p>{goodsSurveyProductionContent.safety}</p>
                </div>
              </section>

              <div className="gsf-consent-card">
                <strong>신청 전 확인</strong>
                <label>
                  <input
                    type="checkbox"
                    checked={privacyConsent}
                    onChange={event => setPrivacyConsent(event.target.checked)}
                  />
                  <span>
                    개인정보 수집·이용에 동의합니다. <em>필수</em>
                  </span>
                </label>
                <button
                  type="button"
                  className="gsf-inline-link"
                  onClick={() => setPrivacyOpen(true)}
                >
                  수집·이용 내용 자세히 보기
                </button>
                <label>
                  <input
                    type="checkbox"
                    checked={shippingConsent}
                    onChange={event => setShippingConsent(event.target.checked)}
                  />
                  <span>
                    제작비 {wonText(applicablePriceKrw(channel))}
                    {pets.length > 1 ? <> × {pets.length}마리</> : null}
                    {keyringCount > 0 ? (
                      <>
                        {" "}
                        + 키링 {wonText(GOODS_PRICE.keyring)}
                        {keyringCount > 1 ? ` × ${keyringCount}` : ""}
                      </>
                    ) : null}
                    {pickup ? (
                      <> · 방문수령(배송비 없음)</>
                    ) : (
                      <> + 배송비 {wonText(GOODS_PRICE.shipping)}</>
                    )}{" "}
                    = <strong>{wonText(totalPayableKrw)}</strong>을 결제하는 데
                    동의합니다. <em>필수</em>
                  </span>
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={marketingConsent}
                    onChange={event =>
                      setMarketingConsent(event.target.checked)
                    }
                  />
                  <span>
                    할인·신제품 소식을 문자와 카카오톡으로 받는 데 동의합니다.{" "}
                    <em>선택</em>
                  </span>
                </label>
                <p>
                  동의하지 않아도 신청할 수 있습니다. 주문·배송 안내는 동의와
                  상관없이 보내드립니다. 언제든 수신을 거부할 수 있습니다.
                </p>
              </div>

              <button
                type="submit"
                className="gsf-primary"
                disabled={!productionReady || apiBusy}
              >
                {apiBusy
                  ? "신청을 안전하게 저장하고 있어요..."
                  : "신청 완료하기"}
                <ArrowRight aria-hidden="true" />
              </button>
              {apiError && !apiBusy && (
                <p className="gsf-field-error" role="alert">
                  {apiError}
                </p>
              )}
            </form>
          )}

          {stage === "complete" && (
            <section className="gsf-message gsf-complete">
              <span className="gsf-message-icon">
                <Check aria-hidden="true" />
              </span>
              <span className="gsf-eyebrow">신청 완료</span>
              <h1>
                굿즈 신청이
                <br />
                정상적으로 접수됐어요.
              </h1>
              <p>제작·배송 정보를 안전하게 저장했습니다.</p>
              {paymentNotice && (
                <div className="gsf-payment-notice">
                  <strong>
                    {paymentNotice.bank
                      ? "아래 계좌로 입금해 주세요"
                      : "입금 안내를 문자로 보내드릴게요"}
                  </strong>
                  <p>
                    {paymentNotice.bank
                      ? "같은 안내를 입력하신 연락처로 문자로도 보내드립니다. 입금이 확인되면 제작이 시작돼요."
                      : "입력하신 연락처로 입금 계좌를 문자로 보내드립니다. 입금이 확인되면 제작이 시작돼요."}
                  </p>
                  {paymentNotice.bank !== null && (
                    <div className="gsf-bank">
                      <span>입금 계좌</span>
                      <strong>
                        {paymentNotice.bank.name} {paymentNotice.bank.account}
                      </strong>
                      <small>예금주 {paymentNotice.bank.holder}</small>
                      <button
                        type="button"
                        onClick={() => copyAccount(paymentNotice.bank!.account)}
                      >
                        {accountCopied ? (
                          <>
                            <Check aria-hidden="true" />
                            복사됨
                          </>
                        ) : (
                          <>
                            <Copy aria-hidden="true" />
                            계좌번호 복사
                          </>
                        )}
                      </button>
                      <em>
                        신청하신 이름으로 입금해 주세요. 다른 이름이면 확인이
                        늦어질 수 있어요.
                      </em>
                    </div>
                  )}
                  <dl>
                    <div>
                      <dt>주문번호</dt>
                      <dd>{paymentNotice.orderNumber}</dd>
                    </div>
                    <div>
                      <dt>제작비</dt>
                      <dd>
                        {wonText(
                          paymentNotice.listPriceKrw -
                            paymentNotice.discountAmountKrw
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>배송비</dt>
                      <dd>{wonText(paymentNotice.shippingFeeKrw)}</dd>
                    </div>
                    <div>
                      <dt>결제 금액</dt>
                      <dd>
                        <strong>
                          {wonText(paymentNotice.paymentAmountKrw)}
                        </strong>
                      </dd>
                    </div>
                    {paymentNotice.paymentExpiresAt && (
                      <div>
                        <dt>입금 기한</dt>
                        <dd>{deadlineText(paymentNotice.paymentExpiresAt)}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
              <button
                type="button"
                className="gsf-primary"
                onClick={() => setLocation(landingPath)}
              >
                랜딩페이지로 돌아가기
              </button>
            </section>
          )}
        </div>
      </div>
      {privacyOpen && (
        <div
          className="gsf-modal-backdrop"
          role="presentation"
          onMouseDown={event => {
            if (event.currentTarget === event.target) setPrivacyOpen(false);
          }}
        >
          <section
            className="gsf-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-modal-title"
          >
            <button
              type="button"
              className="gsf-modal-close"
              onClick={() => setPrivacyOpen(false)}
              aria-label="닫기"
            >
              <X aria-hidden="true" />
            </button>
            <span className="gsf-message-icon">
              <LockKeyhole aria-hidden="true" />
            </span>
            <h2 id="privacy-modal-title">개인정보 수집·이용 안내</h2>
            <dl>
              {goodsSurveyPrivacyContent.map(([term, description]) => (
                <div key={term}>
                  <dt>{term}</dt>
                  <dd>{description}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              className="gsf-primary"
              onClick={() => setPrivacyOpen(false)}
            >
              확인했습니다
            </button>
          </section>
        </div>
      )}
    </main>
  );
}
