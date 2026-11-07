import {
  SELLER_FIELDS,
  TRANSACTION_TERMS,
  sellerNoticeReady,
  type NoticeField,
} from "@/lib/sellerNotice";
import "./SellerNotice.css";

/**
 * 판매자 정보와 거래조건 표시.
 *
 * 값이 다 차기 전에는 아무것도 그리지 않는다. 그래서 지금 이 자리는 화면에
 * 없는 것과 같고, 나혜님 디자인도 그대로다. 값이 들어오는 날 저절로 나타난다.
 * 어디에 붙일지는 그때 디자인을 받아 정하면 된다.
 *
 * 왜 필요한지와 어떤 칸이 비어 있는지는 {@link ../lib/sellerNotice} 에 적어 두었다.
 */
export default function SellerNotice() {
  if (!sellerNoticeReady()) return null;

  return (
    <section className="seller-notice" aria-label="판매자 정보 및 거래조건">
      <Block title="판매자 정보" fields={SELLER_FIELDS} />
      <Block title="거래조건" fields={TRANSACTION_TERMS} />
    </section>
  );
}

function Block({
  title,
  fields,
}: {
  title: string;
  fields: readonly NoticeField[];
}) {
  return (
    <div className="seller-notice-block">
      <h2>{title}</h2>
      {/*
       * dl 로 적는다. 항목 이름과 값의 짝이라 화면을 못 보는 사람에게도 어느
       * 값이 사업자등록번호인지 그대로 전해진다.
       */}
      <dl>
        {fields.map(({ label, value }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
