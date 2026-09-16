import { Check, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  GOODS_PHOTO_MAX_COUNT,
  GOODS_PHOTO_MIN_COUNT,
  GOODS_PHOTO_WARNING_MAX_COUNT,
} from "@/lib/goodsSurveyApi";
import { GOODS_PRICE, wonText } from "./goodsSurveyContent";

/**
 * 신청서에 담은 아이 한 마리.
 *
 * 이름·사진·키링을 아이마다 따로 받는다. 한 주문에 두 마리를 신청받고 한 마리
 * 값만 받은 일이 있었다. 아이를 묶어 두어야 마리 수대로 값을 매길 수 있다.
 */
export type PetDraft = {
  /** 목록에서 줄을 가려내는 값. 이름은 겹칠 수 있어 쓸 수 없다. */
  key: string;
  petName: string;
  photos: File[];
  keyringAdded: boolean;
  /**
   * 사진이 적다고 알린 뒤 확인을 받았는지.
   *
   * 사진을 바꾸면 다시 거짓이 된다. 한 번 확인한 값으로 다른 사진 묶음까지
   * 지나가면, 확인을 받은 적 없는 묶음이 접수된다.
   */
  lowPhotoAcknowledged: boolean;
};

/** 사진이 적어 결과가 달라질 수 있는 상태인지. */
export const hasLowPhotoCount = (pet: PetDraft) =>
  pet.photos.length > 0 && pet.photos.length <= GOODS_PHOTO_WARNING_MAX_COUNT;

/** 이 아이만 놓고 볼 때 낼 수 있는지. 확인 여부는 제출할 때 따로 본다. */
export const isPetReady = (pet: PetDraft) =>
  Boolean(pet.petName.trim()) &&
  pet.photos.length >= GOODS_PHOTO_MIN_COUNT &&
  pet.photos.length <= GOODS_PHOTO_MAX_COUNT;

/**
 * 어떤 사진이 좋은지 알려 주는 자리.
 *
 * 예전에는 이 세 가지가 각각 필수 칸이었다. 세 장을 갖추지 못해 아예 신청하지
 * 못하는 쪽보다 적더라도 받는 쪽이 낫다고 보아 필수를 풀었고, 무엇을 찍어야
 * 하는지 알려 주는 효과는 안내로 남긴다.
 */
const PHOTO_HINTS = ["정면 또는 옆모습", "몸 전체", "얼룩·무늬"];

