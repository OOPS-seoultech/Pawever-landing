import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * 09 FINAL 의 사진 등록 카드(Figma Article 5425:1411).
 *
 * 칸마다 무엇을 찍어야 하는지가 정해져 있다. 아무 사진 세 장이 아니라
 * 얼굴·전신·털무늬 세 종이고, 그게 제작에 필요한 최소 구성이다.
 */
export const INTAKE_SLOTS = [
  { key: "face", label: "정면 또는 옆모습" },
  { key: "body", label: "몸 전체가 보이게" },
  { key: "coat", label: "특징이 잘 보이게" },
] as const;

// 주문 화면(GoodsSurveyForm)이 받는 조건과 같아야 한다. 여기서 통과한
// 사진이 그쪽에서 거부되면 사람은 같은 파일을 두 번 거절당한다.
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export function PhotoIntakeCard({
  onSubmit,
  ctaId,
  heading,
}: {
  onSubmit: (files: File[]) => void;
  /** 어느 랜딩의 어느 자리에서 눌린 버튼인지. 분석 도구가 DOM 만 본다. */
  ctaId?: string;
  /**
   * 카드 제목의 두 번째 줄.
   *
   * 두 랜딩의 디자인이 여기서 갈린다 — 상시는 "추가해주세요.", 플리마켓은
   * "등록해주세요."다. 한쪽으로 통일하면 다른 쪽이 자기 디자인과 어긋난다.
   */
  heading: string;
}) {
  const [picked, setPicked] = useState<(File | null)[]>(() =>
    INTAKE_SLOTS.map(() => null)
  );
  const [previews, setPreviews] = useState<(string | null)[]>(() =>
    INTAKE_SLOTS.map(() => null)
  );
  const [error, setError] = useState("");

  const chosen = picked.filter(Boolean).length;
  const ready = chosen === INTAKE_SLOTS.length;

  useEffect(() => {
    const urls = picked.map(file => (file ? URL.createObjectURL(file) : null));
    setPreviews(urls);
    return () => {
      urls.forEach(url => url && URL.revokeObjectURL(url));
    };
  }, [picked]);

  const choose = (index: number, file: File | undefined) => {
    if (!file) return;
    if (!PHOTO_TYPES.includes(file.type) || file.size > PHOTO_MAX_BYTES) {
      setError("사진은 JPG·PNG·WEBP 형식, 장당 10MB 이하만 올릴 수 있어요.");
      return;
    }
    setError("");
    setPicked(previous =>
      previous.map((current, position) => (position === index ? file : current))
    );
  };

  return (
    <div className="gs-intake">
      <div className="gs-intake-head">
        <div>
          <span>사진 등록</span>
          <strong>
            우리 아이 사진을
            <br />
            {heading}
          </strong>
        </div>
        <em className="gs-intake-count">
          {chosen}/{INTAKE_SLOTS.length}
        </em>
      </div>

      <p className="gs-intake-lead">
        사진을 누르면 앨범에서 바로 추가할 수 있어요.
      </p>

      <div className="gs-intake-slots">
        {INTAKE_SLOTS.map(({ key, label }, index) => (
          <label
            className={`gs-intake-slot${previews[index] ? " is-filled" : ""}`}
            key={key}
          >
            {previews[index] ? (
              <img src={previews[index] ?? ""} alt={`${label} 사진 미리보기`} />
            ) : (
              <>
                <i aria-hidden="true">+</i>
                <span>{label}</span>
              </>
            )}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={event => {
                choose(index, event.target.files?.[0]);
                // 같은 파일을 다시 고를 수 있어야 한다.
                event.target.value = "";
              }}
              aria-label={`${label} 사진 추가하기`}
            />
          </label>
        ))}
      </div>

      {error && (
        <p className="gs-intake-error" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="gs-intake-submit"
        data-cta-id={ctaId}
        disabled={!ready}
        onClick={() =>
          onSubmit(picked.filter((file): file is File => file !== null))
        }
      >
        사진 {INTAKE_SLOTS.length}장 등록하기
      </button>

      <small>사진은 주문 단계에서 최종 제출됩니다.</small>
    </div>
  );
}

export function PrimaryCta({
  onClick,
  ctaId,
  label,
  compact = false,
  disabled = false,
  disabledLabel = "지금은 신청할 수 없어요",
  showArrow = true,
}: {
  onClick: () => void;
  ctaId?: string;
  label: string;
  compact?: boolean;
  disabled?: boolean;
  disabledLabel?: string;
  /** 플리마켓 랜딩의 버튼에는 화살표가 없다(피그마 5478:2013). */
  showArrow?: boolean;
}) {
  return (
    <button
      type="button"
      data-cta-id={ctaId}
      className={`gs-primary-cta${compact ? " gs-primary-cta--compact" : ""}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span>{disabled ? disabledLabel : label}</span>
      {showArrow && <ArrowRight aria-hidden="true" />}
    </button>
  );
}
