"use client";

import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";

interface RichTextViewerProps {
  content: string;
  className?: string;
}

export function RichTextViewer({
  content,
  className,
}: RichTextViewerProps): React.JSX.Element {
  const clean = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      "p", "br", "strong", "em", "u", "s",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li",
      "blockquote", "hr", "code", "pre",
      "a", "mark", "span",
      "img",
    ],
    ALLOWED_ATTR: [
      "href", "target", "rel", "style", "class",
      "src", "alt", "title", "width", "height", "loading",
    ],
  });

  return (
    <div
      className={cn("prose prose-sm max-w-none", className)}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  );
}