export function PetEditor({
  pet,
  index,
  total,
  showKeyring,
  onChange,
  onRemove,
  onPickPhotos,
  onRemovePhoto,
  fileKeyOf,
}: {
  pet: PetDraft;
  index: number;
  total: number;
  /** 키링은 현장 판매에서만 고를 수 있다. */
  showKeyring: boolean;
  onChange: (next: PetDraft) => void;
  /** 한 마리뿐이면 지울 수 없다. */
  onRemove: (() => void) | null;
  onPickPhotos: (files: File[]) => void;
  onRemovePhoto: (position: number) => void;
  /** 같은 파일을 가려내는 값. 폼이 쓰는 것과 같은 규칙이어야 한다. */
  fileKeyOf: (file: File) => string;
}) {
  const [previews, setPreviews] = useState<string[]>([]);

  // 첨부한 사진을 그대로 보여준다. 미리보기 URL은 사진이 바뀌면 바로 회수한다.
  useEffect(() => {
    const urls = pet.photos.map(file => URL.createObjectURL(file));
    setPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [pet.photos]);

  return (
    <div className="gsf-pet" data-pet-index={index}>
      <div className="gsf-pet-head">
        {/* 한 마리뿐이면 번호를 붙이지 않는다. 대부분은 한 마리다. */}
        <strong>{total > 1 ? `${index + 1}번째 아이` : "우리 아이"}</strong>
        {onRemove && (
          <button
            type="button"
            className="gsf-pet-remove"
            onClick={onRemove}
            aria-label={`${index + 1}번째 아이 삭제`}
          >
            <X aria-hidden="true" />
            <span>삭제</span>
          </button>
        )}
      </div>

      <label>
        <span className="gsf-field-label">아이 이름</span>
        <input
          value={pet.petName}
          onChange={event => onChange({ ...pet, petName: event.target.value })}
          placeholder="반려견 이름"
          maxLength={50}
        />
      </label>

      <label className="gsf-upload">
        <Upload aria-hidden="true" />
        <strong>사진 선택하기</strong>
        <span>
          JPG·PNG·WEBP, 장당 10MB 이하 · 최대 {GOODS_PHOTO_MAX_COUNT}장 · 나눠서
          골라도 됩니다
        </span>
        {/* accept 를 image/* 로 넓히지 말 것. 좁게 적어 두면 iOS 사진
            보관함이 HEIC 를 JPEG 로 바꿔서 넘겨준다. 넓히면 원본 HEIC 가
            그대로 와서 오히려 더 많이 막힌다. */}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={event => {
            onPickPhotos(Array.from(event.target.files ?? []));
            // 같은 파일을 다시 고를 수 있어야 한다. 지우고 다시 넣는 사람이 있다.
            event.target.value = "";
          }}
        />
      </label>

      {pet.photos.length > 0 && (
        <ul className="gsf-photo-preview">
          {pet.photos.map((file, position) => (
            <li key={fileKeyOf(file)}>
              <div className="gsf-photo-thumb">
                {previews[position] && <img src={previews[position]} alt="" />}
                <button
                  type="button"
                  className="gsf-photo-remove"
                  onClick={() => onRemovePhoto(position)}
                  aria-label={`${file.name} 첨부 취소`}
                >
                  <X aria-hidden="true" />
                </button>
              </div>
              <span className="gsf-file-name">
                <Check aria-hidden="true" />
                {file.name}
              </span>
            </li>
          ))}
        </ul>
      )}

      {hasLowPhotoCount(pet) && (
        <p className="gsf-photo-low" role="status">
          사진이 {pet.photos.length}장이에요. 사진이 많을수록 실제 모습에 가깝게
          만들 수 있어요.
        </p>
      )}

      <p className="gsf-field-help">
        {PHOTO_HINTS.join(" · ")}이 잘 보이는 사진이 있으면 좋아요. 밝은 곳에서
        찍은 사진일수록 좋습니다.
      </p>

      {showKeyring && (
        <fieldset className="gsf-keyring">
          <legend>키링</legend>
          <label>
            <input
              type="checkbox"
              checked={pet.keyringAdded}
              onChange={event =>
                onChange({ ...pet, keyringAdded: event.target.checked })
              }
            />
            <span>
              <strong>키링으로 만들기</strong>
              <small>
                고리를 달아 드려요 · {wonText(GOODS_PRICE.keyring)} 추가
              </small>
            </span>
          </label>
        </fieldset>
      )}
    </div>
  );
}

/**
 * 사진이 적을 때 한 번 더 묻는 자리.
 *
 * 문구는 정해진 대로 쓴다. 적게 낸 사람에게 결과가 달라질 수 있다고 알리되,
 * 그래도 최선을 다한다는 말을 함께 둔다 — 알림만 있으면 안 될 것처럼 읽힌다.
 */
export function LowPhotoWarningDialog({
  petNames,
  onAddMore,
  onProceed,
}: {
  petNames: string[];
  onAddMore: () => void;
  onProceed: () => void;
}) {
  return (
    <div className="gsf-modal-backdrop" role="presentation">
      <div
        className="gsf-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="gsf-low-photo-title"
      >
        <strong id="gsf-low-photo-title">
          사진이 부족해 실제 얼룩, 꼬리 등이 달라질 수 있습니다. 그래도
          진행할까요?
        </strong>
        <small>그래도 형태 살릴 수 있도록 최선을 다해 제작하겠습니다.</small>
        {petNames.length > 0 && (
          <p className="gsf-modal-detail">
            사진이 적은 아이: {petNames.join(", ")}
          </p>
        )}
        <div className="gsf-modal-actions">
          {/* 올린 사진은 그대로 두고 모달만 닫는다. 여기서 지우면 더
              올리려던 사람이 처음부터 다시 골라야 한다. */}
          <button type="button" onClick={onAddMore}>
            사진 더 추가
          </button>
          <button type="button" className="is-primary" onClick={onProceed}>
            그래도 진행
          </button>
        </div>
      </div>
    </div>
  );
}
