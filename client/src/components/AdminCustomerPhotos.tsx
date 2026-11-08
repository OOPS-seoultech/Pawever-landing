import { useCallback } from "react";
import { useStaffSession } from "./AdminSession";
import { adminDownloadName } from "@/lib/adminDownloads";
import { requestPhotoLinks } from "@/lib/adminApi";
import { AdminImageGallery } from "./AdminImageGallery";
export function AdminCustomerPhotos({
  orderNumber,
  petIndex,
  gridClassName,
  petName,
  guardianName,
}: {
  orderNumber: string;
  petIndex: number;
  gridClassName?: string;
  petName: string;
  guardianName?: string | null;
}) {
  const { staff } = useStaffSession();
  const load = useCallback(async () => {
    const result = await requestPhotoLinks(orderNumber, petIndex);
    return (result.photos ?? []).map(photo => ({
      id: String(photo.photoId ?? photo.slot),
      url: photo.url,
      label: `고객 사진 ${photo.slot}`,
      expiresAt: photo.expiresAt,
      fileName: adminDownloadName(
        { petName, guardianName },
        new URL(photo.url, location.origin).pathname.match(
          /\.[a-z0-9]+$/i
        )?.[0] ?? ".jpg"
      ),
    }));
  }, [orderNumber, petIndex, petName, guardianName]);
  return (
    <AdminImageGallery
      key={`${orderNumber}:${petIndex}`}
      loadImages={load}
      canSave={staff?.permissions.includes("DOWNLOAD_CUSTOMER_PHOTOS")}
      emptyText="확인할 신청 사진이 없습니다."
      gridClassName={gridClassName}
    />
  );
}
