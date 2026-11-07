import { Streamdown } from "streamdown";
import { externalNoticeUrl } from "@/lib/adminNotices";
// Raw HTML and embedded widgets are not part of staff notices.
export default function NoticeMarkdown({ body }: { body: string }) {
  return (
    <Streamdown
      parseIncompleteMarkdown={false}
      controls={false}
      isAnimating={false}
      skipHtml
      rehypePlugins={[]}
      remarkPlugins={[]}
      allowedElements={[
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "p",
        "br",
        "strong",
        "em",
        "blockquote",
        "ul",
        "ol",
        "li",
        "a",
        "img",
        "hr",
        "pre",
        "code",
      ]}
      unwrapDisallowed
      urlTransform={url => externalNoticeUrl(url) ?? ""}
      components={{
        a: ({ href, children }) => {
          const safe = externalNoticeUrl(href);
          return safe ? (
            <a
              href={safe}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary underline"
            >
              {children}
            </a>
          ) : (
            <span>{children}</span>
          );
        },
        img: ({ src, alt }) => {
          const safe = externalNoticeUrl(
            typeof src === "string" ? src : undefined
          );
          return safe ? (
            <img
              src={safe}
              alt={alt ?? "공지 이미지"}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="my-3 h-auto max-h-[600px] max-w-full rounded object-contain"
            />
          ) : (
            <span className="text-muted-foreground">
              [유효한 HTTPS 이미지 주소가 필요합니다]
            </span>
          );
        },
        pre: ({ children }) => (
          <pre className="overflow-x-auto rounded border bg-muted p-3 text-sm">
            {children}
          </pre>
        ),
        code: ({ children }) => <code>{children}</code>,
      }}
      className="prose prose-sm max-w-none break-words"
    >
      {body}
    </Streamdown>
  );
}
